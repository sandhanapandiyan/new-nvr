import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { MainLayout } from './MainLayout.jsx';
import { useQuery, useMutation, useQueryClient, usePostMutation, fetchJSON } from '../../query-client.js';
import { showStatusMessage } from './ToastContainer.jsx';
import { validateSession } from '../../utils/auth-utils.js';

// Modals
import { StreamConfigModal } from './StreamConfigModal.jsx';
import { StreamDeleteModal } from './StreamDeleteModal.jsx';
import { ONVIFDiscoveryModal } from './ONVIFDiscoveryModal.jsx';

export function StreamsManagement() {
    const queryClient = useQueryClient();
    const [userRole, setUserRole] = useState(null);

    // Modal State
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [onvifModalVisible, setOnvifModalVisible] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [currentStream, setCurrentStream] = useState({
        name: '',
        url: '',
        enabled: true,
        streamingEnabled: true,
        width: 1280,
        height: 720,
        fps: 15,
        codec: 'h264',
        protocol: '0',
        record: true,
        recordAudio: true,
        backchannelEnabled: false,
        isOnvif: false,
        onvifUsername: '',
        onvifPassword: '',
        onvifProfile: '',
        detectionEnabled: false,
        detectionModel: '',
        detectionThreshold: 50,
        detectionInterval: 10,
        preBuffer: 10,
        postBuffer: 30,
        detectionZones: [],
        motionRecordingEnabled: false,
        motionPreBuffer: 5,
        motionPostBuffer: 10,
        retentionDays: 0,
        detectionRetentionDays: 0,
        maxStorageMb: 0
    });

    const [expandedSections, setExpandedSections] = useState({
        basic: true,
        recording: false,
        detection: false,
        zones: false,
        motion: false
    });

    // Fetch user role on mount
    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const result = await validateSession();
                if (result.valid && result.role) {
                    setUserRole(result.role);
                } else {
                    setUserRole('');
                }
            } catch (error) {
                setUserRole('');
            }
        };
        fetchUserRole();
    }, []);

    const canModify = userRole === 'admin' || userRole === 'user';

    // Queries
    const { data: streamsResponse = [], isLoading } = useQuery(['streams'], '/api/streams');
    const { data: detectionModelsData } = useQuery(['detectionModels'], '/api/detection/models');

    const streams = Array.isArray(streamsResponse) ? streamsResponse : (streamsResponse.streams || []);
    const detectionModels = detectionModelsData?.models || [];

    // Mutations
    const toggleStreamMutation = useMutation({
        mutationFn: async ({ streamName, enabled }) => {
            return await fetchJSON(`/api/streams/${encodeURIComponent(streamName)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['streams']);
            showStatusMessage('Stream status updated');
        }
    });

    const toggleRecordingMutation = useMutation({
        mutationFn: async ({ streamName, record }) => {
            return await fetchJSON(`/api/streams/${encodeURIComponent(streamName)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['streams']);
            showStatusMessage('Recording status updated');
        }
    });

    const saveStreamMutation = useMutation({
        mutationFn: async (data) => {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing ? `/api/streams/${encodeURIComponent(data.name)}` : '/api/streams';

            // Map camelCase to snake_case for API
            const apiData = {
                ...data,
                streaming_enabled: data.streamingEnabled,
                isOnvif: !!data.isOnvif,
                onvif_username: data.onvifUsername,
                onvif_password: data.onvifPassword,
                onvif_profile: data.onvifProfile,
                detection_based_recording: data.detectionEnabled,
                detection_model: data.detectionModel,
                detection_threshold: parseInt(data.detectionThreshold, 10),
                detection_interval: parseInt(data.detectionInterval, 10),
                pre_detection_buffer: parseInt(data.preBuffer, 10),
                post_detection_buffer: parseInt(data.postBuffer, 10),
                record_audio: data.recordAudio,
                backchannel_enabled: data.backchannelEnabled,
                retention_days: parseInt(data.retentionDays, 10),
                detection_retention_days: parseInt(data.detectionRetentionDays, 10),
                max_storage_mb: parseInt(data.maxStorageMb, 10)
            };

            return await fetchJSON(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiData)
            });
        },
        onSuccess: () => {
            setConfigModalVisible(false);
            queryClient.invalidateQueries(['streams']);
            showStatusMessage(isEditing ? 'Stream updated' : 'Stream added');
        },
        onError: (err) => showStatusMessage(`Save failed: ${err.message}`)
    });

    const deleteStreamMutation = useMutation({
        mutationFn: async ({ streamId, permanent }) => {
            const url = `/api/streams/${encodeURIComponent(streamId)}${permanent ? '?permanent=true' : ''}`;
            return await fetchJSON(url, { method: 'DELETE' });
        },
        onSuccess: () => {
            setDeleteModalVisible(false);
            queryClient.invalidateQueries(['streams']);
            showStatusMessage('Stream removed');
        }
    });

    // Handlers
    const handleOpenAddModal = () => {
        setIsEditing(false);
        setCurrentStream({
            name: '',
            url: '',
            enabled: true,
            streamingEnabled: true,
            width: 1280,
            height: 720,
            fps: 15,
            codec: 'h264',
            protocol: '0',
            record: true,
            recordAudio: true,
            backchannelEnabled: false,
            isOnvif: false,
            onvifUsername: '',
            onvifPassword: '',
            onvifProfile: '',
            detectionEnabled: false,
            detectionModel: '',
            detectionThreshold: 50,
            detectionInterval: 10,
            preBuffer: 10,
            postBuffer: 30,
            detectionZones: [],
            motionRecordingEnabled: false,
            motionPreBuffer: 5,
            motionPostBuffer: 10,
            retentionDays: 0,
            detectionRetentionDays: 0,
            maxStorageMb: 0
        });
        setConfigModalVisible(true);
    };

    const handleOpenEditModal = async (stream) => {
        try {
            const details = await fetchJSON(`/api/streams/${encodeURIComponent(stream.name)}/full`);
            const s = details.stream;
            const m = details.motion_config;

            setCurrentStream({
                ...s,
                streamingEnabled: s.streaming_enabled ?? true,
                isOnvif: s.isOnvif ?? false,
                onvifUsername: s.onvif_username || '',
                onvifPassword: s.onvif_password || '',
                onvifProfile: s.onvif_profile || '',
                detectionEnabled: s.detection_based_recording || false,
                detectionModel: s.detection_model || '',
                recordAudio: s.record_audio ?? true,
                backchannelEnabled: s.backchannel_enabled ?? false,
                detectionThreshold: s.detection_threshold || 50,
                detectionInterval: s.detection_interval || 10,
                preBuffer: s.pre_detection_buffer || 10,
                postBuffer: s.post_detection_buffer || 30,
                retentionDays: s.retention_days || 0,
                detectionRetentionDays: s.detection_retention_days || 0,
                maxStorageMb: s.max_storage_mb || 0,
                motionRecordingEnabled: !!m?.enabled,
                motionPreBuffer: m?.pre_buffer_seconds || 5,
                motionPostBuffer: m?.post_buffer_seconds || 10
            });
            setIsEditing(true);
            setConfigModalVisible(true);
        } catch (err) {
            showStatusMessage('Failed to load stream details');
        }
    };

    const handleOpenDeleteModal = (stream) => {
        setCurrentStream(stream);
        setDeleteModalVisible(true);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentStream(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleOnvifSelect = (streamData) => {
        setCurrentStream({
            ...currentStream,
            ...streamData
        });
        setOnvifModalVisible(false);
        setIsEditing(false);
        setConfigModalVisible(true);
    };

    return (
        <MainLayout title="Streams Management" subtitle="Configure and manage your camera nodes">
            <div className="flex flex-col space-y-8">
                {/* Header Actions */}
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Active Nodes</h2>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                            {streams.length} {streams.length === 1 ? 'Camera' : 'Cameras'} Connected
                        </p>
                    </div>
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setOnvifModalVisible(true)}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all"
                        >
                            Discover ONVIF
                        </button>
                        <button
                            onClick={handleOpenAddModal}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all shadow-lg shadow-blue-900/40"
                        >
                            Add Manual Node
                        </button>
                    </div>
                </div>

                {/* Streams Grid */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                ) : streams.length === 0 ? (
                    <div className="bg-[#0d1726]/60 border border-white/5 rounded-[2.5rem] p-20 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">No Active Nodes</h3>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Connect a manual node or use discovery to begin.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {streams.map((stream) => (
                            <div key={stream.name} className="group relative bg-[#0d1726]/80 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-8 transition-all duration-500 hover:border-blue-500/30 overflow-hidden">
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center space-x-6">
                                        <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${stream.enabled ? 'border-green-500/20' : 'border-red-500/20'}`}>
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${stream.enabled ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        </div>

                                        <div className="flex flex-col">
                                            <h3 className="text-lg font-black text-white uppercase tracking-widest">{stream.name}</h3>
                                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1 truncate max-w-[200px]">{stream.url}</p>
                                            <div className="flex items-center space-x-4 mt-3">
                                                <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-widest border border-white/5">
                                                    {stream.width}x{stream.height}
                                                </span>
                                                <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-widest border border-white/5">
                                                    {stream.fps} FPS
                                                </span>
                                                <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-widest border border-white/5">
                                                    {stream.codec?.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleOpenEditModal(stream)}
                                            className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all border border-white/5"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleOpenDeleteModal(stream)}
                                            className="p-4 bg-red-500/10 hover:bg-red-500/20 rounded-2xl text-red-500 transition-all border border-red-500/10"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Toggles Bar */}
                                <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4 relative z-10">
                                    <button
                                        onClick={() => toggleStreamMutation.mutate({ streamName: stream.name, enabled: !stream.enabled })}
                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${stream.enabled ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-white/5 border-white/10 text-gray-500 grayscale'}`}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Node Status</span>
                                            <span className="text-xs font-black uppercase tracking-widest">{stream.enabled ? 'Streaming' : 'Offline'}</span>
                                        </div>
                                        <div className={`w-10 h-6 rounded-full relative transition-colors ${stream.enabled ? 'bg-green-500' : 'bg-gray-700'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${stream.enabled ? 'right-1' : 'left-1'}`}></div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => toggleRecordingMutation.mutate({ streamName: stream.name, record: !stream.record })}
                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${stream.record ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-white/5 border-white/10 text-gray-500 grayscale'}`}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Archiving</span>
                                            <span className="text-xs font-black uppercase tracking-widest">{stream.record ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                        <div className={`w-10 h-6 rounded-full relative transition-colors ${stream.record ? 'bg-blue-500' : 'bg-gray-700'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${stream.record ? 'right-1' : 'left-1'}`}></div>
                                        </div>
                                    </button>
                                </div>

                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full transition-transform duration-[2000ms] group-hover:translate-x-full pointer-events-none"></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {configModalVisible && (
                <StreamConfigModal
                    isEditing={isEditing}
                    currentStream={currentStream}
                    detectionModels={detectionModels}
                    expandedSections={expandedSections}
                    onToggleSection={(s) => setExpandedSections({ ...expandedSections, [s]: !expandedSections[s] })}
                    onInputChange={handleInputChange}
                    onThresholdChange={handleInputChange}
                    onSave={() => saveStreamMutation.mutate(currentStream)}
                    onClose={() => setConfigModalVisible(false)}
                    onRefreshModels={() => queryClient.invalidateQueries(['detectionModels'])}
                />
            )}

            {deleteModalVisible && (
                <StreamDeleteModal
                    streamId={currentStream.name}
                    streamName={currentStream.name}
                    onClose={() => setDeleteModalVisible(false)}
                    onDisable={(id) => deleteStreamMutation.mutate({ streamId: id, permanent: false })}
                    onDelete={(id) => deleteStreamMutation.mutate({ streamId: id, permanent: true })}
                />
            )}

            {onvifModalVisible && (
                <ONVIFDiscoveryModal
                    onClose={() => setOnvifModalVisible(false)}
                    onSelect={handleOnvifSelect}
                />
            )}
        </MainLayout>
    );
}
