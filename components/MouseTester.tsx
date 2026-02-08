import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MouseStats } from '../types';

export const MouseTester: React.FC = () => {
  const [stats, setStats] = useState<MouseStats>({
    leftClick: false,
    rightClick: false,
    middleClick: false,
    backClick: false,
    forwardClick: false,
    scrollUp: false,
    scrollDown: false,
    doubleClick: false,
    x: 0,
    y: 0
  });

  // === DPI TEST STATE ===
  const [dpiMode, setDpiMode] = useState<'IDLE' | 'MEASURING'>('IDLE');
  const [targetDist, setTargetDist] = useState<number>(3); // Default 3 cm
  const [unit, setUnit] = useState<'CM' | 'INCH'>('CM');
  const [dpiResult, setDpiResult] = useState<number | null>(null);
  const [accumulatedPixels, setAccumulatedPixels] = useState(0);

  // === POLLING RATE STATE ===
  const [pollingRate, setPollingRate] = useState<number>(0);
  const lastEventTime = useRef<number>(0);
  const eventsCounter = useRef<number[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // === SYSTEM INFO ===
  // Note: Browsers do not expose specific mouse model names (e.g., "Logitech G502") for privacy.
  const platformInfo = navigator.platform || 'Unknown OS';
  const userAgent = navigator.userAgent;

  // === EVENT HANDLERS ===

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent default browser navigation for side buttons
    if (e.button === 3 || e.button === 4) {
      e.preventDefault();
    }

    // Drawing Logic
    // Only draw if left click and NOT in DPI test mode
    if (e.button === 0 && dpiMode === 'IDLE') {
        setIsDrawing(true);
    }

    // Stats Logic
    setStats(prev => {
      const next = { ...prev };
      if (e.button === 0) next.leftClick = true;
      if (e.button === 1) next.middleClick = true;
      if (e.button === 2) next.rightClick = true;
      if (e.button === 3) next.backClick = true;    // Side Button 1
      if (e.button === 4) next.forwardClick = true; // Side Button 2
      return next;
    });
  }, [dpiMode]);

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 3 || e.button === 4) e.preventDefault();
    setIsDrawing(false);
    
    // Stop DPI Measure if active
    if (dpiMode === 'MEASURING') {
      stopDpiMeasure();
    }
  };

  const handleDoubleClick = () => {
    setStats(prev => ({ ...prev, doubleClick: true }));
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    setStats(prev => ({
      ...prev,
      scrollUp: prev.scrollUp || e.deltaY < 0,
      scrollDown: prev.scrollDown || e.deltaY > 0
    }));
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    
    // Update basic stats
    setStats(prev => ({ ...prev, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }));
    
    // --- POLLING RATE CALCULATION ---
    // Calculate instantaneous Hz based on time difference between events
    if (isDrawing && lastEventTime.current > 0) {
      // Clean up old events (>1s ago)
      eventsCounter.current = eventsCounter.current.filter(t => now - t < 1000);
      eventsCounter.current.push(now);
      setPollingRate(eventsCounter.current.length);
    }
    lastEventTime.current = now;

    // --- DPI MEASUREMENT ---
    // Use movementX for raw pixel delta (more accurate than screen coordinates)
    if (dpiMode === 'MEASURING') {
        const delta = Math.abs(e.movementX); 
        setAccumulatedPixels(prev => prev + delta);
    }
    
    // --- DRAWING ---
    if (isDrawing && canvasRef.current && dpiMode === 'IDLE') {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Dynamic color based on speed (movement magnitude)
        const speed = Math.sqrt(e.movementX**2 + e.movementY**2);
        const hue = Math.min(120, Math.max(0, 120 - speed * 2)); // Green (slow) to Red (fast)
        
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(e.nativeEvent.offsetX, e.nativeEvent.offsetY, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Connect dots for smoother lines
        // (Optional: Implement lineTo logic if strictly needed, but dots show polling better)
      }
    }
  }, [isDrawing, dpiMode]);

  // Prevent context menu & Browser Navigation
  useEffect(() => {
    const handleContext = (e: MouseEvent) => e.preventDefault();
    const handleNativeMouseDown = (e: MouseEvent) => {
        if (e.button === 3 || e.button === 4) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    document.addEventListener('contextmenu', handleContext);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mouseup', handleNativeMouseDown);
    window.addEventListener('mousedown', handleNativeMouseDown);

    return () => {
      document.removeEventListener('contextmenu', handleContext);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', handleNativeMouseDown);
      window.removeEventListener('mousedown', handleNativeMouseDown);
    };
  }, [handleWheel]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setStats({
      leftClick: false,
      rightClick: false,
      middleClick: false,
      backClick: false,
      forwardClick: false,
      scrollUp: false,
      scrollDown: false,
      doubleClick: false,
      x: 0,
      y: 0
    });
    setDpiResult(null);
    setAccumulatedPixels(0);
    setPollingRate(0);
  };

  // === DPI HANDLERS ===
  const startDpiMeasure = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only Left Click
    setDpiMode('MEASURING');
    setAccumulatedPixels(0);
    setDpiResult(null);
  };

  const stopDpiMeasure = () => {
    if (dpiMode === 'MEASURING') {
        // Calculate DPI
        // Formula: DPI = Pixels / Inches
        let inches = targetDist;
        if (unit === 'CM') {
            inches = targetDist / 2.54;
        }
        
        if (inches > 0) {
            const calculatedDpi = Math.round(accumulatedPixels / inches);
            setDpiResult(calculatedDpi);
        }
        setDpiMode('IDLE');
    }
  };

  const ButtonStatus = ({ label, active, subLabel }: { label: string; active: boolean, subLabel?: string }) => (
    <div className={`p-4 rounded-lg border flex flex-col items-center justify-center transition-all duration-200 min-h-[90px] ${active ? 'bg-green-600 border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
      <span className="font-bold text-base text-center">{label}</span>
      {subLabel && <span className="text-[10px] text-gray-300 mt-1">{subLabel}</span>}
      <span className={`text-[10px] mt-2 font-mono px-2 py-0.5 rounded ${active ? 'bg-green-700' : 'bg-gray-900'}`}>{active ? 'OK' : '...'}</span>
    </div>
  );

  return (
    <div className="flex flex-col w-full h-full p-4 md:p-6 max-w-7xl mx-auto overflow-y-auto">
      
      {/* HEADER WITH SYSTEM INFO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-green-400">Test Chuột Chuyên Sâu</h2>
           <div className="flex items-center gap-2 mt-1">
             <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded border border-gray-700">OS: {platformInfo}</span>
             <span className="text-xs text-gray-500 hidden sm:inline-block">| Browser Managed Device</span>
           </div>
        </div>
        <button onClick={clearCanvas} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-lg border border-red-500">
          Reset Tất Cả
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          
          {/* LEFT COLUMN: BUTTONS & POLLING RATE */}
          <div className="xl:col-span-2 space-y-4">
             {/* Button Test */}
             <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                <h3 className="text-gray-300 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    1. Kiểm tra Nút Bấm
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <ButtonStatus label="Chuột Trái" active={stats.leftClick} />
                    <ButtonStatus label="Chuột Giữa" active={stats.middleClick} />
                    <ButtonStatus label="Chuột Phải" active={stats.rightClick} />
                    <div 
                        className={`p-4 rounded-lg border flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-200 min-h-[90px] ${stats.doubleClick ? 'bg-green-600 border-green-400 text-white' : 'bg-blue-900/20 border-blue-800 text-blue-200 hover:bg-blue-800/30'}`}
                        onDoubleClick={handleDoubleClick}
                    >
                        <span className="font-bold text-base">Double Click</span>
                        <span className="text-[10px] mt-1">Nhấn đúp vào đây</span>
                    </div>
                    <ButtonStatus label="Lăn Lên" active={stats.scrollUp} />
                    <ButtonStatus label="Lăn Xuống" active={stats.scrollDown} />
                    <ButtonStatus label="Back (Side 1)" active={stats.backClick} />
                    <ButtonStatus label="Fwd (Side 2)" active={stats.forwardClick} />
                </div>
             </div>

             {/* Polling Rate Info */}
             <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-gray-300 font-bold text-sm uppercase tracking-wider mb-1">2. Polling Rate (Hz)</h3>
                  <p className="text-xs text-gray-500">Di chuột liên tục trong vùng vẽ để đo.</p>
                </div>
                <div className="text-right">
                   <span className={`text-4xl font-mono font-bold ${pollingRate > 900 ? 'text-green-400' : pollingRate > 450 ? 'text-blue-400' : 'text-yellow-400'}`}>
                     {pollingRate}
                   </span>
                   <span className="text-gray-500 text-sm ml-1">Hz</span>
                </div>
             </div>
          </div>

          {/* RIGHT COLUMN: DPI TESTER (ENHANCED) */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-xl flex flex-col h-full">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
                <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                <h3 className="text-white font-bold text-lg">3. Đo DPI Chính Xác</h3>
             </div>
             
             {/* Config Area */}
             <div className="mb-4">
                <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Khoảng cách bạn sẽ di chuyển:</label>
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        value={targetDist}
                        onChange={(e) => setTargetDist(Math.max(1, Number(e.target.value)))}
                        className="bg-gray-900 border border-gray-600 rounded px-3 py-2 w-full text-white focus:border-yellow-400 focus:outline-none font-mono text-lg"
                    />
                    <select 
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as 'CM' | 'INCH')}
                        className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-400 focus:outline-none font-bold"
                    >
                        <option value="CM">cm</option>
                        <option value="INCH">inch</option>
                    </select>
                </div>
                <div className="mt-2 text-[10px] text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50">
                   ⚠ <strong>Lưu ý:</strong> Phải tắt "Enhance pointer precision" (Gia tốc chuột) trong Windows Mouse Settings để có kết quả đúng.
                </div>
             </div>

             {/* Measurement Area */}
             <div 
                className={`flex-grow rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-ew-resize select-none transition-all relative overflow-hidden group ${dpiMode === 'MEASURING' ? 'bg-yellow-900/20 border-yellow-500' : 'bg-gray-900 border-gray-600 hover:border-gray-500'}`}
                onMouseDown={startDpiMeasure}
                onMouseMove={handleMouseMove} // We use global mouse move, but this div captures the start
                onMouseUp={stopDpiMeasure}
                onMouseLeave={stopDpiMeasure}
             >
                {/* Visual Ruler Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none flex flex-col justify-evenly">
                   {[...Array(10)].map((_, i) => <div key={i} className="w-full h-px bg-white"></div>)}
                </div>
                
                {dpiResult !== null ? (
                    <div className="text-center z-10 animate-fade-in-up">
                        <div className="text-5xl font-bold text-yellow-400 drop-shadow-lg">{dpiResult}</div>
                        <div className="text-sm text-gray-400 font-bold uppercase tracking-widest">DPI Ước Tính</div>
                        <div className="mt-4 px-3 py-1 bg-gray-800 rounded text-xs text-gray-500 border border-gray-700">
                           Pixels: {accumulatedPixels} | Dist: {targetDist}{unit.toLowerCase()}
                        </div>
                        <div className="text-xs text-blue-400 mt-4 underline cursor-pointer hover:text-blue-300" onClick={() => setDpiResult(null)}>Đo lại</div>
                    </div>
                ) : (
                    <div className="text-center z-10 pointer-events-none w-full px-4">
                        {dpiMode === 'MEASURING' ? (
                            <>
                                <div className="text-3xl font-bold text-white mb-1 font-mono">{accumulatedPixels} px</div>
                                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
                                   {/* Just a visual progress bar that loops to show activity */}
                                   <div className="h-full bg-yellow-500 animate-[loading_1s_infinite_linear] w-1/3"></div>
                                </div>
                                <div className="text-yellow-400 text-sm animate-pulse font-bold">ĐANG GIỮ CHUỘT...</div>
                                <div className="text-xs text-gray-400 mt-1">Di chuyển đúng {targetDist} {unit.toLowerCase()} rồi thả ra</div>
                            </>
                        ) : (
                            <>
                                <div className="mb-2 text-4xl opacity-50">🖱️ 📏</div>
                                <span className="text-gray-300 font-bold block">NHẤN GIỮ & KÉO NGANG</span>
                                <span className="text-xs text-gray-500 block mt-1">Di chuyển chuột theo phương ngang</span>
                            </>
                        )}
                    </div>
                )}
             </div>
          </div>
      </div>

      {/* DRAWING AREA */}
      <div className="flex-grow relative rounded-xl border border-gray-700 overflow-hidden bg-[#050505] shadow-inner group min-h-[350px]">
        <div className="absolute top-2 left-2 text-xs text-gray-500 font-mono pointer-events-none z-10 bg-black/80 px-3 py-1 rounded border border-gray-800">
          X: {stats.x} <span className="text-gray-600">|</span> Y: {stats.y}
        </div>
        <div className="absolute top-2 right-2 text-xs text-gray-500 font-mono pointer-events-none z-10 bg-black/80 px-3 py-1 rounded border border-gray-800 text-right">
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-green-500"></span> Chậm
             <span className="w-2 h-2 rounded-full bg-red-500"></span> Nhanh
          </div>
          <div className="mt-1 opacity-70">Vẽ để kiểm tra Jitter/Spin-out</div>
        </div>
        
        {!isDrawing && stats.x === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xl text-gray-600 font-bold opacity-50">Vùng vẽ Test Cảm Biến (Polling & Tracking)</span>
            </div>
        )}
        
        <canvas
          ref={canvasRef}
          width={1600}
          height={800}
          className="w-full h-full cursor-crosshair touch-none block"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        />
      </div>
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};