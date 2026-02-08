import React, { useState, useEffect, useRef, useCallback } from 'react';

const COLORS = [
  { name: 'Red', hex: '#FF0000' },
  { name: 'Green', hex: '#00FF00' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#000000' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Cyan', hex: '#00FFFF' },
  { name: 'Magenta', hex: '#FF00FF' },
];

const DeadPixelTest: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [colorIndex, setColorIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    // Request fullscreen on mount
    containerRef.current?.requestFullscreen().catch(() => {});
    
    // Auto hide hint
    const timer = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleNextColor = () => {
    setColorIndex((prev) => (prev + 1) % COLORS.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
      else handleNextColor();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <div 
      ref={containerRef}
      onClick={handleNextColor}
      className="fixed inset-0 w-full h-full cursor-none z-50 transition-colors duration-200"
      style={{ backgroundColor: COLORS[colorIndex].hex }}
    >
      {showHint && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-6 py-3 rounded-full text-lg font-bold pointer-events-none backdrop-blur-sm animate-fade-out">
          Click để đổi màu • ESC để thoát
        </div>
      )}
    </div>
  );
};

const RefreshRateTest: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [fps, setFps] = useState(0);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const framesRef = useRef<number>(0);
  
  const animate = useCallback((time: number) => {
    framesRef.current++;
    const diff = time - lastTimeRef.current;

    if (diff >= 1000) {
      setFps(Math.round((framesRef.current * 1000) / diff));
      framesRef.current = 0;
      lastTimeRef.current = time;
    }
    
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <div className="flex flex-col items-center w-full h-full p-6 overflow-y-auto">
       <div className="w-full max-w-4xl flex justify-between items-center mb-8">
         <h2 className="text-2xl font-bold text-green-400">Test Tần Số Quét (Hz)</h2>
         <button onClick={onBack} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">Quay Lại</button>
       </div>

       <div className="flex flex-col items-center justify-center mb-12 relative">
          <div className="text-[8rem] font-bold text-white leading-none font-mono tabular-nums shadow-green-500 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
            {fps}
          </div>
          <div className="text-2xl text-gray-400 font-bold mt-2">FPS / Hz</div>
          
          {/* Moving element to visualize smoothness */}
          <div className="w-full max-w-2xl h-2 bg-gray-800 rounded mt-8 relative overflow-hidden">
             <div className="absolute top-0 bottom-0 w-20 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-[moveX_1s_linear_infinite]" />
          </div>
          <style>{`
            @keyframes moveX {
              0% { left: -10%; }
              100% { left: 110%; }
            }
          `}</style>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full text-sm text-gray-300">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
             <h3 className="font-bold text-green-400 mb-2 text-lg">Curious 'what is my refresh rate'?</h3>
             <p className="mb-2">Our free online Hz test instantly measures the frames per second (FPS) of your monitor, display, or mobile screen.</p>
             <p>Is this FPS or Hz? The browser's FPS is typically capped by your display's Hz, so FPS ≈ Hz.</p>
          </div>
          
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
             <h3 className="font-bold text-yellow-400 mb-2 text-lg">Stuck at 60Hz?</h3>
             <p className="mb-2">Enable 120/144Hz in OS display settings and use a DP or HDMI 2.0/2.1 cable.</p>
             <p>Mobile supported? Yes—works on iPhone and Android high-Hz screens in any browser.</p>
          </div>
       </div>
    </div>
  );
};

export const ScreenTester: React.FC = () => {
  const [mode, setMode] = useState<'MENU' | 'DEAD_PIXEL' | 'REFRESH_RATE'>('MENU');

  const screenInfo = {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    colorDepth: window.screen.colorDepth,
    pixelDepth: window.screen.pixelDepth,
    pixelRatio: window.devicePixelRatio
  };

  if (mode === 'DEAD_PIXEL') return <DeadPixelTest onBack={() => setMode('MENU')} />;
  if (mode === 'REFRESH_RATE') return <RefreshRateTest onBack={() => setMode('MENU')} />;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 overflow-y-auto">
      <h2 className="text-3xl font-bold text-green-400 mb-8">Công Cụ Test Màn Hình</h2>
      
      {/* HARDWARE INFO CARD */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-8 max-w-4xl w-full shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
           <svg className="w-32 h-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2 relative z-10">
           <span className="w-2 h-6 bg-blue-500 rounded-sm"></span>
           Thông Tin Màn Hình
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
           <div className="bg-gray-800 p-3 rounded border border-gray-700">
              <div className="text-xs text-gray-400 uppercase font-bold">Độ Phân Giải</div>
              <div className="text-xl text-green-400 font-mono font-bold">{screenInfo.width} x {screenInfo.height}</div>
           </div>
           <div className="bg-gray-800 p-3 rounded border border-gray-700">
              <div className="text-xs text-gray-400 uppercase font-bold">Vùng Hiển Thị</div>
              <div className="text-lg text-white font-mono">{screenInfo.availWidth} x {screenInfo.availHeight}</div>
           </div>
           <div className="bg-gray-800 p-3 rounded border border-gray-700">
              <div className="text-xs text-gray-400 uppercase font-bold">Độ Sâu Màu</div>
              <div className="text-lg text-white font-mono">{screenInfo.colorDepth}-bit</div>
           </div>
           <div className="bg-gray-800 p-3 rounded border border-gray-700">
              <div className="text-xs text-gray-400 uppercase font-bold">Tỉ Lệ Pixel</div>
              <div className="text-lg text-white font-mono">{screenInfo.pixelRatio}x</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <button 
          onClick={() => setMode('DEAD_PIXEL')}
          className="group relative p-8 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-2xl transition-all hover:scale-105 hover:border-green-500/50 flex flex-col items-center text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-green-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-gray-600 transition-colors z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 z-10">Test Điểm Chết (Dead Pixel)</h3>
          <p className="text-gray-400 text-sm z-10">
            Hiển thị các màu đơn sắc toàn màn hình để phát hiện điểm chết, điểm kẹt màu hoặc hở sáng.
          </p>
        </button>

        <button 
          onClick={() => setMode('REFRESH_RATE')}
          className="group relative p-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl transition-all hover:scale-105 hover:border-blue-500/50 flex flex-col items-center text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-gray-600 transition-colors z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 z-10">Test Tần Số Quét (Hz)</h3>
          <p className="text-gray-400 text-sm z-10">
            Kiểm tra tốc độ làm tươi màn hình (Refresh Rate) và FPS thực tế. Hỗ trợ 60Hz, 120Hz, 144Hz+.
          </p>
        </button>
      </div>
    </div>
  );
};