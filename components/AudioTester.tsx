import React, { useState, useRef, useEffect } from 'react';

export const AudioTester: React.FC = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState<'left' | 'right' | null>(null);
  const [activeTrackUrl, setActiveTrackUrl] = useState<string | null>(null);
  
  // Frequency Sweep State
  const [isSweeping, setIsSweeping] = useState(false);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const sweepGainRef = useRef<GainNode | null>(null);
  const [currentFreq, setCurrentFreq] = useState(0);

  // SoundCloud Links provided by user
  const musicOptions = [
    { 
        url: 'https://soundcloud.com/hung-76726861/nh-c-test-loa-s-ki-n-chuy-n-s', 
        label: 'Test Loa Sự Kiện', 
        desc: 'Bass mạnh, dải động rộng, kiểm tra công suất loa.',
        icon: '🔊'
    },
    { 
        url: 'https://soundcloud.com/quocduy05/hai-phong-fly-2026-am-nhac-no-o-cai-chi', 
        label: 'Fly', 
        desc: 'Vinahouse / Nonstop - Test độ căng của Bass.',
        icon: '✈️'
    },
    { 
        url: 'https://soundcloud.com/sonbach4444/goc-nhac-xua-hoai-niem-dan-choi-sonbach', 
        label: 'Nhạc Xưa Hoài Niệm', 
        desc: 'Test Mid & Treble, độ chi tiết giọng hát.',
        icon: '📻'
    },
    { 
        url: 'https://soundcloud.com/hung-76726861/ai-chung-ti-nh-u-o-c-ma-i-inh', 
        label: 'Ai Chung Tình Được Mãi', 
        desc: 'Test Vocal',
        icon: '💣'
    },
    { 
        url: 'https://soundcloud.com/nhut-hoa-huynh/nst-2025-ae-taiwan-v5-kho-ng', 
        label: 'NST 2025 Taiwan', 
        desc: 'Nonstop V5 - Bass dập liên tục',
        icon: '🚀'
    }
  ];

  // Initialize AudioContext safely
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    return audioContextRef.current;
  };

  useEffect(() => {
      return () => {
          stopSweep();
          audioContextRef.current?.close();
      };
  }, []);

  const playTone = async (pan: number, channel: 'left' | 'right') => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);

      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, ctx.currentTime);

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
    } catch (e) {
      console.error("Audio Error:", e);
    }
  };

  // === FREQUENCY SWEEP LOGIC ===
  const startSweep = async () => {
    if (isSweeping) {
        stopSweep();
        return;
    }
    
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = 20; 
        gain.gain.value = 0.5; 

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.frequency.exponentialRampToValueAtTime(20000, ctx.currentTime + 10);
        
        oscillatorRef.current = osc;
        sweepGainRef.current = gain;
        setIsSweeping(true);

        const interval = setInterval(() => {
            if (osc.frequency.value >= 19000) {
                stopSweep();
                clearInterval(interval);
            }
            setCurrentFreq(Math.round(osc.frequency.value));
        }, 100);
        
        osc.onended = () => {
            setIsSweeping(false);
            clearInterval(interval);
        };
        osc.stop(ctx.currentTime + 10);

    } catch (e) {
        console.error(e);
    }
  };

  const stopSweep = () => {
    if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch(e) {}
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
    }
    setIsSweeping(false);
    setCurrentFreq(0);
  };

  return (
    <div className="flex flex-col items-center justify-start w-full h-full p-6 overflow-y-auto">
      
      {/* 1. STEREO TEST */}
      <div className="w-full max-w-4xl bg-gray-900/50 rounded-xl p-6 border border-gray-800 mb-8">
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-600 p-2 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-white">1. Test Loa Trái / Phải (Stereo)</h2>
        </div>
        
        <div className="flex flex-row justify-center gap-8 md:gap-20 items-center">
            <button
                onClick={() => playTone(-1, 'left')}
                className={`flex flex-col items-center gap-3 group transition-all ${isPlaying === 'left' ? 'scale-110' : 'hover:scale-105'}`}
            >
                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 flex items-center justify-center transition-colors shadow-lg ${isPlaying === 'left' ? 'border-green-400 bg-green-600/20 text-green-400 shadow-green-500/50' : 'border-gray-600 bg-gray-800 text-gray-500 group-hover:border-green-500 group-hover:text-green-500'}`}>
                    <span className="text-3xl font-bold">L</span>
                </div>
                <span className="font-bold text-gray-400 group-hover:text-white">Loa Trái</span>
            </button>

            <button
                onClick={() => playTone(1, 'right')}
                className={`flex flex-col items-center gap-3 group transition-all ${isPlaying === 'right' ? 'scale-110' : 'hover:scale-105'}`}
            >
                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 flex items-center justify-center transition-colors shadow-lg ${isPlaying === 'right' ? 'border-blue-400 bg-blue-600/20 text-blue-400 shadow-blue-500/50' : 'border-gray-600 bg-gray-800 text-gray-500 group-hover:border-blue-500 group-hover:text-blue-500'}`}>
                    <span className="text-3xl font-bold">R</span>
                </div>
                <span className="font-bold text-gray-400 group-hover:text-white">Loa Phải</span>
            </button>
        </div>
      </div>

      {/* 2. FREQUENCY SWEEP */}
      <div className="w-full max-w-4xl bg-gray-900/50 rounded-xl p-6 border border-gray-800 mb-8">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="bg-yellow-600 p-2 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">2. Test Dải Tần (20Hz - 20kHz)</h2>
                    <p className="text-xs text-gray-400">Kiểm tra khả năng tái tạo âm trầm (Bass) và âm cao (Treble)</p>
                </div>
            </div>
            
            <button 
                onClick={startSweep}
                className={`px-6 py-2 rounded-lg font-bold transition-all shadow-lg ${isSweeping ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-yellow-600 hover:bg-yellow-700'}`}
            >
                {isSweeping ? 'Dừng Test' : 'Bắt Đầu Quét'}
            </button>
        </div>

        <div className="w-full h-8 bg-gray-800 rounded-full overflow-hidden relative border border-gray-700">
            {isSweeping && (
                <div 
                    className="absolute top-0 bottom-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100 ease-linear"
                    style={{ width: `${Math.min(100, (currentFreq / 20000) * 100)}%` }}
                />
            )}
            <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-mono font-bold text-white mix-blend-difference">
                <span>20Hz</span>
                <span>1kHz</span>
                <span>10kHz</span>
                <span>20kHz</span>
            </div>
        </div>
        <div className="text-center mt-2 font-mono text-yellow-400 h-6">
            {isSweeping ? `${currentFreq} Hz` : 'Sẵn sàng'}
        </div>
      </div>

      {/* 3. MUSIC TEST (SoundCloud) */}
      <div className="w-full max-w-4xl border-t border-gray-800 pt-8 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-orange-500 mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
            </svg>
            3. Test Loa Bằng Nhạc (SoundCloud)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8">
            {musicOptions.map((opt, idx) => (
                <button 
                    key={idx}
                    onClick={() => setActiveTrackUrl(opt.url)}
                    className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all group relative overflow-hidden ${
                        activeTrackUrl === opt.url
                        ? 'bg-orange-600/20 border-orange-500 text-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.2)]' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:border-gray-500'
                    }`}
                >
                    <div className="text-2xl mb-2">{opt.icon}</div>
                    <span className="font-bold text-sm mb-1">{opt.label}</span>
                    <span className="text-[10px] opacity-70 line-clamp-2">{opt.desc}</span>
                </button>
            ))}
        </div>

        <div className="w-full aspect-[16/5] bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700 relative group">
            {activeTrackUrl ? (
                <>
                    <iframe 
                        width="100%" 
                        height="100%" 
                        scrolling="no" 
                        frameBorder="no" 
                        allow="autoplay" 
                        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(activeTrackUrl)}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`}
                        className="absolute inset-0 w-full h-full z-10"
                    ></iframe>
                    {/* Fallback info */}
                    <div className="absolute top-2 right-2 z-20 opacity-50 hover:opacity-100 transition-opacity">
                        <a 
                            href={activeTrackUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-black/80 text-white text-[10px] px-2 py-1 rounded border border-gray-600 hover:bg-orange-600 hover:border-orange-600 transition-colors"
                        >
                            Mở trên SoundCloud ↗
                        </a>
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-gray-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 to-gray-900">
                    <svg className="w-16 h-16 mb-4 text-orange-600 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M11.56 8.87V17h-3.38v-8.13h3.38zm-11.25 0v8.13h3.38v-8.13H.31zm3.38-4.88v13H7.07V4H3.69zm7.87 2.44V17h3.38V6.44h-3.38zm3.38 6.5h3.37v-6.5h-3.37v6.5z"/></svg>
                    <p className="font-medium text-gray-400">Chọn một bài nhạc phía trên để bắt đầu test</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};