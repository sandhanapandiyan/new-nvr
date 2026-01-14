/**
 * On-Screen Keyboard Component
 * Perfect for touchscreen kiosk mode on Raspberry Pi
 */

import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

const KEYBOARD_LAYOUTS = {
    lowercase: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
        ['123', 'space', '.', '@', 'enter']
    ],
    uppercase: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'backspace'],
        ['123', 'space', '.', '@', 'enter']
    ],
    numbers: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
        ['.', ',', '?', '!', '\'', '#', '%', '+', '='],
        ['shift', '*', '_', '<', '>', '[', ']', '{', '}', 'backspace'],
        ['ABC', 'space', '.', '@', 'enter']
    ]
};

export function OnScreenKeyboard() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeInput, setActiveInput] = useState(null);
    const [layout, setLayout] = useState('lowercase');
    const [capsLock, setCapsLock] = useState(false);
    const keyboardRef = useRef(null);

    useEffect(() => {
        // Track focused input elements
        const handleFocus = (e) => {
            if (e.target.matches('input[type="text"], input[type="password"], input[type="email"], input[type="url"], input[type="search"], textarea')) {
                setActiveInput(e.target);
            }
        };

        const handleBlur = (e) => {
            // Don't close keyboard if clicking on keyboard itself
            if (keyboardRef.current && keyboardRef.current.contains(e.relatedTarget)) {
                return;
            }
        };

        document.addEventListener('focusin', handleFocus);
        document.addEventListener('focusout', handleBlur);

        return () => {
            document.removeEventListener('focusin', handleFocus);
            document.removeEventListener('focusout', handleBlur);
        };
    }, []);

    const handleKeyPress = (key) => {
        if (!activeInput) return;

        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const value = activeInput.value;

        switch (key) {
            case 'backspace':
                if (start > 0) {
                    activeInput.value = value.substring(0, start - 1) + value.substring(end);
                    activeInput.selectionStart = activeInput.selectionEnd = start - 1;
                }
                break;

            case 'enter':
                if (activeInput.form) {
                    activeInput.form.dispatchEvent(new Event('submit', { cancelable: true }));
                }
                setIsOpen(false);
                break;

            case 'shift':
                if (layout === 'lowercase') {
                    setLayout('uppercase');
                } else if (layout === 'uppercase') {
                    setLayout('lowercase');
                }
                break;

            case '123':
                setLayout('numbers');
                break;

            case 'ABC':
                setLayout(capsLock ? 'uppercase' : 'lowercase');
                break;

            case 'space':
                activeInput.value = value.substring(0, start) + ' ' + value.substring(end);
                activeInput.selectionStart = activeInput.selectionEnd = start + 1;
                break;

            default:
                activeInput.value = value.substring(0, start) + key + value.substring(end);
                activeInput.selectionStart = activeInput.selectionEnd = start + 1;

                // Auto-switch back to lowercase after typing one uppercase letter
                if (layout === 'uppercase' && !capsLock) {
                    setLayout('lowercase');
                }
                break;
        }

        // Trigger input event for React/Preact
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const getKeyClass = (key) => {
        const baseClass = 'keyboard-key transition-all duration-150 active:scale-95';

        switch (key) {
            case 'space':
                return `${baseClass} col-span-6 bg-gray-600 hover:bg-gray-500`;
            case 'enter':
                return `${baseClass} col-span-2 bg-blue-600 hover:bg-blue-500 font-bold`;
            case 'backspace':
                return `${baseClass} col-span-2 bg-red-600 hover:bg-red-500`;
            case 'shift':
                return `${baseClass} col-span-2 ${layout === 'uppercase' ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-gray-600`;
            case '123':
            case 'ABC':
                return `${baseClass} col-span-2 bg-gray-700 hover:bg-gray-600`;
            default:
                return `${baseClass} bg-gray-800 hover:bg-gray-700`;
        }
    };

    const getKeyLabel = (key) => {
        switch (key) {
            case 'backspace':
                return '⌫';
            case 'enter':
                return '↵';
            case 'shift':
                return '⇧';
            case 'space':
                return 'Space';
            default:
                return key;
        }
    };

    return (
        <>
            {/* Floating Keyboard Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          fixed bottom-6 right-6 z-[9998]
          w-14 h-14 rounded-full
          ${isOpen ? 'bg-blue-600' : 'bg-gray-800'}
          hover:bg-blue-500
          shadow-2xl
          flex items-center justify-center
          transition-all duration-300
          border-2 border-white/20
          ${isOpen ? 'rotate-180' : ''}
        `}
                title={isOpen ? 'Close Keyboard' : 'Open Keyboard'}
            >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            </button>

            {/* On-Screen Keyboard */}
            {isOpen && (
                <div
                    ref={keyboardRef}
                    className="fixed bottom-0 left-0 right-0 z-[9997] bg-gradient-to-t from-gray-900 to-gray-800 p-4 shadow-2xl border-t-2 border-white/10 animate-slide-up"
                    style={{ maxHeight: '45vh' }}
                >
                    {/* Keyboard Header */}
                    <div className="flex items-center justify-between mb-3 px-2">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">On-Screen Keyboard</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Keys */}
                    <div className="space-y-2">
                        {KEYBOARD_LAYOUTS[layout].map((row, rowIndex) => (
                            <div key={rowIndex} className="grid grid-cols-10 gap-1.5">
                                {row.map((key, keyIndex) => (
                                    <button
                                        key={`${rowIndex}-${keyIndex}`}
                                        onClick={() => handleKeyPress(key)}
                                        className={`
                      ${getKeyClass(key)}
                      text-white font-semibold
                      rounded-lg py-3 px-2
                      text-sm
                      shadow-lg
                      select-none
                      touch-manipulation
                    `}
                                    >
                                        {getKeyLabel(key)}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Active Input Indicator */}
                    {activeInput && (
                        <div className="mt-3 px-2 py-2 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-xs text-gray-400 mb-1">Typing in:</div>
                            <div className="text-sm text-white font-mono truncate">
                                {activeInput.placeholder || activeInput.name || 'Input Field'}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Custom CSS for animations */}
            <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .keyboard-key:active {
          transform: scale(0.95);
        }
        /* Prevent text selection on keyboard */
        .keyboard-key {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>
        </>
    );
}
