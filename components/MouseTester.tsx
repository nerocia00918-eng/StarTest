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
  vx?: number; // For Tracking game
  vy?: number;
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
  
  // Refs for Game Loop
  const requestRef = useRef<number>();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef(0);
  const lastGameTimeRef = useRef(0);
  const trackingScoreAccumulator = useRef(0);

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

  // === GAME LOOP ===
  const spawnTarget = useCallback(() => {
      if (!gameAreaRef.current) return;
      const { clientWidth: w, clientHeight: h } = gameAreaRef.current;
      
      let size = 50;
      if (difficulty === 'EASY') size = 70;
      if (difficulty === 'HARD') size = 30;

      const newTarget: Target = {
          id: Date.now() + Math.random(),
          x: Math.random() * (w - size),
          y: Math.random() * (h - size),
          size: size,
          spawnTime: Date.now(),
          lifeTime: difficulty === 'HARD' ? 800 : difficulty === 'NORMAL' ? 1200 : 2000, // For Reflex
          vx: (Math.random() - 0.5) * (difficulty === 'HARD' ? 12 : 6), // For Tracking
          vy: (Math.random() - 0.5) * (difficulty === 'HARD' ? 12 : 6)
      };

      if (gameType === 'TRACKING') {
          setTargets([newTarget]); // Only 1 target for tracking
      } else {
          setTargets(prev => [...prev, newTarget]);
      }
  }, [difficulty, gameType]);

  const gameLoop = useCallback((time: number) => {
      if (gameState !== 'PLAYING') return;

      const dt = time - lastGameTimeRef.current;
      lastGameTimeRef.current = time;

      // Timer Logic
      if (Math.floor(time / 1000) > Math.floor((time - dt) / 1000)) {
          setTimeLeft(prev => {
              if (prev <= 1) {
                  setGameState('FINISHED');
                  return 0;
              }
              return prev - 1;
          });
      }

      // Game Specific Logic
      if (gameType === 'REFLEX') {
          setTargets(prev => prev.filter(t => {
              const age = Date.now() - t.spawnTime;
              return age < (t.lifeTime || 1000);
          }));
          
          // Spawn new if empty (simple logic)
          if (Math.random() < 0.05) spawnTarget(); 
      } 
      else if (gameType === 'TRACKING') {
           setTargets(prev => prev.map(t => {
               let nx = t.x + (t.vx || 0);
               let ny = t.y + (t.vy || 0);
               let nvx = t.vx || 0;
               let nvy = t.vy || 0;

               // Bounce
               if (!gameAreaRef.current) return t;
               const maxX = gameAreaRef.current.clientWidth - t.size;
               const maxY = gameAreaRef.current.clientHeight - t.size;

               if (nx <= 0 || nx >= maxX) nvx *= -1;
               if (ny <= 0 || ny >= maxY) nvy *= -1;

               return { ...t, x: Math.max(0, Math.min(nx, maxX)), y: Math.max(0, Math.min(ny, maxY)), vx: nvx, vy: nvy };
           }));

           // Tracking Score Check is done in MouseMove for performance, or here if we track mouse pos globally
      }

      requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, gameType, spawnTarget]);

  // Start Game
  const startGame = () => {
      setScore(0);
      scoreRef.current = 0;
      setTimeLeft(30); // 30 seconds
      setTargets([]);
      setGameState('PLAYING');
      lastGameTimeRef.current = performance.now();
      
      // Initial Spawn
      spawnTarget();
      if (gameType === 'REFLEX') {
          // Spawn a few more for reflex
          setTimeout(spawnTarget, 200);
      }

      requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
      if (gameState === 'FINISHED') {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
      }
  }, [gameState]);

  // Handle Target Clicks
  const handleTargetClick = (tId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (gameType === 'TRACKING') return; // Tracking handles score differently

      setScore(s => s + 100);
      setTargets(prev => prev.filter(t => t.id !== tId));
      
      if (gameType === 'PRECISION') {
          spawnTarget(); // Immediate respawn
      }
  };

  // Handle Tracking Mouse Hold
  const checkTracking = (e: React.MouseEvent) => {
      if (gameType !== 'TRACKING' || gameState !== 'PLAYING') return;
      if (e.buttons !== 1) return; // Must hold left click

      const rect = gameAreaRef.current?.getBoundingClientRect();
      if (!rect || targets.length === 0) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const t = targets[0];
      const radius = t.size / 2;
      const centerX = t.x + radius;
      const centerY = t.y + radius;

      const dist = Math.sqrt((mx - centerX) ** 2 + (my - centerY) ** 2);
      
      if (dist < radius) {
          // Using a ref accumulator to throttle state updates
          trackingScoreAccumulator.current += 1;
          if (trackingScoreAccumulator.current > 5) {
               setScore(s => s + 10);
               trackingScoreAccumulator.current = 0;
          }
      }
  };

  // === GLOBAL EVENT HANDLERS ===
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    setStats(prev => ({ ...prev, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }));

    // 1. POLLING RATE CALCULATION
    if (isMeasuringHz.current) {
        const dt = now - lastMouseMoveTime.current;
        if (dt > 0) {
            const instantHz = 1000 / dt;
            hzBuffer.current.push(instantHz);
            
            // Average every 10 samples to smooth graph
            if (hzBuffer.current.length >= 5) {
                const sum = hzBuffer.current.reduce((a, b) => a + b, 0);
                const avg = Math.round(sum / hzBuffer.current.length);
                
                setCurrentHz(avg);
                if (avg > maxHz) setMaxHz(avg);
                setAvgHz(prev => Math.round((prev + avg) / 2)); // Simple running average

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

    // 2. DPI MEASURE
    if (dpiMode === 'MEASURING') {
        setAccumulatedPixels(prev => prev + Math.abs(e.movementX));
    }

    // 3. GAME TRACKING
    if (gameState === 'PLAYING' && gameType === 'TRACKING') {
        checkTracking(e);
    }

  }, [dpiMode, gameState, gameType, maxHz]); // Added deps but kept heavy logic inside

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
    
    if (e.button === 0 && dpiMode === 'IDLE' && gameState === 'MENU') {
        // Maybe initiate drawing if we add that back
    }
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

  // Listen for global mouse up to clear button states visually if needed
  // But strictly, we keep them "ON" to show they work (as per original logic).
  // Let's add a reset button for everything.

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
          >
              {/* MENU STATE */}
              {gameState === 'MENU' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20">
                      <h2 className="text-4xl font-bold text-white mb-2 tracking-tighter">
                          {gameType === 'PRECISION' && 'CLICK PRECISION'}
                          {gameType === 'REFLEX' && 'SPEED REFLEX'}
                          {gameType === 'TRACKING' && 'STREAM TRACKING'}
                      </h2>
                      <p className="text-gray-400 mb-8 max-w-md text-center">
                          {gameType === 'PRECISION' && 'Mục tiêu xuất hiện lần lượt. Hãy click chính xác và nhanh nhất có thể. Không giới hạn thời gian tồn tại của mục tiêu.'}
                          {gameType === 'REFLEX' && 'Mục tiêu sẽ biến mất sau thời gian ngắn! Hãy click trước khi chúng tan biến. Tốc độ là chìa khóa.'}
                          {gameType === 'TRACKING' && 'Giữ chuột trái đè lên mục tiêu đang di chuyển để ghi điểm. Kiểm tra khả năng bám đuổi (Tracking) của bạn.'}
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
              {gameState === 'PLAYING' && targets.map(t => (
                  <div
                      key={t.id}
                      onMouseDown={(e) => handleTargetClick(t.id, e)}
                      className="absolute rounded-full select-none"
                      style={{
                          left: t.x, top: t.y, width: t.size, height: t.size,
                          background: gameType === 'TRACKING' ? 'radial-gradient(circle, #3b82f6 0%, #1d4ed8 100%)' : 'radial-gradient(circle, #ef4444 0%, #991b1b 100%)',
                          boxShadow: gameType === 'TRACKING' ? '0 0 15px #3b82f6' : '0 0 10px #ef4444',
                          cursor: 'pointer',
                          transition: gameType === 'TRACKING' ? 'none' : 'transform 0.1s'
                      }}
                  >
                      <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
                      {gameType === 'PRECISION' && (
                          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                      )}
                  </div>
              ))}

              {/* FINISHED STATE */}
              {gameState === 'FINISHED' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-30 animate-[fadeIn_0.3s_ease-out]">
                      <div className="text-gray-400 text-sm uppercase tracking-widest mb-1">{gameType} • {difficulty}</div>
                      <div className="text-6xl font-black text-white mb-2">{score}</div>
                      <div className="text-2xl text-yellow-400 font-bold mb-8">POINTS</div>

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