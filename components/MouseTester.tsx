import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MouseStats } from '../types';

// === TYPES ===
type GameType = 'PRECISION' | 'REFLEX' | 'TRACKING';
type Difficulty = 'EASY' | 'NORMAL' | 'HARD';
type GameState = 'MENU' | 'PLAYING' | 'FINISHED';

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  spawnTime: number;
  lifeTime?: number; // For Reflex game
  vx: number; // For Tracking game (Velocity X)
  vy: number; // For Tracking game (Velocity Y)
  nextChangeTime?: number; // For Tracking evasion logic
}

export const MouseTester: React.FC = () => {
  // === BASIC MOUSE STATS ===
  const [stats, setStats] = useState<MouseStats>({
    leftClick: false, rightClick: false, middleClick: false,
    backClick: false, forwardClick: false,
    scrollUp: false, scrollDown: false, doubleClick: false,
    x: 0, y: 0
  });

  // === POLLING RATE STATE ===
  const [hzHistory, setHzHistory] = useState<number[]>(new Array(50).fill(0));
  const [currentHz, setCurrentHz] = useState(0);
  const [maxHz, setMaxHz] = useState(0);
  const [avgHz, setAvgHz] = useState(0);
  const lastMouseMoveTime = useRef<number>(0);
  const hzBuffer = useRef<number[]>([]);
  const hzCanvasRef = useRef<HTMLCanvasElement>(null);
  const isMeasuringHz = useRef(false);

  // === DPI TEST STATE ===
  const [dpiMode, setDpiMode] = useState<'IDLE' | 'MEASURING'>('IDLE');
  const [targetDist, setTargetDist] = useState<number>(3); 
  const [unit, setUnit] = useState<'CM' | 'INCH'>('CM');
  const [dpiResult, setDpiResult] = useState<number | null>(null);
  const [accumulatedPixels, setAccumulatedPixels] = useState(0);

  // === GAME STATE ===
  const [gameType, setGameType] = useState<GameType>('PRECISION');
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [gameState, setGameState] = useState<GameState>('MENU');
  
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [accuracy, setAccuracy] = useState(100); // For Tracking
  
  // Refs for Game Loop & State Sync
  const targetsRef = useRef<Target[]>([]); 
  const requestRef = useRef<number>();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef(0);
  
  // Tracking specifics
  const isTrackingRef = useRef(false); // Is user currently locked on?
  const trackingTotalFrames = useRef(0);
  const trackingHitFrames = useRef(0);

  // === POLLING RATE LOGIC ===
  const updatePollingGraph = useCallback(() => {
     const canvas = hzCanvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     if (!ctx) return;

     const w = canvas.width;
     const h = canvas.height;
     const maxGraphHz = 1200; // Scale graph for 1000Hz+ mice

     ctx.clearRect(0, 0, w, h);
     
     // Draw Grid
     ctx.strokeStyle = '#374151'; // gray-700
     ctx.lineWidth = 1;
     ctx.beginPath();
     [125, 500, 1000].forEach(val => {
         const y = h - (val / maxGraphHz) * h;
         ctx.moveTo(0, y);
         ctx.lineTo(w, y);
         ctx.fillStyle = '#6B7280';
         ctx.fillText(`${val}Hz`, 2, y - 2);
     });
     ctx.stroke();

     // Draw Line
     ctx.beginPath();
     ctx.strokeStyle = '#4ade80'; // green-400
     ctx.lineWidth = 2;
     
     hzHistory.forEach((val, i) => {
         const x = (i / (hzHistory.length - 1)) * w;
         const y = h - (val / maxGraphHz) * h;
         if (i === 0) ctx.moveTo(x, y);
         else ctx.lineTo(x, y);
     });
     ctx.stroke();

     // Fill area
     ctx.lineTo(w, h);
     ctx.lineTo(0, h);
     ctx.fillStyle = 'rgba(74, 222, 128, 0.1)';
     ctx.fill();

  }, [hzHistory]);

  useEffect(() => {
      updatePollingGraph();
  }, [hzHistory, updatePollingGraph]);

  // === GAME HELPER: SPAWN ===
  const spawnTarget = useCallback(() => {
      if (!gameAreaRef.current) return;
      const { clientWidth: w, clientHeight: h } = gameAreaRef.current;
      
      let size = 50;
      let baseSpeed = 6;
      if (difficulty === 'EASY') { size = 80; baseSpeed = 4; }
      if (difficulty === 'HARD') { size = 40; baseSpeed = 10; }

      // Ensure non-zero velocity for Tracking
      let vx = (Math.random() - 0.5) * baseSpeed;
      let vy = (Math.random() - 0.5) * baseSpeed;
      if (Math.abs(vx) < 1) vx = baseSpeed / 2;
      if (Math.abs(vy) < 1) vy = baseSpeed / 2;

      const newTarget: Target = {
          id: Date.now() + Math.random(),
          x: Math.random() * (w - size),
          y: Math.random() * (h - size),
          size: size,
          spawnTime: Date.now(),
          lifeTime: difficulty === 'HARD' ? 800 : difficulty === 'NORMAL' ? 1200 : 2000, 
          vx,
          vy,
          nextChangeTime: Date.now() + 500 + Math.random() * 1000
      };

      if (gameType === 'TRACKING') {
          // Replace all targets for tracking
          targetsRef.current = [newTarget];
          setTargets([newTarget]);
      } else {
          // Add to existing for others
          targetsRef.current = [...targetsRef.current, newTarget];
          setTargets(prev => [...prev, newTarget]);
      }
  }, [difficulty, gameType]);

  // === GAME LOOP ENGINE ===
  useEffect(() => {
      if (gameState !== 'PLAYING') {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          return;
      }

      let lastTime = performance.now();
      let timerAccumulator = 0;

      const loop = (time: number) => {
          const dt = time - lastTime;
          lastTime = time;

          // 1. Timer Logic
          timerAccumulator += dt;
          if (timerAccumulator >= 1000) {
              timerAccumulator -= 1000;
              setTimeLeft(prev => {
                  if (prev <= 1) {
                      setGameState('FINISHED');
                      return 0;
                  }
                  return prev - 1;
              });
          }

          // 2. Game Logic
          if (gameType === 'TRACKING') {
              const now = Date.now();
              const w = gameAreaRef.current?.clientWidth || 800;
              const h = gameAreaRef.current?.clientHeight || 600;

              const updatedTargets = targetsRef.current.map(t => {
                  let nx = t.x + t.vx; // Movement per frame
                  let ny = t.y + t.vy;
                  let nvx = t.vx;
                  let nvy = t.vy;
                  let nextChange = t.nextChangeTime || 0;

                  // Evasive maneuvers (Random direction change)
                  if (now > nextChange) {
                       const speedMult = difficulty === 'HARD' ? 12 : (difficulty === 'EASY' ? 5 : 8);
                       nvx = (Math.random() - 0.5) * speedMult; 
                       nvy = (Math.random() - 0.5) * speedMult;
                       // Ensure it keeps moving
                       if (Math.abs(nvx) < 1) nvx = 2;
                       if (Math.abs(nvy) < 1) nvy = 2;
                       nextChange = now + 400 + Math.random() * 800;
                  }

                  // Bounce off walls
                  if (nx <= 0) { nx = 0; nvx = Math.abs(nvx); }
                  if (nx >= w - t.size) { nx = w - t.size; nvx = -Math.abs(nvx); }
                  
                  if (ny <= 0) { ny = 0; nvy = Math.abs(nvy); }
                  if (ny >= h - t.size) { ny = h - t.size; nvy = -Math.abs(nvy); }

                  return { ...t, x: nx, y: ny, vx: nvx, vy: nvy, nextChangeTime: nextChange };
              });
              
              // Sync Ref and State
              targetsRef.current = updatedTargets;
              setTargets(updatedTargets);

              // Scoring & Stats
              trackingTotalFrames.current++;
              if (isTrackingRef.current) {
                  trackingHitFrames.current++;
                  setScore(s => s + 5);
              }
              if (trackingTotalFrames.current % 10 === 0 && trackingTotalFrames.current > 0) {
                  setAccuracy(Math.round((trackingHitFrames.current / trackingTotalFrames.current) * 100));
              }
          } 
          else if (gameType === 'REFLEX') {
              // Reflex logic...
              const now = Date.now();
              const validTargets = targetsRef.current.filter(t => (now - t.spawnTime) < (t.lifeTime || 1000));
              
              if (validTargets.length !== targetsRef.current.length) {
                  targetsRef.current = validTargets;
                  setTargets(validTargets);
              }
              // Chance to spawn new target if low count
              if (targetsRef.current.length < 3 && Math.random() < 0.03) {
                  spawnTarget();
              }
          }

          // Continue Loop
          requestRef.current = requestAnimationFrame(loop);
      };

      requestRef.current = requestAnimationFrame(loop);

      return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
  }, [gameState, gameType, difficulty, spawnTarget]); // Re-init loop if game parameters change

  // === START GAME ===
  const startGame = () => {
      setScore(0);
      scoreRef.current = 0;
      setTimeLeft(30); 
      setAccuracy(100);
      setTargets([]);
      targetsRef.current = [];
      
      trackingTotalFrames.current = 0;
      trackingHitFrames.current = 0;
      isTrackingRef.current = false;
      
      // Spawn initial target immediately so it exists when loop starts
      spawnTarget();
      
      // Setting state triggers the useEffect loop
      setGameState('PLAYING');
  };

  // Handle Target Clicks (Precision/Reflex)
  const handleTargetClick = (tId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (gameType === 'TRACKING') return; 

      setScore(s => s + 100);
      const newTargets = targetsRef.current.filter(t => t.id !== tId);
      targetsRef.current = newTargets;
      setTargets(newTargets);
      
      if (gameType === 'PRECISION') spawnTarget();
  };

  // Handle Tracking Logic (Called from MouseMove)
  const checkTracking = (e: React.MouseEvent) => {
      if (gameType !== 'TRACKING' || gameState !== 'PLAYING') {
          isTrackingRef.current = false;
          return;
      }
      
      // Must hold Left Click to track
      if (e.buttons !== 1) {
          isTrackingRef.current = false;
          return;
      }

      const rect = gameAreaRef.current?.getBoundingClientRect();
      if (!rect || targetsRef.current.length === 0) {
          isTrackingRef.current = false;
          return;
      }

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const t = targetsRef.current[0];
      const radius = t.size / 2;
      const centerX = t.x + radius;
      const centerY = t.y + radius;

      const dist = Math.sqrt((mx - centerX) ** 2 + (my - centerY) ** 2);
      
      // Relaxed hit detection for better UX
      isTrackingRef.current = dist < (radius * 1.2); 
  };

  // === GLOBAL EVENT HANDLERS ===
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    setStats(prev => ({ ...prev, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }));

    // 1. POLLING RATE
    if (isMeasuringHz.current) {
        const dt = now - lastMouseMoveTime.current;
        if (dt > 0) {
            const instantHz = 1000 / dt;
            hzBuffer.current.push(instantHz);
            if (hzBuffer.current.length >= 5) {
                const sum = hzBuffer.current.reduce((a, b) => a + b, 0);
                const avg = Math.round(sum / hzBuffer.current.length);
                setCurrentHz(avg);
                if (avg > maxHz) setMaxHz(avg);
                setAvgHz(prev => Math.round((prev + avg) / 2));
                setHzHistory(prev => {
                    const next = [...prev, avg];
                    if (next.length > 50) next.shift();
                    return next;
                });
                hzBuffer.current = [];
            }
        }
        lastMouseMoveTime.current = now;
    }

    // 2. DPI
    if (dpiMode === 'MEASURING') {
        setAccumulatedPixels(prev => prev + Math.abs(e.movementX));
    }

    // 3. GAME TRACKING
    if (gameState === 'PLAYING' && gameType === 'TRACKING') {
        checkTracking(e);
    }

  }, [dpiMode, gameState, gameType, maxHz]);

  const handleMouseEnterHz = () => {
      isMeasuringHz.current = true;
      lastMouseMoveTime.current = performance.now();
      hzBuffer.current = [];
  };
  const handleMouseLeaveHz = () => {
      isMeasuringHz.current = false;
      setCurrentHz(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 3 || e.button === 4) e.preventDefault();
    setStats(prev => ({
      ...prev,
      leftClick: e.button === 0 ? true : prev.leftClick,
      middleClick: e.button === 1 ? true : prev.middleClick,
      rightClick: e.button === 2 ? true : prev.rightClick,
      backClick: e.button === 3 ? true : prev.backClick,
      forwardClick: e.button === 4 ? true : prev.forwardClick,
    }));
    
    // Check tracking immediately on click
    if (e.button === 0 && gameState === 'PLAYING' && gameType === 'TRACKING') {
         checkTracking(e);
    }
  };

  // Stop tracking if mouse released
  const handleMouseUp = () => {
      isTrackingRef.current = false;
      if (dpiMode === 'MEASURING') stopDpiMeasure();
  };

  const startDpiMeasure = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDpiMode('MEASURING');
    setAccumulatedPixels(0);
    setDpiResult(null);
  };

  const stopDpiMeasure = () => {
    if (dpiMode === 'MEASURING') {
        let inches = targetDist;
        if (unit === 'CM') inches = targetDist / 2.54;
        if (inches > 0) {
            setDpiResult(Math.round(accumulatedPixels / inches));
        }
        setDpiMode('IDLE');
    }
  };

  const resetAll = () => {
      setStats({
          leftClick: false, rightClick: false, middleClick: false,
          backClick: false, forwardClick: false,
          scrollUp: false, scrollDown: false, doubleClick: false,
          x: 0, y: 0
      });
      setHzHistory(new Array(50).fill(0));
      setMaxHz(0);
      setAvgHz(0);
      setCurrentHz(0);
      setDpiResult(null);
      
      setGameState('MENU');
      setTargets([]);
      targetsRef.current = [];
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  return (
    <div className="flex flex-col w-full h-full p-4 md:p-6 max-w-7xl mx-auto overflow-y-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-800 pb-4">
        <div>
           <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
               Mouse Master Center
           </h2>
           <p className="text-gray-400 text-sm">Kiểm tra Polling Rate, DPI và Luyện tập phản xạ</p>
        </div>
        <button onClick={resetAll} className="px-6 py-2 bg-red-600/20 hover:bg-red-600 border border-red-500 text-red-100 rounded-lg transition-all">
          Reset All Stats
        </button>
      </div>

      {/* ROW 1: BUTTONS & DPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Button Test */}
          <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-lg">
             <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                1. Button Functionality
             </h3>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { l: 'Left Click', s: stats.leftClick }, { l: 'Right Click', s: stats.rightClick },
                    { l: 'Middle', s: stats.middleClick }, { l: 'Double Click', s: stats.doubleClick },
                    { l: 'Scroll Up', s: stats.scrollUp }, { l: 'Scroll Down', s: stats.scrollDown },
                    { l: 'Back (M4)', s: stats.backClick }, { l: 'Forward (M5)', s: stats.forwardClick },
                ].map((btn, i) => (
                    <div key={i} className={`p-3 rounded-lg border text-center transition-all ${btn.s ? 'bg-green-600 border-green-400 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                        <div className="font-bold text-sm">{btn.l}</div>
                        <div className={`text-[10px] mt-1 ${btn.s ? 'text-green-200' : 'opacity-0'}`}>DETECTED</div>
                    </div>
                ))}
             </div>
             <div 
               onDoubleClick={() => setStats(p => ({...p, doubleClick: true}))}
               className="mt-3 w-full py-2 bg-gray-800 border border-gray-700 border-dashed rounded text-center text-xs text-gray-500 cursor-pointer hover:bg-gray-750 select-none"
             >
                 Double click here to test
             </div>
          </div>

          {/* DPI Test */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-lg flex flex-col">
             <h3 className="text-yellow-400 font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                2. Quick DPI Check
             </h3>
             <div className="flex gap-2 mb-3">
                 <input type="number" value={targetDist} onChange={(e) => setTargetDist(Number(e.target.value))} className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white" />
                 <select value={unit} onChange={(e) => setUnit(e.target.value as any)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm flex-1">
                     <option value="CM">Centimeters (cm)</option>
                     <option value="INCH">Inches</option>
                 </select>
             </div>
             <div 
                onMouseDown={startDpiMeasure}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDpiMeasure}
                onMouseLeave={stopDpiMeasure}
                className={`flex-1 rounded border-2 border-dashed flex flex-col items-center justify-center cursor-ew-resize transition-colors ${dpiMode === 'MEASURING' ? 'border-yellow-500 bg-yellow-900/10' : 'border-gray-700 hover:border-gray-500'}`}
             >
                 {dpiResult ? (
                     <div className="text-center">
                         <div className="text-4xl font-bold text-white">{dpiResult}</div>
                         <div className="text-xs text-gray-400">ESTIMATED DPI</div>
                         <div className="text-[10px] text-blue-400 mt-1 cursor-pointer hover:underline" onClick={() => setDpiResult(null)}>Try Again</div>
                     </div>
                 ) : (
                     <div className="text-center p-4">
                         {dpiMode === 'MEASURING' ? 
                            <span className="text-yellow-400 font-bold animate-pulse">DRAG {targetDist}{unit.toLowerCase()} & RELEASE</span> : 
                            <span className="text-gray-500 text-sm">Hold Click & Drag horizontally</span>
                         }
                     </div>
                 )}
             </div>
          </div>
      </div>

      {/* ROW 2: POLLING RATE ANALYZER */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-xl">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h3 className="text-blue-400 font-bold text-xl flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                3. Polling Rate Analyzer (Hz)
            </h3>
            <div className="flex gap-4 text-sm">
                <div className="bg-gray-800 px-3 py-1 rounded border border-gray-700">
                    <span className="text-gray-400 mr-2">Max:</span>
                    <span className="text-white font-mono font-bold">{maxHz} Hz</span>
                </div>
                <div className="bg-gray-800 px-3 py-1 rounded border border-gray-700">
                    <span className="text-gray-400 mr-2">Avg:</span>
                    <span className="text-white font-mono font-bold">{avgHz} Hz</span>
                </div>
            </div>
         </div>

         <div className="flex flex-col md:flex-row gap-6">
             {/* Test Area */}
             <div 
                className="w-full md:w-1/3 h-48 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center cursor-crosshair hover:border-blue-500 transition-colors group relative overflow-hidden"
                onMouseEnter={handleMouseEnterHz}
                onMouseLeave={handleMouseLeaveHz}
                onMouseMove={handleMouseMove}
             >
                 <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="z-10 text-center pointer-events-none">
                     <div className="text-5xl font-mono font-bold text-white drop-shadow-md">{currentHz}</div>
                     <div className="text-sm text-gray-400 font-bold mt-1">Hz</div>
                     <div className="text-xs text-gray-500 mt-2">Move mouse continuously here</div>
                 </div>
             </div>

             {/* Graph Area */}
             <div className="w-full md:w-2/3 h-48 bg-gray-950 rounded-lg border border-gray-700 relative">
                 <canvas ref={hzCanvasRef} width={600} height={192} className="w-full h-full rounded-lg" />
                 <div className="absolute top-2 right-2 text-[10px] text-gray-600 font-mono">Real-time Stability Graph</div>
             </div>
         </div>
      </div>

      {/* ROW 3: GAME CENTER */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
          
          {/* Game Header / Menu */}
          <div className="bg-gray-800 p-4 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                  <span className="text-2xl">🎮</span>
                  <h3 className="font-bold text-white text-lg">Test Gear Mini-Games</h3>
              </div>
              
              {gameState === 'MENU' && (
                  <div className="flex gap-4">
                      <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                          {(['PRECISION', 'REFLEX', 'TRACKING'] as GameType[]).map(t => (
                              <button 
                                key={t}
                                onClick={() => setGameType(t)}
                                className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${gameType === t ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                              >
                                  {t}
                              </button>
                          ))}
                      </div>
                      <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                          {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map(d => (
                              <button 
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${difficulty === d ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                              >
                                  {d}
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              {gameState === 'PLAYING' && (
                  <div className="flex gap-4 font-mono font-bold text-white items-center">
                      <div className="bg-gray-900 px-3 py-1 rounded border border-gray-700 text-yellow-400">Score: {score}</div>
                      <div className={`bg-gray-900 px-3 py-1 rounded border border-gray-700 ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>Time: {timeLeft}s</div>
                      {gameType === 'TRACKING' && (
                          <div className={`px-3 py-1 rounded border border-gray-700 ${accuracy > 80 ? 'bg-green-900/50 text-green-400 border-green-700' : 'bg-gray-900 text-gray-400'}`}>
                              Acc: {accuracy}%
                          </div>
                      )}
                      <button onClick={() => setGameState('FINISHED')} className="text-xs text-red-400 hover:text-red-300 underline">Stop</button>
                  </div>
              )}
          </div>

          {/* Game Area */}
          <div 
             ref={gameAreaRef}
             className="relative flex-grow bg-[#0a0a0a] overflow-hidden cursor-crosshair"
             style={{ backgroundImage: 'radial-gradient(#1f2937 1px, transparent 1px)', backgroundSize: '20px 20px' }}
             onMouseMove={handleMouseMove}
             onMouseDown={handleMouseDown}
             onMouseUp={handleMouseUp}
          >
              {/* MENU STATE */}
              {gameState === 'MENU' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20">
                      <h2 className="text-4xl font-bold text-white mb-2 tracking-tighter">
                          {gameType === 'PRECISION' && 'CLICK PRECISION'}
                          {gameType === 'REFLEX' && 'SPEED REFLEX'}
                          {gameType === 'TRACKING' && 'EVASIVE TRACKING'}
                      </h2>
                      <p className="text-gray-400 mb-8 max-w-md text-center px-4">
                          {gameType === 'PRECISION' && 'Mục tiêu xuất hiện lần lượt. Hãy click chính xác và nhanh nhất có thể. Không giới hạn thời gian tồn tại của mục tiêu.'}
                          {gameType === 'REFLEX' && 'Mục tiêu sẽ biến mất sau thời gian ngắn! Hãy click trước khi chúng tan biến. Tốc độ là chìa khóa.'}
                          {gameType === 'TRACKING' && 'Mục tiêu sẽ di chuyển và đổi hướng ngẫu nhiên. Giữ Chuột Trái (Hold Click) trên mục tiêu để ghi điểm và duy trì Accuracy.'}
                      </p>
                      <button 
                        onClick={startGame}
                        className="px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-transform hover:scale-105 active:scale-95"
                      >
                        START GAME
                      </button>
                  </div>
              )}

              {/* PLAYING STATE: TARGETS */}
              {gameState === 'PLAYING' && targets.map(t => {
                  const isLocked = gameType === 'TRACKING' && isTrackingRef.current;
                  return (
                      <div
                          key={t.id}
                          onMouseDown={(e) => handleTargetClick(t.id, e)}
                          className="absolute rounded-full select-none flex items-center justify-center transition-transform"
                          style={{
                              left: t.x, top: t.y, width: t.size, height: t.size,
                              // Visual style switch based on game type
                              background: gameType === 'TRACKING' 
                                ? (isLocked ? 'radial-gradient(circle, #22d3ee 0%, #0891b2 100%)' : 'radial-gradient(circle, #ef4444 0%, #991b1b 100%)')
                                : 'radial-gradient(circle, #ef4444 0%, #991b1b 100%)',
                              boxShadow: gameType === 'TRACKING' && isLocked 
                                ? '0 0 25px #22d3ee, inset 0 0 10px white' 
                                : '0 0 10px rgba(0,0,0,0.5)',
                              cursor: 'pointer',
                          }}
                      >
                          {/* Inner Design */}
                          <div className={`absolute inset-0 rounded-full border-2 ${gameType === 'TRACKING' && isLocked ? 'border-white animate-ping opacity-50' : 'border-white/30'}`}></div>
                          
                          {gameType === 'PRECISION' && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                          
                          {/* Tracking Crosshair Effect */}
                          {gameType === 'TRACKING' && (
                              <div className={`w-full h-full rounded-full border border-white/40 flex items-center justify-center ${isLocked ? 'scale-110' : 'scale-90 opacity-50'}`}>
                                   <div className="w-1 h-1 bg-white/80 rounded-full"></div>
                              </div>
                          )}
                      </div>
                  );
              })}

              {/* FINISHED STATE */}
              {gameState === 'FINISHED' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-30 animate-[fadeIn_0.3s_ease-out]">
                      <div className="text-gray-400 text-sm uppercase tracking-widest mb-1">{gameType} • {difficulty}</div>
                      <div className="text-6xl font-black text-white mb-2">{score}</div>
                      <div className="text-2xl text-yellow-400 font-bold mb-4">POINTS</div>
                      
                      {gameType === 'TRACKING' && (
                           <div className="mb-8 text-center">
                               <div className="text-sm text-gray-400 uppercase">Tracking Accuracy</div>
                               <div className={`text-3xl font-mono font-bold ${accuracy >= 80 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                   {accuracy}%
                               </div>
                           </div>
                      )}

                      <div className="flex gap-4">
                          <button onClick={startGame} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors">
                             Play Again
                          </button>
                          <button onClick={() => setGameState('MENU')} className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors">
                             Menu
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};