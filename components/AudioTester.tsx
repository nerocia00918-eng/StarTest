import React, { useState, useRef, useEffect } from 'react';

export const AudioTester: React.FC = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState<'left' | 'right' | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playTone = (pan: number, channel: 'left' | 'right') => {
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Create oscillator
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 note

    // Create panner for Left/Right separation
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, ctx.currentTime);

    // Create gain for volume envelope (avoid clicking sound)
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    osc.connect(panner);
    panner.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);

    setIsPlaying(channel);
    setTimeout(() => setIsPlaying(null), 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6">
      <div className="text-center mb-10">
         <h2 className="text-3xl font-bold text-green-400 mb-2">Test Loa (Stereo)</h2>
         <p className="text-gray-400">Kiểm tra loa trái và phải riêng biệt để đảm bảo âm thanh stereo hoạt động đúng.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-12 items-center">
        {/* Left Speaker */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => playTone(-1, 'left')}
            className={`w-40 h-40 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-xl ${
              isPlaying === 'left' 
                ? 'bg-green-600 border-green-400 scale-110 shadow-[0_0_30px_rgba(34,197,94,0.6)]' 
                : 'bg-gray-800 border-gray-600 hover:border-gray-400 hover:bg-gray-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          <span className="mt-4 text-xl font-bold text-gray-200">Loa Trái (Left)</span>
        </div>

        <div className="hidden md:block w-px h-40 bg-gray-700"></div>

        {/* Right Speaker */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => playTone(1, 'right')}
            className={`w-40 h-40 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-xl ${
              isPlaying === 'right' 
                ? 'bg-blue-600 border-blue-400 scale-110 shadow-[0_0_30px_rgba(59,130,246,0.6)]' 
                : 'bg-gray-800 border-gray-600 hover:border-gray-400 hover:bg-gray-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          <span className="mt-4 text-xl font-bold text-gray-200">Loa Phải (Right)</span>
        </div>
      </div>
      
      <div className="mt-12 p-4 bg-gray-900 rounded border border-gray-700 max-w-lg text-sm text-gray-400">
         <p><strong>Lưu ý:</strong> Nếu bạn nghe thấy âm thanh ở cả hai bên khi chỉ bấm một bên, có thể tai nghe/loa của bạn đang bật chế độ Mono Audio trong cài đặt hệ điều hành.</p>
      </div>
    </div>
  );
};
