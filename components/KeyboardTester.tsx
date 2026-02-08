import React, { useEffect, useState, useCallback } from 'react';

// === DATA DEFINITIONS ===

// Row 0: F-Keys
const ROW_ESC_F = [
  { code: 'Escape', label: 'ESC', w: 'w-12', mr: 'mr-8' },
  { code: 'F1', label: 'F1', w: 'w-12' }, { code: 'F2', label: 'F2', w: 'w-12' }, { code: 'F3', label: 'F3', w: 'w-12' }, { code: 'F4', label: 'F4', w: 'w-12', mr: 'mr-4' },
  { code: 'F5', label: 'F5', w: 'w-12' }, { code: 'F6', label: 'F6', w: 'w-12' }, { code: 'F7', label: 'F7', w: 'w-12' }, { code: 'F8', label: 'F8', w: 'w-12', mr: 'mr-4' },
  { code: 'F9', label: 'F9', w: 'w-12' }, { code: 'F10', label: 'F10', w: 'w-12' }, { code: 'F11', label: 'F11', w: 'w-12' }, { code: 'F12', label: 'F12', w: 'w-12' }
];

// Main Block
const MAIN_BLOCK = [
  // Row 1
  [
    { code: 'Backquote', label: '`' }, { code: 'Digit1', label: '1' }, { code: 'Digit2', label: '2' }, { code: 'Digit3', label: '3' }, { code: 'Digit4', label: '4' },
    { code: 'Digit5', label: '5' }, { code: 'Digit6', label: '6' }, { code: 'Digit7', label: '7' }, { code: 'Digit8', label: '8' }, { code: 'Digit9', label: '9' },
    { code: 'Digit0', label: '0' }, { code: 'Minus', label: '-' }, { code: 'Equal', label: '=' }, { code: 'Backspace', label: 'Backspace', w: 'w-20' }
  ],
  // Row 2
  [
    { code: 'Tab', label: 'Tab', w: 'w-14' }, { code: 'KeyQ', label: 'Q' }, { code: 'KeyW', label: 'W' }, { code: 'KeyE', label: 'E' }, { code: 'KeyR', label: 'R' },
    { code: 'KeyT', label: 'T' }, { code: 'KeyY', label: 'Y' }, { code: 'KeyU', label: 'U' }, { code: 'KeyI', label: 'I' }, { code: 'KeyO', label: 'O' },
    { code: 'KeyP', label: 'P' }, { code: 'BracketLeft', label: '[' }, { code: 'BracketRight', label: ']' }, { code: 'Backslash', label: '\\', w: 'flex-grow' }
  ],
  // Row 3
  [
    { code: 'CapsLock', label: 'Caps Lock', w: 'w-16' }, { code: 'KeyA', label: 'A' }, { code: 'KeyS', label: 'S' }, { code: 'KeyD', label: 'D' }, { code: 'KeyF', label: 'F' },
    { code: 'KeyG', label: 'G' }, { code: 'KeyH', label: 'H' }, { code: 'KeyJ', label: 'J' }, { code: 'KeyK', label: 'K' }, { code: 'KeyL', label: 'L' },
    { code: 'Semicolon', label: ';' }, { code: 'Quote', label: "'" }, { code: 'Enter', label: 'Enter', w: 'flex-grow' }
  ],
  // Row 4
  [
    { code: 'ShiftLeft', label: 'Shift', w: 'w-24' }, { code: 'KeyZ', label: 'Z' }, { code: 'KeyX', label: 'X' }, { code: 'KeyC', label: 'C' }, { code: 'KeyV', label: 'V' },
    { code: 'KeyB', label: 'B' }, { code: 'KeyN', label: 'N' }, { code: 'KeyM', label: 'M' }, { code: 'Comma', label: ',' }, { code: 'Period', label: '.' },
    { code: 'Slash', label: '/' }, { code: 'ShiftRight', label: 'Shift', w: 'flex-grow' }
  ],
  // Row 5
  [
    { code: 'ControlLeft', label: 'Ctrl', w: 'w-16' }, { code: 'MetaLeft', label: 'Win', w: 'w-12' }, { code: 'AltLeft', label: 'Alt', w: 'w-12' },
    { code: 'Space', label: 'Space', w: 'w-64' },
    { code: 'AltRight', label: 'Alt', w: 'w-12' }, { code: 'MetaRight', label: 'Win', w: 'w-12' }, { code: 'ContextMenu', label: 'Menu', w: 'w-12' }, { code: 'ControlRight', label: 'Ctrl', w: 'w-16' }
  ]
];

// Navigation Block
const NAV_BLOCK_TOP = [
  { code: 'PrintScreen', label: 'PrtSc' }, { code: 'ScrollLock', label: 'ScrLk' }, { code: 'Pause', label: 'Pause' }
];
const NAV_BLOCK_MID = [
  [{ code: 'Insert', label: 'Ins' }, { code: 'Home', label: 'Home' }, { code: 'PageUp', label: 'PgUp' }],
  [{ code: 'Delete', label: 'Del' }, { code: 'End', label: 'End' }, { code: 'PageDown', label: 'PgDn' }]
];
const ARROW_BLOCK = [
  { code: 'ArrowUp', label: '↑' },
  { code: 'ArrowLeft', label: '←' }, { code: 'ArrowDown', label: '↓' }, { code: 'ArrowRight', label: '→' }
];

// Numpad Block
const NUMPAD_BLOCK = [
  [{ code: 'NumLock', label: 'Num' }, { code: 'NumpadDivide', label: '/' }, { code: 'NumpadMultiply', label: '*' }, { code: 'NumpadSubtract', label: '-' }],
  [{ code: 'Numpad7', label: '7' }, { code: 'Numpad8', label: '8' }, { code: 'Numpad9', label: '9' }, { code: 'NumpadAdd', label: '+', h: 'h-24' }], // + is tall
  [{ code: 'Numpad4', label: '4' }, { code: 'Numpad5', label: '5' }, { code: 'Numpad6', label: '6' }],
  [{ code: 'Numpad1', label: '1' }, { code: 'Numpad2', label: '2' }, { code: 'Numpad3', label: '3' }, { code: 'NumpadEnter', label: 'Ent', h: 'h-24' }], // Enter is tall
  [{ code: 'Numpad0', label: '0', w: 'w-[6.2rem]' }, { code: 'NumpadDecimal', label: '.' }]
];

export const KeyboardTester: React.FC = () => {
  const [testedKeys, setTestedKeys] = useState<Set<string>>(new Set());
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [lastKey, setLastKey] = useState<string>('');

  // System info
  const language = navigator.language.toUpperCase();
  const platform = navigator.platform;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    setLastKey(e.code);
    setActiveKeys(prev => {
      const next = new Set(prev);
      next.add(e.code);
      return next;
    });
    setTestedKeys(prev => {
      const next = new Set(prev);
      next.add(e.code);
      return next;
    });
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    setActiveKeys(prev => {
      const next = new Set(prev);
      next.delete(e.code);
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const resetTest = () => {
    setTestedKeys(new Set());
    setLastKey('');
  };

  const renderKey = (key: { code: string; label: string; w?: string; mr?: string; h?: string }, defaultW = 'w-12') => {
    const isPressed = activeKeys.has(key.code);
    const isTested = testedKeys.has(key.code);
    
    let bgClass = "bg-gray-800";
    if (isPressed) bgClass = "bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.8)] transform scale-95 border-green-400";
    else if (isTested) bgClass = "bg-green-900/40 text-green-200 border-green-800/50";

    const widthClass = key.w || defaultW;
    const heightClass = key.h || 'h-12';
    const marginClass = key.mr || '';

    return (
      <div
        key={key.code}
        className={`${widthClass} ${heightClass} ${marginClass} m-0.5 rounded flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-75 border border-gray-700 select-none ${bgClass}`}
        title={key.code}
      >
        {key.label}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-start p-2 sm:p-6 w-full h-full overflow-auto bg-[#0b0f19]">
      {/* Header Info */}
      <div className="mb-6 text-center w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
        <div className="text-left">
          <h2 className="text-2xl font-bold text-green-400">Test Bàn Phím Full Size</h2>
          <div className="text-gray-400 text-xs mt-1 flex gap-3">
             <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-700">Lang: {language}</span>
             <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-700">OS: {platform}</span>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="px-4 py-2 bg-black/40 rounded-lg border border-gray-700 min-w-[200px] text-center">
            Key Code: <span className="text-green-400 font-mono font-bold text-lg">{lastKey || 'Waiting...'}</span>
          </div>
          <button 
            onClick={resetTest}
            className="px-6 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors border border-red-500"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Keyboard Container */}
      <div className="inline-block p-4 bg-[#161b27] rounded-xl border border-gray-700/50 shadow-2xl overflow-x-auto max-w-full">
        <div className="flex gap-4 min-w-[1000px]">
          
          {/* LEFT: Main Block & F-Keys */}
          <div className="flex flex-col gap-4">
             {/* F-Key Row */}
             <div className="flex mb-2">
               {ROW_ESC_F.map(k => renderKey(k))}
             </div>
             {/* Main Alphanumeric Block */}
             <div className="flex flex-col">
               {MAIN_BLOCK.map((row, i) => (
                 <div key={i} className="flex">
                   {row.map(k => renderKey(k))}
                 </div>
               ))}
             </div>
          </div>

          {/* MIDDLE: Navigation & Arrows */}
          <div className="flex flex-col justify-between w-[160px]">
             {/* PrtSc/Scroll/Pause */}
             <div className="flex justify-between mb-2">
                {NAV_BLOCK_TOP.map(k => renderKey(k, 'w-12'))}
             </div>
             
             {/* Ins/Home/PgUp etc */}
             <div className="flex flex-col gap-1 mt-2">
                {NAV_BLOCK_MID.map((row, i) => (
                  <div key={i} className="flex justify-between">
                     {row.map(k => renderKey(k, 'w-12'))}
                  </div>
                ))}
             </div>

             {/* Arrow Keys */}
             <div className="flex flex-col items-center mt-8">
                <div className="mb-1">{renderKey(ARROW_BLOCK[0], 'w-12')}</div> {/* Up */}
                <div className="flex gap-1">
                   {renderKey(ARROW_BLOCK[1], 'w-12')}
                   {renderKey(ARROW_BLOCK[2], 'w-12')}
                   {renderKey(ARROW_BLOCK[3], 'w-12')}
                </div>
             </div>
          </div>

          {/* RIGHT: Numpad */}
          <div className="flex flex-col ml-2">
             <div className="mb-2 invisible h-12">Placeholder for alignment</div> {/* Spacer to align with F-Keys if needed, or just let it sit */}
             
             <div className="grid grid-cols-4 gap-1">
                {/* Row 1 */}
                {renderKey(NUMPAD_BLOCK[0][0])} {renderKey(NUMPAD_BLOCK[0][1])} {renderKey(NUMPAD_BLOCK[0][2])} {renderKey(NUMPAD_BLOCK[0][3])}
                
                {/* Row 2 */}
                {renderKey(NUMPAD_BLOCK[1][0])} {renderKey(NUMPAD_BLOCK[1][1])} {renderKey(NUMPAD_BLOCK[1][2])} 
                <div className="row-span-2">{renderKey(NUMPAD_BLOCK[1][3])}</div> {/* Plus spans 2 rows */}

                {/* Row 3 */}
                {renderKey(NUMPAD_BLOCK[2][0])} {renderKey(NUMPAD_BLOCK[2][1])} {renderKey(NUMPAD_BLOCK[2][2])}

                {/* Row 4 */}
                {renderKey(NUMPAD_BLOCK[3][0])} {renderKey(NUMPAD_BLOCK[3][1])} {renderKey(NUMPAD_BLOCK[3][2])} 
                <div className="row-span-2">{renderKey(NUMPAD_BLOCK[3][3])}</div> {/* Enter spans 2 rows */}

                {/* Row 5 */}
                <div className="col-span-2">{renderKey(NUMPAD_BLOCK[4][0], 'w-[6.2rem]')}</div>
                {renderKey(NUMPAD_BLOCK[4][1])}
             </div>
          </div>

        </div>
      </div>
      
      <div className="mt-8 text-gray-500 text-sm">
        <p>Lưu ý: Tên bàn phím cụ thể không được trình duyệt cung cấp vì lý do bảo mật.</p>
      </div>
    </div>
  );
};