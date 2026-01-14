/**
 * Enterprise Main Layout Component
 */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Sidebar } from './Sidebar.jsx';
import { NotificationSystem } from './NotificationSystem.jsx';
import { OnScreenKeyboard } from './OnScreenKeyboard.jsx';

export function MainLayout({ children, activeNav, title, subtitle }) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex h-screen w-full bg-[#03070c] text-slate-200 overflow-hidden font-sans">
            <Sidebar activeNav={activeNav} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Navigation Bar */}
                <header className="h-20 flex items-center justify-between px-10 border-b border-white/5 bg-[#03070c]/50 backdrop-blur-md z-10">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
                        {subtitle && (
                            <div className="flex items-center space-x-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{subtitle}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-6 text-gray-500">
                        <div className="flex flex-col items-end">
                            <p className="text-[10px] font-black uppercase tracking-widest">Node: RPI-NODE-01</p>
                            <p className="text-sm font-mono text-blue-400 font-bold tracking-tighter tabular-nums">
                                {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        </div>

                        <div className="flex space-x-2">
                            <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </button>
                            <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5-5M4 16v4m0 0h4m-4 4l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-10 scrollbar-hide">
                    {children}
                </main>
            </div>

            {/* Global Notification System */}
            <NotificationSystem />

            {/* On-Screen Keyboard for Touchscreen */}
            <OnScreenKeyboard />
        </div>
    );
}
