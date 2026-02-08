import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const DiagnosticAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Xin chào! Tôi là trợ lý AI phần cứng. Bạn đang gặp vấn đề gì với thiết bị của mình? (Ví dụ: Màn hình bị điểm chết, bàn phím bị kẹt phím Space...)' }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
            systemInstruction: "Bạn là một chuyên gia kỹ thuật máy tính chuyên nghiệp, thân thiện và nói tiếng Việt. Nhiệm vụ của bạn là giúp người dùng chẩn đoán lỗi phần cứng (bàn phím, chuột, màn hình, loa, mic) và đưa ra giải pháp khắc phục. Hãy trả lời ngắn gọn, súc tích và dễ hiểu. Nếu lỗi có vẻ nghiêm trọng, hãy khuyên họ mang ra tiệm sửa chữa uy tín."
        }
      });

      const text = response.text || "Xin lỗi, tôi không thể phản hồi ngay lúc này.";
      
      setMessages(prev => [...prev, { role: 'model', text }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Đã xảy ra lỗi khi kết nối với AI. Vui lòng kiểm tra lại API Key hoặc thử lại sau." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex-none mb-4">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            AI Chẩn Đoán Lỗi (Beta)
        </h2>
        <p className="text-gray-400 text-sm">Sử dụng Gemini 2.5 Flash để tư vấn sửa chữa.</p>
      </div>

      <div className="flex-grow bg-gray-900 rounded-xl border border-gray-700 p-4 overflow-y-auto mb-4 space-y-4 shadow-inner">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] p-3 rounded-lg text-sm md:text-base leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-gray-800 p-3 rounded-lg rounded-bl-none border border-gray-700 flex gap-2 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
             </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="flex-none flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mô tả lỗi của bạn (VD: Chuột bị double click, Màn hình bị sọc...)"
          className="flex-grow bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition-colors"
        >
          Gửi
        </button>
      </div>
    </div>
  );
};
