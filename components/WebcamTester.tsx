import React, { useState, useRef, useEffect, useCallback } from 'react';

export const WebcamTester: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{ width: number; height: number; label: string } | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setVideoInfo(null);
  }, []);

  const startCamera = async () => {
    setError(null);
    setSnapshot(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsActive(true);

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      // Wait a bit for video to start to get correct dimensions usually, 
      // but settings often have it immediately if constraint satisfied
      setVideoInfo({
        width: settings.width || 0,
        height: settings.height || 0,
        label: track.label || 'Camera'
      });

    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Quyền truy cập Camera bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt (biểu tượng ổ khóa trên thanh địa chỉ).");
      } else if (err.name === 'NotFoundError') {
        setError("Không tìm thấy thiết bị Camera nào.");
      } else if (err.name === 'NotReadableError') {
         setError("Camera đang được sử dụng bởi ứng dụng khác hoặc bị lỗi.");
      } else {
        setError("Không thể khởi động Camera: " + (err.message || "Lỗi không xác định"));
      }
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !isActive) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw mirror image to match video feed
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0);
      
      setSnapshot(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="flex flex-col items-center w-full h-full p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-green-400 mb-6">Test Webcam</h2>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-6 max-w-lg text-center shadow-lg">
          <p className="font-bold flex items-center justify-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
             </svg>
             Lỗi:
          </p> 
          <span className="text-sm mt-1 block">{error}</span>
        </div>
      )}

      {/* Device Info Bar */}
      {isActive && videoInfo && (
          <div className="w-full max-w-4xl bg-gray-800 border-l-4 border-green-500 rounded-r-lg p-4 mb-4 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                  <div className="bg-gray-700 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                      <div className="text-xs text-gray-400 font-bold uppercase">Thiết Bị Đang Dùng</div>
                      <div className="text-white font-bold text-lg">{videoInfo.label}</div>
                  </div>
              </div>
              <div className="flex gap-4 text-sm font-mono text-gray-300 bg-gray-900/50 px-3 py-1 rounded">
                  <span>Res: {videoInfo.width}x{videoInfo.height}</span>
                  <span>|</span>
                  <span>Format: MJPEG/YUV</span>
              </div>
          </div>
      )}

      {/* Video Container */}
      <div className="relative w-full max-w-4xl bg-black rounded-xl border-2 border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden mb-8 aspect-video flex items-center justify-center group">
        {!isActive ? (
           <div className="text-gray-600 flex flex-col items-center p-4 text-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
             </svg>
             <p className="text-lg">Nhấn "Bật Camera" để bắt đầu kiểm tra</p>
             <p className="text-sm text-gray-700 mt-2">Dữ liệu camera được xử lý trực tiếp trên trình duyệt của bạn.</p>
           </div>
        ) : (
           <video 
             ref={videoRef} 
             autoPlay 
             playsInline 
             muted 
             className="w-full h-full object-contain transform scale-x-[-1]" // Mirror effect
           />
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-4 flex-wrap justify-center mb-10">
        {!isActive ? (
          <button 
            onClick={startCamera}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105 hover:shadow-blue-500/30"
          >
            Bật Camera
          </button>
        ) : (
          <>
            <button 
               onClick={takeSnapshot}
               className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
               </svg>
               Chụp Ảnh Thử
            </button>
            <button 
               onClick={stopCamera}
               className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg border border-gray-600 transition-colors"
            >
               Tắt Camera
            </button>
          </>
        )}
      </div>

      {/* Snapshot Result */}
      {snapshot && (
        <div className="w-full max-w-4xl animate-[fadeIn_0.5s_ease-out]">
           <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-white font-bold text-lg">Kết quả Chụp Thử</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="rounded-lg border-2 border-gray-700 shadow-xl overflow-hidden bg-black">
                 <img src={snapshot} alt="Webcam Snapshot" className="w-full h-auto block" />
              </div>
              
              <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-sm text-gray-400 shadow-lg">
                 <h4 className="text-white font-bold mb-2 text-base">Ảnh đã chụp thành công!</h4>
                 <p className="mb-4 leading-relaxed">
                   Nếu ảnh trông rõ nét và màu sắc chính xác, webcam của bạn đang hoạt động tốt.
                   Ảnh này chỉ được lưu tạm thời trên trình duyệt của bạn.
                 </p>
                 <a 
                   href={snapshot} 
                   download={`webcam-test-${new Date().toISOString().slice(0,10)}.jpg`}
                   className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded border border-gray-700 transition-colors font-medium hover:text-blue-300"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                   </svg>
                   Tải Ảnh Về Máy
                 </a>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};