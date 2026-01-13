/**
 * Modern System Configuration Dashboard with HLS Live Streams
 */
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { useQuery } from '../../query-client.js';
import { MainLayout } from './MainLayout.jsx';
import { WebRTCVideoCell } from './WebRTCVideoCell.jsx';

function Gauge({ title, value, unit, color = 'blue', subtitle }) {
    const percentage = Math.min(100, Math.max(0, value));
    const strokeDasharray = `${percentage} ${100 - percentage}`;

    const colors = {
        blue: 'stroke-blue-500',
        green: 'stroke-green-500',
        red: 'stroke-red-500',
        yellow: 'stroke-yellow-500'
    };

    return (
        <div className="bg-[#0d1726]/80 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center transition-all duration-300 hover:border-white/10 group">
            <div className="relative w-32 h-32 mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-white/5" strokeWidth="3" />
                    <circle cx="18" cy="18" r="16" fill="none" className={`${colors[color]} transition-all duration-1000 ease-out`}
                        strokeWidth="3" strokeDasharray={strokeDasharray} strokeDashoffset="0" strokeLinecap="round" pathLength="100" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white">{value}{unit}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{subtitle}</span>
                </div>
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">{title}</h3>
        </div>
    );
}



export function SystemDashboard() {
    const { data: systemInfo, isLoading: systemLoading } = useQuery(
        'systemInfo',
        '/api/system/info',
        {},
        { retry: 1, refetchInterval: 5000 }
    );

    const { data: streamsResponse } = useQuery(
        'streams',
        '/api/streams',
        {},
        { retry: 1 }
    );



    // Safely extract data with fallbacks
    const cpuUsage = systemInfo?.cpu?.usage || 0;
    const memUsage = systemInfo?.memory?.total ? Math.round((systemInfo.memory.used / systemInfo.memory.total) * 100) : 0;
    const diskUsage = systemInfo?.disk?.total ? Math.round((systemInfo.disk.used / systemInfo.disk.total) * 100) : 0;
    const temperature = systemInfo?.cpu?.temperature || 0;

    // Get streams - only use /api/streams endpoint
    const allCameras = (streamsResponse?.streams || streamsResponse || []).slice(0, 4);

    return (
        <MainLayout title="System Configuration" subtitle="Dashboard" activeNav="nav-system">
            <div className="flex flex-col space-y-8">
                {/* Status Bar */}
                <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl px-6 py-4 flex-wrap gap-4">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">System Online</span>
                        </div>
                        <div className="h-4 w-[1px] bg-white/10"></div>
                        <div className="flex items-center space-x-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Encrypted</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Firmware: v{systemInfo?.version || '0.17.7'}
                        </span>
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
                            Check Updates
                        </button>
                    </div>
                </div>

                {/* Gauges Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <Gauge title="System Load" value={cpuUsage} unit="%" color="blue" subtitle="CPU" />
                    <Gauge title="Core Temp" value={Math.round(temperature)} unit="°" color={temperature > 70 ? 'red' : 'yellow'} subtitle="CELSIUS" />
                    <Gauge title="Disk Usage" value={diskUsage} unit="%" color={diskUsage > 90 ? 'red' : 'blue'} subtitle="STORAGE" />
                    <Gauge title="Memory" value={memUsage} unit="%" color="green" subtitle="RAM" />
                </div>

                {/* Live Camera Streams */}
                {allCameras.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-white">Live Camera Feeds (WebRTC)</h2>
                            <a href="/" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                View Full Dashboard →
                            </a>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                            {allCameras.map(camera => (
                                <WebRTCVideoCell
                                    key={camera.id}
                                    stream={camera}
                                    streamId={camera.name}
                                    onToggleFullscreen={(name, e, el) => {
                                        if (document.fullscreenElement) document.exitFullscreen();
                                        else el?.requestFullscreen().catch(console.error);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Intelligence & Management Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Node Intelligence */}
                    <div className="bg-[#0d1726]/60 border border-white/5 rounded-[2.5rem] p-10">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white mb-1">Node Intelligence</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hardware Acceleration</p>
                            </div>
                            <div className={`px-4 py-2 rounded-xl border ${systemInfo?.hw_accel ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${systemInfo?.hw_accel ? 'text-green-400' : 'text-blue-400'}`}>
                                    {systemInfo?.hw_accel ? 'Accelerated' : 'Active'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                { label: 'Neural Processing', val: systemInfo?.cpu?.model?.includes('aarch64') ? 'NEON Optimized' : 'CPU Enabled' },
                                { label: 'Codec support', val: 'H.264 / H.265' },
                                { label: 'Hardware Vendor', val: systemInfo?.cpu?.model || 'Generic Linux' },
                                { label: 'Uptime', val: `${Math.floor((systemInfo?.uptime || 0) / 3600)}h ${Math.floor(((systemInfo?.uptime || 0) % 3600) / 60)}m` }
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <span className="text-xs font-bold text-gray-400">{item.label}</span>
                                    <span className="text-xs font-black text-white uppercase tracking-widest">{item.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Storage Management */}
                    <div className="bg-[#0d1726]/60 border border-white/5 rounded-[2.5rem] p-10 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-black text-white mb-1">Storage Management</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Auto-Optimization</p>
                        </div>

                        <div className="my-8">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-gray-400">Purge Threshold</span>
                                <span className="text-xs font-black text-blue-400 uppercase tracking-widest">
                                    {systemInfo?.disk?.max_size && systemInfo?.disk?.total
                                        ? `${Math.round((systemInfo.disk.max_size / systemInfo.disk.total) * 100)}%`
                                        : '85% (DEFAULT)'}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
                                    style={{
                                        width: systemInfo?.disk?.max_size && systemInfo?.disk?.total
                                            ? `${Math.round((systemInfo.disk.max_size / systemInfo.disk.total) * 100)}%`
                                            : '85%'
                                    }}
                                ></div>
                            </div>
                            <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-gray-500">
                                {systemInfo?.disk?.auto_delete_oldest ? 'Automatic Purge Enabled' : 'Manual Maintenance Required'}
                            </p>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all border border-white/10">
                                Format External
                            </button>
                            <button className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-blue-900/40">
                                Clean Cache
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
