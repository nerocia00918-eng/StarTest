import React, { useState, useEffect, useRef } from 'react';

export const MicTester: React.FC = () => {
  const [status, setStatus] = useState<'IDLE' | 'REQUESTING' | 'ACTIVE' | 'RECORDING' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>('');

  // Refs for cleanup
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup function to stop everything safely
  const stopAll = () => {
    // 1. Stop Recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) { console.warn(e); }
    }
    
    // 2. Stop Animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // 3. Stop Tracks (Important for releasing the mic hardware)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 4. Close Audio Context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.warn);
      audioContextRef.current = null;
    }
    
    // Reset Refs
    sourceRef.current = null;
    analyserRef.current = null;
    
    setStatus('IDLE');
    setDeviceName('');
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => stopAll();
  }, []);

  const initMic = async () => {
    try {
      setStatus('REQUESTING');
      setErrorMessage('');
      setAudioBlobUrl(null);
      setDeviceName('');

      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Trình duyệt của bạn không hỗ trợ truy cập Microphone (hoặc bạn đang không dùng HTTPS).");
      }

      // 1. Get Stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true 
        } 
      });
      streamRef.current = stream;
      
      // Extract Device Name from the stream track
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
          setDeviceName(audioTrack.label || "Microphone mặc định (Default)");
      }

      // 2. Setup Audio Context & Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      // Ensure context is running (fixes issues where it starts suspended)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      // 3. Setup Recorder
      // Try to find a supported mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        '' // Default
      ];
      const supportedType = mimeTypes.find(type => type === '' || MediaRecorder.isTypeSupported(type));
      
      const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
      };

      mediaRecorderRef.current = recorder;

      // 4. Start Visualizer
      drawVisualizer();
      setStatus('ACTIVE');

    } catch (err: any) {
      console.error("Mic Error:", err);
      let msg = "Không thể khởi động Microphone.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Quyền truy cập Microphone bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt (biểu tượng ổ khóa trên thanh địa chỉ).";
      } else if (err.name === 'NotFoundError') {
        msg = "Không tìm thấy thiết bị Microphone.";
      } else {
        msg = err.message || msg;
      }
      setErrorMessage(msg);
      setStatus('ERROR');
      stopAll(); // Ensure clean state
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#111827'; // BG Color
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for(let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        // Dynamic Color
        const r = barHeight + 25 * (i/bufferLength);
        const g = 250 * (i/bufferLength);
        const b = 50;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        // Scale height to fit
        const h = (barHeight / 255) * canvas.height;
        ctx.fillRect(x, canvas.height - h, barWidth, h);

        x += barWidth + 1;
      }
    };
    draw();
  };

  const handleToggleRecord = () => {
    if (!mediaRecorderRef.current) return;

    if (status === 'RECORDING') {
      mediaRecorderRef.current.stop();
      setStatus('ACTIVE');
    } else {
      chunksRef.current = [];
      setAudioBlobUrl(null);
      mediaRecorderRef.current.start();
      setStatus('RECORDING');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6">
      <h2 className="text-2xl font-bold text-green-400 mb-2">Test Microphone</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-lg text-center">
        Đảm bảo trình duyệt được cấp quyền truy cập Microphone. Nhấn nút bên dưới để bắt đầu.
      </p>

      {/* ERROR MESSAGE */}
      {status === 'ERROR' && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6 max-w-lg flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-bold">Lỗi khởi động Mic:</h3>
            <p className="text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* DEVICE INFO - Shows ONLY when active */}
      {status !== 'IDLE' && status !== 'ERROR' && deviceName && (
          <div className="bg-gray-800 border border-gray-600 px-4 py-2 rounded-lg mb-4 flex items-center gap-2 animate-fade-in-up">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-300 font-bold text-sm">Thiết bị: <span className="text-white">{deviceName}</span></span>
          </div>
      )}

      {/* VISUALIZER */}
      <div className="relative w-full max-w-3xl h-64 bg-gray-900 rounded-xl border border-gray-700 shadow-inner overflow-hidden mb-6 flex items-center justify-center">
        {status === 'IDLE' || status === 'ERROR' ? (
           <div className="text-gray-600 flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>Sẵn sàng test</span>
           </div>
        ) : (
           <canvas ref={canvasRef} width={800} height={256} className="w-full h-full" />
        )}

        {status === 'REQUESTING' && (
           <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white z-10">
              <div className="flex items-center gap-3">
                 <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                 Đang yêu cầu quyền truy cập...
              </div>
           </div>
        )}
      </div>

      {/* CONTROLS */}
      <div className="flex flex-wrap justify-center gap-4">
        {(status === 'IDLE' || status === 'ERROR') ? (
           <button 
             onClick={initMic}
             className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-transform hover:scale-105 active:scale-95"
           >
             Cho phép & Bắt đầu Test
           </button>
        ) : (
           <>
             {/* STOP BUTTON */}
             <button 
               onClick={stopAll}
               className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg border border-gray-600"
             >
               Tắt Microphone
             </button>

             {/* RECORD BUTTON */}
             <button 
               onClick={handleToggleRecord}
               className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
                 status === 'RECORDING' 
                   ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                   : 'bg-green-600 hover:bg-green-700 text-white'
               }`}
             >
               {status === 'RECORDING' ? (
                 <>
                   <div className="w-3 h-3 bg-white rounded-sm"></div>
                   Dừng Ghi Âm
                 </>
               ) : (
                 <>
                   <div className="w-3 h-3 bg-red-100 rounded-full"></div>
                   Ghi Âm Thử
                 </>
               )}
             </button>
           </>
        )}
      </div>

      {/* PLAYBACK */}
      {audioBlobUrl && (
        <div className="mt-8 bg-gray-800 p-4 rounded-xl border border-gray-600 w-full max-w-md animate-[fadeIn_0.5s_ease-out]">
           <h3 className="text-green-400 font-bold mb-2 text-sm uppercase tracking-wider">Kết quả Ghi âm</h3>
           <audio controls src={audioBlobUrl} className="w-full mb-2" />
           <div className="text-right">
              <a href={audioBlobUrl} download="test-mic.webm" className="text-xs text-blue-400 hover:text-blue-300 hover:underline">
                 Tải file ghi âm
              </a>
           </div>
        </div>
      )}
      
      {/* GUIDE */}
      {status === 'ACTIVE' && !audioBlobUrl && (
        <p className="mt-4 text-xs text-gray-500 animate-pulse">
           Microphone đang hoạt động. Hãy nói để kiểm tra sóng âm.
        </p>
      )}
    </div>
  );
};