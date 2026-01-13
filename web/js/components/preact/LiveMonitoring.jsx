/**
 * Modern Live Monitoring Dashboard
 */
import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { useQuery } from '../../query-client.js';
import { MainLayout } from './MainLayout.jsx';
import { WebRTCVideoCell } from './WebRTCVideoCell.jsx';

export function LiveMonitoring() {
    const [layout, setLayout] = useState('4');
    const [currentPage, setCurrentPage] = useState(0);

    const { data: streamsResponse, isLoading, error } = useQuery(
        'streams',
        '/api/streams'
    );

    // Filter logic update: Handle response whether it is an array or object
    const filteredStreams = useMemo(() => {
        if (!streamsResponse) return [];
        let list = [];
        if (Array.isArray(streamsResponse)) {
            list = streamsResponse;
        } else if (streamsResponse.streams && Array.isArray(streamsResponse.streams)) {
            list = streamsResponse.streams;
        }
        return list.filter(s => s.enabled && s.streaming_enabled);
    }, [streamsResponse]);

    const maxStreams = useMemo(() => {
        return parseInt(layout) || 4;
    }, [layout]);

    const streamsToShow = useMemo(() => {
        const start = currentPage * maxStreams;
        return filteredStreams.slice(start, start + maxStreams);
    }, [filteredStreams, currentPage, maxStreams]);

    const gridClass = useMemo(() => {
        switch (layout) {
            case '1': return 'grid-cols-1';
            case '2': return 'grid-cols-1 md:grid-cols-2';
            case '4': return 'grid-cols-1 md:grid-cols-2';
            case '6': return 'grid-cols-1 md:grid-cols-3';
            case '9': return 'grid-cols-1 md:grid-cols-3';
            case '16': return 'grid-cols-2 md:grid-cols-4';
            default: return 'grid-cols-2';
        }
    }, [layout]);

    return (
        <MainLayout title="Live Monitoring" subtitle="Live" activeNav="nav-live">
            <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">System Live</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 bg-white/5 p-1 rounded-xl border border-white/5">
                        <div className="flex items-center px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Layout:
                        </div>
                        <select
                            value={layout}
                            onChange={(e) => { setLayout(e.target.value); setCurrentPage(0); }}
                            className="bg-[#111827] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-blue-400 focus:outline-none focus:border-blue-500 transition-all appearance-none pr-8 relative"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%233b82f6\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
                        >
                            <option value="1">1 Stream</option>
                            <option value="2">2 Streams</option>
                            <option value="4">4 Streams</option>
                            <option value="6">6 Streams</option>
                            <option value="9">9 Streams</option>
                            <option value="16">16 Streams</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-96 space-y-4">
                        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Initialising Flow</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-10 text-center">
                        <p className="text-red-400 font-bold">Failed to load system streams</p>
                    </div>
                ) : filteredStreams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 space-y-6 border-2 border-dashed border-white/5 rounded-[2rem]">
                        <div className="bg-white/5 p-6 rounded-3xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-white mb-2">Manage Systems</h3>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Configure Hardware</p>
                        </div>
                        <a href="streams.html" className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40">
                            Configure Streams
                        </a>
                    </div>
                ) : (
                    <div className={`grid ${gridClass} gap-8`}>
                        {streamsToShow.map(stream => (
                            <WebRTCVideoCell
                                key={stream.name}
                                stream={stream}
                                streamId={stream.name}
                                onToggleFullscreen={() => { }}
                            />
                        ))}
                    </div>
                )}

                {filteredStreams.length > maxStreams && (
                    <div className="flex items-center justify-center space-x-4 pt-10">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                            className="p-3 bg-white/5 disabled:opacity-30 rounded-xl border border-white/10 text-blue-400"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                            Page {currentPage + 1} of {Math.ceil(filteredStreams.length / maxStreams)}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => p + 1)}
                            disabled={currentPage >= Math.ceil(filteredStreams.length / maxStreams) - 1}
                            className="p-3 bg-white/5 disabled:opacity-30 rounded-xl border border-white/10 text-blue-400"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
