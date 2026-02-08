import React, { useState } from 'react';
import { Tab } from './types';
import { KeyboardTester } from './components/KeyboardTester';
import { MouseTester } from './components/MouseTester';
import { ScreenTester } from './components/ScreenTester';
import { AudioTester } from './components/AudioTester';
import { MicTester } from './components/MicTester';
import { WebcamTester } from './components/WebcamTester';
import { DiagnosticAssistant } from './components/DiagnosticAssistant';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.KEYBOARD);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.KEYBOARD: return <KeyboardTester />;
      case Tab.MOUSE: return <MouseTester />;
      case Tab.SCREEN: return <ScreenTester />;
      case Tab.AUDIO: return <AudioTester />;
      case Tab.MIC: return <MicTester />;
      case Tab.WEBCAM: return <WebcamTester />;
      case Tab.AI_DIAGNOSTIC: return <DiagnosticAssistant />;
      default: return <KeyboardTester />;
    }
  };

  const NavButton = ({ tab, label, icon }: { tab: Tab, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-3 w-full text-left transition-colors duration-200 ${
        activeTab === tab 
          ? 'bg-gray-800 text-green-400 border-l-4 border-green-500' 
          : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
      }`}
    >
      {icon}
      <span className="font-medium hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-16 md:w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-4 md:p-6 border-b border-gray-800 flex items-center justify-center">
          <div className="bg-white rounded-lg p-3 w-full flex items-center justify-center shadow-lg">
             {/* Logo STAR TINHOCNGOISAO drawn with SVG to ensure no broken images */}
             <svg viewBox="0 0 260 85" className="w-full h-auto max-h-12" xmlns="http://www.w3.org/2000/svg">
                {/* S */}
                <text x="10" y="60" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="55" fill="black">S</text>
                {/* T */}
                <text x="50" y="60" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="55" fill="black">T</text>
                
                {/* Star Shape replacing 'A' - Red */}
                <path d="M125 5 L135 38 L170 38 L142 58 L152 90 L125 70 L98 90 L108 58 L80 38 L115 38 Z" fill="#DC2626" transform="translate(0, -5) scale(0.9)"/>
                
                {/* R */}
                <text x="160" y="60" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="55" fill="black">R</text>

                {/* Subtext */}
                <text x="130" y="82" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="13" fill="black" textAnchor="middle" letterSpacing="0.5">TINHOCNGOISAO.COM</text>
             </svg>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <NavButton 
            tab={Tab.KEYBOARD} 
            label="Bàn Phím" 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>}
          />
          <NavButton 
            tab={Tab.MOUSE} 
            label="Chuột" 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>}
          />
          <NavButton 
            tab={Tab.SCREEN} 
            label="Màn Hình" 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
          />
          <NavButton 
            tab={Tab.AUDIO} 
            label="Loa" 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>}
          />
          <NavButton 
            tab={Tab.MIC} 
            label="Microphone" 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
          />
          <NavButton 
            tab={Tab.WEBCAM} 
            label="Webcam" 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
          />
           <NavButton 
            tab={Tab.AI_DIAGNOSTIC} 
            label="AI Chẩn Đoán" 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
        </nav>
        
        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
           v1.1.2
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;