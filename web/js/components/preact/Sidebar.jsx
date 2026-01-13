/**
 * Enterprise Sidebar Component
 */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export function Sidebar({ activeNav = 'nav-live' }) {
    const [username, setUsername] = useState('Admin');

    useEffect(() => {
        const auth = localStorage.getItem('auth');
        if (auth) {
            try {
                const decoded = atob(auth);
                setUsername(decoded.split(':')[0]);
            } catch (e) {
                console.error('Error decoding auth token:', e);
            }
        }
    }, []);

    const navItems = [
        {
            id: 'nav-live', href: 'index.html', label: 'Dashboard', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            )
        },
        {
            id: 'nav-playback', href: 'timeline.html', label: 'Control Room', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },

        {
            id: 'nav-streams', href: 'streams.html', label: 'Node Management', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
            )
        },
        {
            id: 'nav-settings', href: 'settings.html', label: 'System Config', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        },
    ];

    return (
        <div className="flex flex-col h-screen w-64 bg-[#080c14] border-r border-[#1a1c24] text-gray-300">
            <div className="p-6">
                <div className="flex items-center space-x-3 mb-10">
                    <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/40">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M2.166 4.9L10 1.554 17.834 4.9c.45.19.73.63.73 1.11v3.305a12.01 12.01 0 01-2.478 7.234l-.004.004-3.13 3.913a1.002 1.002 0 01-1.55l-3.385-4.23a12.008 12.008 0 01-2.477-7.24V6.01c0-.479.28-.92.729-1.11zM10 3.054L3.896 5.67V9.31c0 2.278.8 4.417 2.254 6.136L10 19.82l3.85-4.373a10.008 10.008 0 002.254-6.136V5.67L10 3.054z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="font-black text-white tracking-tighter text-xl leading-none">PRO NVR</h1>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">Enterprise v1.0</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <a
                            key={item.id}
                            href={item.href}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeNav === item.id
                                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                : 'hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className={`${activeNav === item.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                {item.icon}
                            </span>
                            <span className="font-semibold text-sm">{item.label}</span>
                            {activeNav === item.id && (
                                <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                            )}
                        </a>
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-4">
                <div className="bg-[#111827] rounded-2xl p-4 border border-[#1f2937]">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-xs font-bold text-white uppercase shadow-lg shadow-blue-900/20">
                            {username.substring(0, 2)}
                        </div>
                        <div>
                            <p className="font-bold text-sm text-white">{username}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Superuser</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.href = '/logout'}
                        className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[#1f2937] hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 text-xs font-bold text-gray-400 border border-transparent hover:border-red-500/20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
