/**
 * ONVIF Discovery Modal Component for PRO NVR Enterprise
 */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { fetchJSON, usePostMutation } from '../../query-client.js';
import { showStatusMessage } from './ToastContainer.jsx';

export function ONVIFDiscoveryModal({ onClose, onSelect }) {
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveredDevices, setDiscoveredDevices] = useState([]);
    const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
    const [deviceProfiles, setDeviceProfiles] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [credentials, setCredentials] = useState({ username: 'admin', password: '' });
    const [customStreamName, setCustomStreamName] = useState('');

    const onvifDiscoveryMutation = usePostMutation(
        '/api/onvif/discovery/discover',
        { timeout: 30000 },
        {
            onMutate: () => setIsDiscovering(true),
            onSuccess: (data) => {
                setDiscoveredDevices(data.devices || []);
                setIsDiscovering(false);
            },
            onError: (error) => {
                showStatusMessage(`Discovery failed: ${error.message}`);
                setIsDiscovering(false);
            }
        }
    );

    const handleDiscover = () => {
        setDiscoveredDevices([]);
        setSelectedDevice(null);
        setDeviceProfiles([]);
        onvifDiscoveryMutation.mutate({});
    };

    const handleDeviceSelect = async (device) => {
        setSelectedDevice(device);
        setDeviceProfiles([]);
        setIsLoadingProfiles(true);
        try {
            const response = await fetch('/api/onvif/device/profiles', {
                method: 'GET',
                headers: {
                    'X-Device-URL': `http://${device.ip_address}/onvif/device_service`,
                    'X-Username': credentials.username,
                    'X-Password': credentials.password
                }
            });
            if (response.ok) {
                const data = await response.json();
                setDeviceProfiles(data.profiles || []);
                if (data.profiles && data.profiles.length > 0) {
                    setSelectedProfile(data.profiles[0]);
                    setCustomStreamName(device.name || device.model || 'New ONVIF Node');
                }
            } else {
                showStatusMessage('Failed to fetch profiles. Check credentials.');
            }
        } catch (error) {
            showStatusMessage(`Error: ${error.message}`);
        } finally {
            setIsLoadingProfiles(false);
        }
    };

    const handleAdd = () => {
        if (!selectedProfile || !customStreamName) return;

        const streamData = {
            name: customStreamName.replace(/\s+/g, '_').toLowerCase(),
            url: selectedProfile.stream_uri,
            enabled: true,
            streaming_enabled: true,
            width: selectedProfile.width,
            height: selectedProfile.height,
            fps: selectedProfile.fps || 15,
            codec: selectedProfile.encoding?.toLowerCase() === 'h264' ? 'h264' : 'h265',
            isOnvif: true,
            onvifUsername: credentials.username,
            onvifPassword: credentials.password
        };

        onSelect(streamData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-xl" onClick={onClose}></div>

            <div className="relative w-full max-w-4xl bg-[#1e293b] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">ONVIF Intelligence Discovery</h2>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Scanning localized network for camera nodes</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left: Device List */}
                    <div className="p-8 border-r border-white/5 min-h-[500px] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Discovered Hardware</h3>
                            <button
                                onClick={handleDiscover}
                                disabled={isDiscovering}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-white rounded-xl transition-all"
                            >
                                {isDiscovering ? 'Scanning...' : 'Start Scan'}
                            </button>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                            {isDiscovering && (
                                <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
                                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] animate-pulse">Broadcasting WS-Discovery Signals</p>
                                </div>
                            )}

                            {!isDiscovering && discoveredDevices.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No nodes detected in local segment</p>
                                </div>
                            )}

                            {discoveredDevices.map(device => (
                                <button
                                    key={device.ip_address}
                                    onClick={() => handleDeviceSelect(device)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedDevice?.ip_address === device.ip_address ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-black text-white">{device.name || 'Generic Profile S'}</span>
                                        <span className="text-[10px] font-bold text-blue-400 font-mono">{device.ip_address}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Manufacturer: {device.manufacturer || 'Unknown'}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Credentials & Profiles */}
                    <div className="p-8 flex flex-col">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Node Authentication</h3>

                        <div className="space-y-4 mb-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Username</label>
                                    <input
                                        type="text"
                                        value={credentials.username}
                                        onInput={e => setCredentials({ ...credentials, username: e.target.value })}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Password</label>
                                    <input
                                        type="password"
                                        value={credentials.password}
                                        onInput={e => setCredentials({ ...credentials, password: e.target.value })}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {selectedDevice && (
                                <button
                                    onClick={() => handleDeviceSelect(selectedDevice)}
                                    className="w-full py-2 text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
                                >
                                    ↻ Refresh Profiles with Credentials
                                </button>
                            )}
                        </div>

                        {selectedDevice && (
                            <div className="flex-1 flex flex-col space-y-4">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Available Streams</h3>

                                {isLoadingProfiles ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
                                    </div>
                                ) : deviceProfiles.length > 0 ? (
                                    <div className="flex-1 space-y-3">
                                        <div className="max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                            {deviceProfiles.map(profile => (
                                                <button
                                                    key={profile.token}
                                                    onClick={() => setSelectedProfile(profile)}
                                                    className={`w-full text-left p-3 rounded-xl border transition-all mb-2 ${selectedProfile?.token === profile.token ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-400'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-black uppercase tracking-wider">{profile.name}</span>
                                                        <span className="text-[9px] font-mono px-2 py-0.5 bg-black/20 rounded-md">{profile.width}x{profile.height}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="space-y-2 pt-4 border-t border-white/5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Unique Node Identifier</label>
                                            <input
                                                type="text"
                                                value={customStreamName}
                                                onInput={e => setCustomStreamName(e.target.value)}
                                                placeholder="e.g. front_gate_main"
                                                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-center p-6 bg-amber-600/5 rounded-3xl border border-amber-600/10">
                                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em]">Select hardware & authenticate to see streams</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <button
                                onClick={handleAdd}
                                disabled={!selectedProfile || !customStreamName}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:grayscale text-[11px] font-black uppercase tracking-[0.3em] text-white rounded-2xl transition-all shadow-xl shadow-emerald-900/40"
                            >
                                Integrate Node Into Network
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
