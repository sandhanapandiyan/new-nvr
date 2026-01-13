import { h } from 'preact';
import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { fetchJSON, useQuery, useMutation } from '../../query-client.js';
import { MainLayout } from './MainLayout.jsx';
import { showStatusMessage } from './ToastContainer.jsx';


export function PlaybackControlRoom() {
    // --- Global State ---
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    });
    const [viewDate, setViewDate] = useState(new Date());

    // Playback State
    const [currentTime, setCurrentTime] = useState(0); // Global timeline time (seconds of day)
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    // Multi-View State
    const [layoutMode, setLayoutMode] = useState('single'); // 'single', 'grid'
    const [activeStreamIndex, setActiveStreamIndex] = useState(0);
    const [gridStreams, setGridStreams] = useState([]);

    // Visual Adjustments
    const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100 });
    const [zoomSettings, setZoomSettings] = useState({ scale: 1, x: 0, y: 0 });

    // Tools State
    // "States" removed as requested.


    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // Export & Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionEnd, setSelectionEnd] = useState(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [removableDevices, setRemovableDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [recordingDays, setRecordingDays] = useState(new Set());

    useEffect(() => {
        fetchJSON('/api/recordings/days').then(days => {
            if (Array.isArray(days)) {
                setRecordingDays(new Set(days));
            }
        }).catch(err => console.error("Failed to load recording days", err));
    }, []);



    // Refs
    const videoRefs = useRef({});
    const hlsRefs = useRef({});

    // Data Fetching - Direct fetch instead of useQuery to avoid query client issues
    const [streams, setStreams] = useState([]);
    const [streamsLoading, setStreamsLoading] = useState(true);

    useEffect(() => {
        fetchJSON('/api/streams')
            .then(data => {
                console.log('[PlaybackControlRoom] Fetched streams:', data);
                setStreams(data || []);
                setStreamsLoading(false);
            })
            .catch(err => {
                console.error('[PlaybackControlRoom] Failed to fetch streams:', err);
                setStreams([]);
                setStreamsLoading(false);
            });
    }, []);

    // --- Initialization ---
    useEffect(() => {
        if (streams?.length && gridStreams.length === 0) {
            setGridStreams(streams.slice(0, 4).map(s => s.name));
        }
    }, [streams]);

    // Debug: Log streams whenever they change
    useEffect(() => {
        console.log('[PlaybackControlRoom] Streams data:', streams);
        console.log('[PlaybackControlRoom] Streams length:', streams?.length);
    }, [streams]);

    const timeRange = useMemo(() => {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const start = new Date(year, month - 1, day, 0, 0, 0).toISOString();
        const end = new Date(year, month - 1, day, 23, 59, 59).toISOString();
        return { start, end };
    }, [selectedDate]);

    // Timeline Data (Primary Stream)
    const activeStreamName = gridStreams[activeStreamIndex];
    const timelineUrl = activeStreamName ? `/api/timeline/segments?stream=${encodeURIComponent(activeStreamName)}&start=${encodeURIComponent(timeRange.start)}&end=${encodeURIComponent(timeRange.end)}` : null;
    const { data: timelineData } = useQuery(['timeline', activeStreamName, selectedDate], timelineUrl, { enabled: !!activeStreamName });
    const segments = timelineData?.segments || [];
    const segmentsRef = useRef([]);
    useEffect(() => { segmentsRef.current = segments; }, [segments]);

    // Optimize Rendering: Merge adjacent segments into visual blocks
    const visualSegments = useMemo(() => {
        if (!segments || segments.length === 0) return [];

        // Sort by start_time just in case
        const sorted = [...segments].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        const merged = [];
        let currentBlock = null;

        for (const seg of sorted) {
            const start = new Date(seg.start_time).getTime();
            const end = new Date(seg.end_time).getTime();

            if (!currentBlock) {
                currentBlock = { start, end };
            } else {
                // If gap is less than 2 seconds, merge
                if (start - currentBlock.end < 2000) {
                    currentBlock.end = Math.max(currentBlock.end, end);
                } else {
                    merged.push(currentBlock);
                    currentBlock = { start, end };
                }
            }
        }
        if (currentBlock) merged.push(currentBlock);
        return merged;
    }, [segments]);

    // Video State Management
    // const [playingSegmentId, setPlayingSegmentId] = useState(null); // No longer needed
    const [streamStartTime, setStreamStartTime] = useState(0); // The global timestamp where the current video stream started

    // Seek / Load Stream
    useEffect(() => {
        if (!activeStreamName) return;

        // Debounce or check if we really need to reload
        // For now, simpler: if the video is not playing or we are "seeking", we reload.
        // But we need to distinguish between "time updated by playback" and "time updated by user click".
        // Implementation: seekTo updates a ref 'isSeeking', effect fires, resets ref.

        // Actually, simpler approach:
        // user click -> seekTo -> sets currentTime -> effect triggers -> reloads video src
        // Playback -> updates video.currentTime -> onTimeUpdate -> sets currentTime? NO.
        // If we set currentTime during playback, this effect will re-fire and reload the video!
        // SOLUTION: Separate 'seeking' state or use a ref for the last sought time.
    }, []);

    // Better approach:
    // User clicks timeline -> calls seekTo(time)
    // seekTo -> sets specific source URL -> video plays.
    // currentTime state is ONLY for UI.

    // We need a ref to track if the update is from video or user.
    const isPlaybackUpdate = useRef(false);

    useEffect(() => {
        if (!activeStreamName || !timeRange) return;
        // Initial load or date change
        // Load from start or current time? 
        // Let's load from currentTime if > 0, else start of first segment.

        // This effect ONLY handles activeStream changes or date changes.
        // Specific seeking is handled by check below or seekTo function.
    }, [activeStreamName, timeRange]);


    const findSegmentAtTime = (time) => {
        return segmentsRef.current.find(s => {
            const start = new Date(s.start_time);
            const end = new Date(s.end_time);
            const sSec = start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds();
            const eSec = end.getHours() * 3600 + end.getMinutes() * 60 + end.getSeconds();
            return time >= sSec && time <= eSec;
        });
    };

    const getSegmentRelativeTime = (seg, time) => {
        const start = new Date(seg.start_time);
        const sSec = start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds();
        return Math.max(0, time - sSec);
    };

    // Timeline Zoom State
    const [viewDuration, setViewDuration] = useState(86400); // Seconds visible (default 24h)
    const [viewStart, setViewStart] = useState(0); // Start second of the view window

    // Sync Playback Time to UI
    useEffect(() => {
        const video = videoRefs.current[activeStreamName];
        if (!video) return;

        const updateTime = () => {
            if (!video.paused && !video.seeking) {
                const newTime = streamStartTime + video.currentTime;
                // Only update state if difference is significant to avoid jitter
                if (Math.abs(currentTime - newTime) > 0.5) {
                    isPlaybackUpdate.current = true;
                    setCurrentTime(newTime);
                    isPlaybackUpdate.current = false;
                }
            }
        };

        const interval = setInterval(updateTime, 100);
        return () => clearInterval(interval);
    }, [activeStreamName, streamStartTime, isPlaying, currentTime]);

    const handleTimelineWheel = (e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const width = rect.width;
        const mousePercent = mouseX / width;

        // Current time under mouse
        const mouseTime = viewStart + (mousePercent * viewDuration);

        // Zoom factor
        const zoomFactor = 1.1;
        let newDuration = viewDuration;

        if (e.deltaY < 0) {
            // Zoom In
            newDuration = viewDuration / zoomFactor;
        } else {
            // Zoom Out
            newDuration = viewDuration * zoomFactor;
        }

        // Clamp duration (min 1 minute, max 24 hours)
        newDuration = Math.max(60, Math.min(86400, newDuration));

        // Calculate new start time to keep mouseTime under cursor
        // mouseTime = newStart + (mousePercent * newDuration)
        // newStart = mouseTime - (mousePercent * newDuration)
        let newStart = mouseTime - (mousePercent * newDuration);

        // Clamp start time
        newStart = Math.max(0, Math.min(86400 - newDuration, newStart));

        setViewDuration(newDuration);
        setViewStart(newStart);
    };


    const seekTo = (seconds, autoPlay = false) => {
        // User Interaction
        isPlaybackUpdate.current = true;
        setCurrentTime(seconds);
        isPlaybackUpdate.current = false;

        if (autoPlay) setIsPlaying(true);

        const v = videoRefs.current[activeStreamName];
        if (v) {
            // "Virtual Seek": Reload the stream starting at 'seconds'
            // We use the date string + time for the backend
            // Get YYYY-MM-DD from selectedDate
            const dateStr = selectedDate;
            // seconds is 0-86400.
            // convert to ISO string step...
            const [year, month, day] = dateStr.split('-').map(Number);
            const d = new Date(year, month - 1, day);
            d.setSeconds(seconds);

            // Format: YYYY-MM-DDTHH:mm:ss
            // Careful with timezone... 'seconds' is local day seconds?
            // Assuming 'currentTime' is 0-86400 local time.

            // Construct ISO string for backend (UTC)
            const isoTime = d.toISOString();

            setStreamStartTime(seconds);
            v.src = `/api/playback/continuous?stream=${encodeURIComponent(activeStreamName)}&start=${encodeURIComponent(isoTime)}`;
            v.load();
            const onCanPlay = () => {
                if (isPlaying || autoPlay) v.play().catch(() => { });
                v.removeEventListener('canplay', onCanPlay);
            };
            v.addEventListener('canplay', onCanPlay);
        }
    };

    // Zoom
    const handleZoomWheel = (e) => {
        if (e.ctrlKey || layoutMode === 'single') {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoomSettings(prev => {
                const newScale = Math.max(1, Math.min(5, prev.scale + delta));
                return { ...prev, scale: newScale, x: newScale === 1 ? 0 : prev.x, y: newScale === 1 ? 0 : prev.y };
            });
        }
    };

    // Snapshot
    const takeSnapshot = () => {
        const v = videoRefs.current[activeStreamName];
        if (!v) return;
        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
        ctx.drawImage(v, 0, 0);
        const link = document.createElement('a');
        link.download = `snapshot_${activeStreamName}_${new Date().toISOString()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg');
        link.click();
    };

    const formatTime = (s) => new Date(s * 1000).toISOString().substr(11, 8);

    return (
        <MainLayout title="Playback Control Room" subtitle="Archives" activeNav="nav-recordings">
            <div className="flex h-full gap-5 text-slate-200 select-none overflow-hidden bg-[#03070c] p-2">

                {/* LEFT: SOURCES */}
                <div className="w-64 flex flex-col gap-4 bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
                    {/* Calendar */}
                    <div className="bg-[#1e293b] rounded-xl p-3 border border-slate-700">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">{viewDate.toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                            <div className="flex gap-1">
                                <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-slate-400 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
                                <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-slate-400 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-[10px] text-center">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <span key={d} className="text-slate-500 font-bold">{d}</span>)}
                            {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => <div key={'o' + i} />)}
                            {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                const d = i + 1;
                                const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                const hasRecording = recordingDays.has(dateStr);
                                return (
                                    <button key={d} onClick={() => setSelectedDate(dateStr)} className={`relative h-7 w-7 rounded-full flex items-center justify-center transition-all ${selectedDate === dateStr ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30' : 'hover:bg-slate-700 text-slate-400'}`}>
                                        {d}
                                        {hasRecording && <div className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_4px_#10b981]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Stream List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 pl-1">Cameras</h3>
                        {streams?.map(s => (
                            <div key={s.name}
                                onClick={() => {
                                    if (layoutMode === 'single') {
                                        setGridStreams(prev => { const n = [...prev]; n[0] = s.name; return n; });
                                        setActiveStreamIndex(0);
                                    } else {
                                        setGridStreams(prev => { const n = [...prev]; n[activeStreamIndex] = s.name; return n; });
                                    }
                                }}
                                className={`p-3 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-between mb-1 border transition-all ${gridStreams.includes(s.name) ? 'bg-blue-600/10 text-blue-400 border-blue-500/50' : 'bg-slate-800/50 border-transparent hover:bg-slate-800 text-slate-400'}`}
                            >
                                <span>{s.name}</span>
                                <div className={`w-1.5 h-1.5 rounded-full ${s.enabled ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER: VIDEO STAGE */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    {/* Top Toolbar */}
                    <div className="h-12 bg-[#0f172a] rounded-2xl border border-slate-800 flex items-center px-4 justify-between shadow-sm">
                        <div className="flex gap-2">
                            <button onClick={() => setLayoutMode('single')} className={`p-2 rounded-lg transition-colors ${layoutMode === 'single' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`} title="Single View">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" /></svg>
                            </button>
                            <button onClick={() => setLayoutMode('grid')} className={`p-2 rounded-lg transition-colors ${layoutMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`} title="Grid View">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            </button>
                        </div>

                        {/* Image Adjustments */}
                        <div className="flex gap-4 items-center bg-slate-900/50 px-4 py-1.5 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2">
                                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                <input type="range" min="50" max="150" value={filters.brightness} onChange={e => setFilters({ ...filters, brightness: e.target.value })} className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                            </div>
                            <div className="w-[1px] h-4 bg-slate-700"></div>
                            <div className="flex items-center gap-2">
                                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                                <input type="range" min="50" max="150" value={filters.contrast} onChange={e => setFilters({ ...filters, contrast: e.target.value })} className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Video Stage */}
                    <div className="flex-1 bg-black rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl" onWheel={handleZoomWheel}>
                        <div className={`w-full h-full grid ${layoutMode === 'single' ? 'grid-cols-1' : 'grid-cols-2 grid-rows-2'} gap-[1px] bg-slate-900`}>
                            {(layoutMode === 'single' ? [gridStreams[activeStreamIndex]] : gridStreams.slice(0, 4)).map((sName, i) => (
                                sName ? (
                                    <div key={i} className={`relative w-full h-full group ${activeStreamName === sName ? 'ring-1 ring-blue-500/50 z-10' : ''}`} onClick={() => setActiveStreamIndex(layoutMode === 'single' ? activeStreamIndex : i)}>
                                        <video
                                            ref={el => {
                                                videoRefs.current[sName] = el;
                                                if (el) {
                                                    el.volume = volume;
                                                    el.muted = isMuted || (layoutMode === 'grid' && activeStreamName !== sName);
                                                }
                                            }}
                                            className="w-full h-full object-contain bg-black"
                                            style={{
                                                filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`,
                                                transform: activeStreamName === sName ? `scale(${zoomSettings.scale}) translate(${zoomSettings.x}px, ${zoomSettings.y}px)` : 'scale(1)'
                                            }}
                                        />
                                        <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold tracking-wider rounded-lg border border-white/10">{sName}</div>
                                    </div>
                                ) : <div key={i} className="bg-[#050505] flex flex-col items-center justify-center text-slate-800">
                                    <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">No Signal</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Transport & Timeline */}
                    <div className="flex flex-col gap-0 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">

                        {/* Control Bar */}
                        <div className="h-14 flex items-center justify-between px-6 border-b border-slate-800 bg-[#1e293b]">
                            <div className="flex items-center gap-4">
                                {/* Playback Controls */}
                                <button onClick={() => togglePlay()} className="w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                                    {isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                                </button>

                                <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>

                                {/* Volume Controls */}
                                <div className="flex items-center gap-2 group">
                                    <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white transition-colors">
                                        {isMuted || volume === 0 ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                                        ) : volume < 0.5 ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                        )}
                                    </button>
                                    <div className="w-0 overflow-hidden group-hover:w-24 transition-all duration-300 ease-out">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={volume}
                                            onChange={(e) => {
                                                setVolume(parseFloat(e.target.value));
                                                if (parseFloat(e.target.value) > 0) setIsMuted(false);
                                            }}
                                            className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>

                                {/* Speed */}
                                <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                                    {[0.5, 1, 2, 4, 8].map(s => (
                                        <button key={s} onClick={() => setPlaybackSpeed(s)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${playbackSpeed === s ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>{s}x</button>
                                    ))}
                                </div>
                            </div>

                            {/* Center Time Display */}
                            <div className="flex flex-col items-center">
                                <div className="font-mono text-xl font-black text-blue-400 tracking-wider tabular-nums">{formatTime(currentTime)}</div>
                            </div>

                            <div className="flex gap-3 items-center">
                                {/* Scissors Tool */}
                                <button
                                    onClick={() => {
                                        setIsSelectionMode(!isSelectionMode);
                                        if (!isSelectionMode) {
                                            setSelectionStart(null);
                                            setSelectionEnd(null);
                                        }
                                    }}
                                    className={`p-2 rounded-lg transition-colors ${isSelectionMode ? 'text-blue-400 bg-blue-900/30 ring-1 ring-blue-500/50' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                    title="Export Clip (Scissors)"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm8.486-8.486a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243z" /></svg>
                                </button>

                                {isSelectionMode && selectionStart !== null && selectionEnd !== null && (
                                    <button
                                        onClick={async () => {
                                            setIsExporting(true);
                                            try {
                                                // selectionStart and selectionEnd are already Unix timestamps (seconds)
                                                // Convert to ISO format for API
                                                const startDate = new Date(selectionStart * 1000);
                                                const endDate = new Date(selectionEnd * 1000);
                                                const startISO = startDate.toISOString().slice(0, 19);
                                                const endISO = endDate.toISOString().slice(0, 19);

                                                console.log('Export request:', {
                                                    stream: activeStreamName,
                                                    start: startISO,
                                                    end: endISO,
                                                    startTimestamp: selectionStart,
                                                    endTimestamp: selectionEnd
                                                });

                                                const response = await fetch('/api/export', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        stream: activeStreamName,
                                                        start: startISO,
                                                        end: endISO,
                                                        device_path: 'local/recordings/export'
                                                    })
                                                });

                                                const result = await response.json();
                                                console.log('Export response:', result);

                                                if (result.success) {
                                                    showStatusMessage(`Export completed! ${result.copied} files copied to export folder`, "success");
                                                } else {
                                                    showStatusMessage('Export failed: ' + (result.error || 'Unknown error'), 'error');
                                                }
                                            } catch (err) {
                                                console.error('Export error:', err);
                                                showStatusMessage('Export failed: ' + err.message, 'error');
                                            } finally {
                                                setIsExporting(false);
                                            }
                                        }}
                                        disabled={isExporting}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white text-xs font-bold rounded shadow-lg"
                                    >
                                        {isExporting ? 'EXPORTING...' : 'EXPORT'}
                                    </button>
                                )}

                                <button onClick={takeSnapshot} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Snapshot">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                            </div>
                        </div>




                        {/* Timeline Track */}
                        <div className="h-24 relative overflow-hidden cursor-crosshair group bg-slate-900/50"
                            onWheel={handleTimelineWheel}
                            onClick={e => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pct = (e.clientX - rect.left) / rect.width;
                                // Click time relative to current view
                                const clickTime = viewStart + (pct * viewDuration);

                                if (isSelectionMode) {
                                    if (selectionStart === null) {
                                        setSelectionStart(clickTime);
                                    } else if (selectionEnd === null) {
                                        // Ensure start < end
                                        if (clickTime < selectionStart) {
                                            setSelectionEnd(selectionStart);
                                            setSelectionStart(clickTime);
                                        } else {
                                            setSelectionEnd(clickTime);
                                        }
                                    } else {
                                        // Reset selection on 3rd click? Or adjust nearest?
                                        // Let's reset for simplicity
                                        setSelectionStart(clickTime);
                                        setSelectionEnd(null);
                                    }
                                } else {
                                    seekTo(clickTime, true);
                                }
                            }}
                        >
                            {/* Ruler */}
                            <div className="absolute top-0 w-full h-full flex pointer-events-none">
                                {(() => {
                                    // Determine Tick Interval
                                    let interval = 3600; // 1h
                                    if (viewDuration < 7200) interval = 300; // 5m
                                    if (viewDuration < 1800) interval = 60; // 1m
                                    if (viewDuration < 300) interval = 10; // 10s

                                    // Generate Ticks
                                    const ticks = [];
                                    const firstTick = Math.ceil(viewStart / interval) * interval;
                                    for (let t = firstTick; t < viewStart + viewDuration; t += interval) {
                                        const left = ((t - viewStart) / viewDuration) * 100;
                                        // Format label
                                        const d = new Date(t * 1000);
                                        let label = `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                                        if (interval < 60) label += `:${String(d.getUTCSeconds()).padStart(2, '0')}`;

                                        ticks.push(
                                            <div key={t} className="absolute border-l border-slate-700/50 h-full" style={{ left: `${left}%` }}>
                                                <span className="absolute bottom-1 left-1 text-[9px] text-slate-600 font-mono select-none">{label}</span>
                                            </div>
                                        );
                                    }
                                    return ticks;
                                })()}
                            </div>

                            {/* Recordings (Visual Blocks) */}
                            <div className="absolute top-6 bottom-6 left-0 right-0">
                                {visualSegments.map((block, i) => {
                                    const s = new Date(block.start);
                                    const e = new Date(block.end);
                                    const sSec = s.getHours() * 3600 + s.getMinutes() * 60 + s.getSeconds();
                                    const eSec = e.getHours() * 3600 + e.getMinutes() * 60 + e.getSeconds();

                                    // Skip if out of view
                                    if (eSec < viewStart || sSec > viewStart + viewDuration) return null;

                                    const left = ((sSec - viewStart) / viewDuration) * 100;
                                    let width = ((eSec - sSec) / viewDuration) * 100;
                                    if (width < 0.1) width = 0.1; // Ensure visible

                                    return <div key={i} className="absolute h-full bg-emerald-500/20 border-x border-emerald-500/40 rounded-sm" style={{ left: `${left}%`, width: `${width}%` }} />;
                                })}
                            </div>



                            {/* Playhead */}
                            {currentTime >= viewStart && currentTime <= viewStart + viewDuration && (
                                <div className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]" style={{ left: `${((currentTime - viewStart) / viewDuration) * 100}%` }}>
                                    <div className="w-3 h-2 -ml-1.5 bg-red-500/50 absolute top-0 rounded-b-sm"></div>
                                </div>
                            )}

                            {/* Selection Overlay */}
                            {selectionStart !== null && (
                                <div
                                    className="absolute top-0 bottom-0 bg-blue-500/30 border-x-2 border-blue-400 pointer-events-none z-10"
                                    style={{
                                        left: `${((selectionStart - viewStart) / viewDuration) * 100}%`,
                                        width: selectionEnd ? `${((selectionEnd - selectionStart) / viewDuration) * 100}%` : '2px'
                                    }}
                                >
                                    <div className="absolute top-0 -left-6 text-[10px] font-mono bg-blue-600/80 text-white px-1 rounded">{formatTime(selectionStart)}</div>
                                    {selectionEnd && <div className="absolute bottom-0 -right-6 text-[10px] font-mono bg-blue-600/80 text-white px-1 rounded">{formatTime(selectionEnd)}</div>}
                                </div>
                            )}
                        </div>

                        {/* Horizontal Scrollbar */}
                        <div className="px-0 py-1 bg-[#0f172a]">
                            <input
                                type="range"
                                min="0"
                                max={Math.max(0, 86400 - viewDuration)}
                                step="1"
                                value={viewStart}
                                onInput={(e) => setViewStart(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-500 hover:accent-slate-400"
                            />
                        </div>

                    </div>
                </div>

            </div>
        </MainLayout>
    );

    // Helper component for Modal (inline for simplicity)
    // In real code, move to separate component or use Portal
    function ExportModal() {
        if (!showExportModal) return null;

        // Helper to format ISO string based on selectedDate and time
        const getIsoTime = (seconds) => {
            const [year, month, day] = selectedDate.split('-').map(Number);
            const d = new Date(year, month - 1, day);
            d.setSeconds(seconds);
            return d.toISOString().split('.')[0]; // trim ms
        };

        const handleExport = async () => {
            setIsExporting(true);
            try {
                const payload = {
                    stream: activeStreamName,
                    start: getIsoTime(selectionStart),
                    end: getIsoTime(selectionEnd),
                    device_path: selectedDevice
                };
                await fetchJSON('/api/export', { method: 'POST', body: JSON.stringify(payload) });
                showStatusMessage('Export started successfully');
                setShowExportModal(false);
                setIsSelectionMode(false);
                setSelectionStart(null);
                setSelectionEnd(null);
            } catch (err) {
                showStatusMessage('Export failed: ' + err.message);
            } finally {
                setIsExporting(false);
            }
        };

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">Export Video Clip</h3>

                    <div className="space-y-4">
                        <div className="bg-slate-800 p-3 rounded-lg text-sm text-slate-300">
                            <div className="flex justify-between mb-1"><span>Start:</span> <span className="font-mono text-white">{formatTime(selectionStart)}</span></div>
                            <div className="flex justify-between mb-1"><span>End:</span> <span className="font-mono text-white">{formatTime(selectionEnd)}</span></div>
                            <div className="flex justify-between border-t border-slate-700 pt-1 mt-1"><span>Duration:</span> <span className="font-mono text-emerald-400">{formatTime(selectionEnd - selectionStart)}</span></div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Device</label>
                            <select
                                value={selectedDevice}
                                onChange={e => setSelectedDevice(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {removableDevices.map(d => (
                                    <option key={d.path} value={d.path}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowExportModal(false)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors">CANCEL</button>
                        <button onClick={handleExport} disabled={isExporting} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50">
                            {isExporting ? 'STARTING...' : 'EXPORT NOW'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
