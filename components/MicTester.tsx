import React, { useState, useEffect, useRef } from 'react';

export const MicTester: React.FC = () => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [volume, setVolume] = useState(0);
  const [isListening, setIsListening] = useState(false); // Mode "Listen to this device"
  const [error, setError] = useState<string>('');

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Cleanup function
  const stopResources = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
        sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopResources();
      audioContextRef.current?.close();
    };
  }, []);

  // 1. Get Permission & Enumerate Devices
  const requestAccess = async () => {
    try {
      setError('');
      // Request initial access to get labels
      // Note: We don't keep this stream because we want to request specific constraints later
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      
      setPermissionGranted(true);
      await refreshDeviceList();
    } catch (err: any) {
      console.error(err);
      handleError(err);
    }
  };

  const refreshDeviceList = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(d => d.kind === 'audioinput');
      setDevices(audioInputs);
      
      // Select default if not set
      if (audioInputs.length > 0 && !selectedDeviceId) {
         // Prefer 'default' or the first one
         const defaultDev = audioInputs.find(d => d.deviceId === 'default');
         const targetId = defaultDev ? defaultDev.deviceId : audioInputs[0].deviceId;
         // Call startStream but handle error if it fails immediately
         startStream(targetId).catch(err => {
             console.error("Auto-start failed", err);
             // Don't set global error here to avoid UI flash, let user try manually selecting
         });
      }
    } catch (e) {
      console.warn("Error enumerating devices", e);
    }
  };

  // 2. Start Processing Audio Stream
  const startStream = async (deviceId: string) => {
    stopResources(); // Stop previous stream
    setSelectedDeviceId(deviceId);
    setError('');

    try {
      let stream: MediaStream;
      
      try {
          // Attempt 1: Try with raw audio constraints (best for testing)
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: deviceId },
              echoCancellation: false,
              autoGainControl: false,
              noiseSuppression: false
            }
          });
      } catch (constraintErr) {
          console.warn("Raw audio constraints failed, trying default...", constraintErr);
          // Attempt 2: Fallback to basic audio constraint with deviceId
          // This handles cases where hardware/browser doesn't support disabling processing
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: deviceId }
            }
          });
      }

      streamRef.current = stream;

      // Init AudioContext safely
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const ctx = audioContextRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      // Start Measuring Volume loop
      measureVolume();

    } catch (err: any) {
      handleError(err);
    }
  };

  const handleError = (err: any) => {
      let msg = "Không thể truy cập Microphone.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = "Quyền truy cập bị từ chối (Permission denied). Vui lòng kiểm tra biểu tượng ổ khóa 🔒 trên thanh địa chỉ và chọn 'Allow' hoặc 'Reset permission'.";
      } else if (err.name === 'NotFoundError') {
          msg = "Không tìm thấy thiết bị Microphone.";
      } else if (err.name === 'NotReadableError') {
          msg = "Microphone đang bị ứng dụng khác chiếm dụng hoặc gặp lỗi phần cứng.";
      } else if (err.name === 'OverconstrainedError') {
          msg = "Thiết bị không hỗ trợ các cài đặt yêu cầu.";
      } else {
          msg = `Lỗi: ${err.message}`;
      }
      setError(msg);
  };

  // 3. Measure Volume (RMS)
  const measureVolume = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // Normalize to 0-100 range
    const vol = Math.min(100, Math.round((average / 100) * 100 * 1.5)); // 1.5x boost for visibility

    setVolume(vol);
    rafRef.current = requestAnimationFrame(measureVolume);
  };

  // 4. Handle "Listen to this device" toggle
  const toggleListen = () => {
    if (!sourceRef.current || !audioContextRef.current) return;

    if (isListening) {
      sourceRef.current.disconnect();
      if (analyserRef.current) sourceRef.current.connect(analyserRef.current);
      setIsListening(false);
    } else {
      sourceRef.current.connect(audioContextRef.current.destination);
      setIsListening(true);
    }
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    if (isListening) toggleListen(); 
    startStream(newId);
  };

  return (
    <div className="flex flex-col items-center justify-start w-full h-full p-6 max-w-3xl mx-auto overflow-y-auto">
      <h2 className="text-2xl font-bold text-green-400 mb-6">Test Microphone (Chế độ Windows)</h2>

      {/* ERROR */}
      {error && (
        <div className="w-full bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6 flex items-start gap-3 animate-pulse">
           <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           <div>
               <p className="font-bold">Đã xảy ra lỗi:</p>
               <p>{error}</p>
           </div>
        </div>
      )}

      {/* STEP 1: PERMISSION */}
      {!permissionGranted ? (
        <div className="text-center bg-gray-900 p-8 rounded-xl border border-gray-700 shadow-lg">
           <div className="text-6xl mb-4">🎙️</div>
           <h3 className="text-xl font-bold text-white mb-2">Yêu cầu quyền truy cập</h3>
           <p className="text-gray-400 mb-6 max-w-md mx-auto">
             Để kiểm tra microphone, trình duyệt cần bạn cho phép quyền truy cập. 
             <br/><span className="text-yellow-500 text-sm">Nếu bạn đã bấm "Allow" mà vẫn lỗi, hãy thử tải lại trang.</span>
           </p>
           <button 
             onClick={requestAccess}
             className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-transform hover:scale-105"
           >
             Cho phép Microphone
           </button>
        </div>
      ) : (
        /* STEP 2: MAIN INTERFACE */
        <div className="w-full space-y-6">
           
           {/* DEVICE SELECTION */}
           <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md">
              <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-wide">
                Chọn thiết bị đầu vào (Input Device)
              </label>
              <div className="relative">
                <select 
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  className="w-full bg-gray-900 border border-gray-600 text-white py-3 px-4 rounded-lg appearance-none focus:outline-none focus:border-blue-500"
                >
                  {devices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0,5)}...`}
                    </option>
                  ))}
                  {devices.length === 0 && <option value="">Đang tìm thiết bị...</option>}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Không thấy mic? <button onClick={requestAccess} className="text-blue-400 hover:underline">Tải lại danh sách</button> hoặc kiểm tra kết nối vật lý.
              </p>
           </div>

           {/* VOLUME METER (WINDOWS STYLE) */}
           <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-md">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                 Test Âm Lượng
                 {volume > 0 && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
              </h3>
              
              <div className="relative h-6 bg-gray-900 rounded-full overflow-hidden border border-gray-600">
                 {/* Background Grid */}
                 <div className="absolute inset-0 flex">
                    {[...Array(10)].map((_, i) => (
                       <div key={i} className="flex-1 border-r border-gray-800/50 h-full"></div>
                    ))}
                 </div>
                 
                 {/* The Bar */}
                 <div 
                   className="h-full transition-all duration-75 ease-out"
                   style={{ 
                     width: `${Math.min(100, volume)}%`,
                     backgroundColor: volume > 80 ? '#ef4444' : volume > 50 ? '#eab308' : '#3b82f6'
                   }}
                 />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
                 <span>0%</span>
                 <span>50%</span>
                 <span>100%</span>
              </div>

              <p className="text-sm text-gray-300 mt-4">
                 Hãy nói hoặc thổi vào mic. Nếu thanh màu xanh di chuyển, mic của bạn đang hoạt động.
              </p>
           </div>

           {/* LISTEN TO DEVICE */}
           <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md flex items-center justify-between">
              <div>
                 <h3 className="text-white font-bold text-lg">Nghe thiết bị này (Listen to this device)</h3>
                 <p className="text-gray-400 text-sm mt-1 max-w-sm">
                    Phát âm thanh thu được từ mic trực tiếp ra loa/tai nghe để kiểm tra chất lượng. 
                    <span className="text-yellow-500 block mt-1">⚠️ Đeo tai nghe để tránh bị hú (feedback loop)!</span>
                 </p>
              </div>
              
              <button
                onClick={toggleListen}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${isListening ? 'bg-green-500' : 'bg-gray-600'}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isListening ? 'translate-x-7' : 'translate-x-1'}`}
                />
              </button>
           </div>

        </div>
      )}
    </div>
  );
};