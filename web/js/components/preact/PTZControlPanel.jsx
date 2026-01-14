/**
 * PTZ Control Panel Component
 * Full-featured Pan/Tilt/Zoom controls with preset management
 */

import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';

export function PTZControlPanel({ streamName, onClose }) {
    const [capabilities, setCapabilities] = useState(null);
    const [presets, setPresets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPanning, setIsPanning] = useState(false);
    const [currentPresetName, setCurrentPresetName] = useState('');
    const [showPresetInput, setShowPresetInput] = useState(false);

    // Load PTZ capabilities
    useEffect(() => {
        loadCapabilities();
        loadPresets();
    }, [streamName]);

    const loadCapabilities = async () => {
        try {
            const response = await fetch(`/api/streams/${encodeURIComponent(streamName)}/ptz/capabilities`);
            if (!response.ok) throw new Error('Failed to load PTZ capabilities');
            const data = await response.json();
            setCapabilities(data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const loadPresets = async () => {
        try {
            const response = await fetch(`/api/streams/${encodeURIComponent(streamName)}/ptz/presets`);
            if (!response.ok) return;
            const data = await response.json();
            setPresets(data.presets || []);
        } catch (err) {
            console.error('Failed to load presets:', err);
        }
    };

    // PTZ Move command
    const handleMove = useCallback(async (pan, tilt, zoom) => {
        setIsPanning(true);
        try {
            const response = await fetch(`/api/streams/${encodeURIComponent(streamName)}/ptz/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pan, tilt, zoom })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Move failed');
            }
        } catch (err) {
            if (window.showError) window.showError(`PTZ move failed: ${err.message}`);
        }
    }, [streamName]);

    // PTZ Stop command
    const handleStop = useCallback(async () => {
        setIsPanning(false);
        try {
            await fetch(`/api/streams/${encodeURIComponent(streamName)}/ptz/stop`, {
                method: 'POST'
            });
        } catch (err) {
            console.error('PTZ stop failed:', err);
        }
    }, [streamName]);

    // Go to home position
    const goHome = async () => {
        try {
            const response = await fetch(`/api/streams/${encodeURIComponent(streamName)}/ptz/home`, {
                method: 'POST'
            });
            if (response.ok) {
                if (window.showSuccess) window.showSuccess('Moving to home position');
            }
        } catch (err) {
            if (window.showError) window.showError('Failed to go home');
        }
    };

    // Set home position
    const setHome = async () => {
        try {
            const response = await fetch(`/api/streams/${encodeURIComponent(streamName)}/ptz/sethome`, {
                method: 'POST'
            });
            if (response.ok) {
                if (window.showSuccess) window.showSuccess('Home position set');
            }
        } catch (err) {
            if (window.showError) window.showError('Failed to set home');
        }
    };

    // Go to preset
    const gotoPreset = async (preset) => {
        try {
            const response = await fetch(`/api/streams/${encodeURIComponent(streamName)}/ptz/preset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: preset.token })
            });
            if (response.ok) {
                if (window.showSuccess) window.showSuccess(`Moving to preset: ${preset.name}`);
            }
        } catch (err) {
            if (window.showError) window.showError('Failed to go to preset');
        }
    };

    // Save new preset
    const savePreset = async () => {
        if (!currentPresetName.trim()) {
            if (window.showWarning) window.showWarning('Please enter a preset name');
            return;
        }

        try {
            const response = await fetch(`/api/streams/${encodeURIComponent(streamName)}/ptz/preset`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: currentPresetName.trim() })
            });
            if (response.ok) {
                if (window.showSuccess) window.showSuccess(`Preset "${currentPresetName}" saved`);
                setCurrentPresetName('');
                setShowPresetInput(false);
                loadPresets();
            }
        } catch (err) {
            if (window.showError) window.showError('Failed to save preset');
        }
    };

    // Joystick-style direction buttons
    const DirectionButton = ({ direction, pan, tilt, icon, className }) => (
        <button
            onMouseDown={() => handleMove(pan, tilt, 0)}
            onMouseUp={handleStop}
            onMouseLeave={handleStop}
            onTouchStart={() => handleMove(pan, tilt, 0)}
            onTouchEnd={handleStop}
            className={`
        w-16 h-16 rounded-lg
        bg-gradient-to-br from-blue-500 to-blue-600
        hover:from-blue-600 hover:to-blue-700
        active:from-blue-700 active:to-blue-800
        text-white font-bold text-2xl
        shadow-lg hover:shadow-xl
        transition-all duration-150
        flex items-center justify-center
        select-none touch-manipulation
        ${className}
      `}
            title={direction}
        >
            {icon}
        </button>
    );

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100]">
                <div className="bg-gray-900 p-8 rounded-2xl">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-white mt-4">Loading PTZ controls...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100]">
                <div className="bg-gray-900 p-8 rounded-2xl max-w-md">
                    <h3 className="text-xl font-bold text-red-500 mb-4">PTZ Error</h3>
                    <p className="text-white mb-4">{error}</p>
                    <button onClick={onClose} className="btn-primary w-full">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100] p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full border border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-black text-white">PTZ CONTROL</h2>
                        <p className="text-sm text-gray-400 mt-1">Camera: {streamName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Pan/Tilt Control */}
                    <div>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Pan & Tilt</h3>

                        {/* Joystick Grid */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {/* Top Row */}
                            <DirectionButton direction="Up-Left" pan={-0.5} tilt={0.5} icon="↖" />
                            <DirectionButton direction="Up" pan={0} tilt={0.5} icon="↑" />
                            <DirectionButton direction="Up-Right" pan={0.5} tilt={0.5} icon="↗" />

                            {/* Middle Row */}
                            <DirectionButton direction="Left" pan={-0.5} tilt={0} icon="←" />
                            <button
                                onClick={handleStop}
                                className="w-16 h-16 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center shadow-lg"
                            >
                                ■
                            </button>
                            <DirectionButton direction="Right" pan={0.5} tilt={0} icon="→" />

                            {/* Bottom Row */}
                            <DirectionButton direction="Down-Left" pan={-0.5} tilt={-0.5} icon="↙" />
                            <DirectionButton direction="Down" pan={0} tilt={-0.5} icon="↓" />
                            <DirectionButton direction="Down-Right" pan={0.5} tilt={-0.5} icon="↘" />
                        </div>

                        {/* Zoom Controls */}
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Zoom</h3>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button
                                onMouseDown={() => handleMove(0, 0, 0.5)}
                                onMouseUp={handleStop}
                                onMouseLeave={handleStop}
                                className="py-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg"
                            >
                                + Zoom In
                            </button>
                            <button
                                onMouseDown={() => handleMove(0, 0, -0.5)}
                                onMouseUp={handleStop}
                                onMouseLeave={handleStop}
                                className="py-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg"
                            >
                                − Zoom Out
                            </button>
                        </div>

                        {/* Home Controls */}
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Home Position</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={goHome}
                                className="py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg"
                            >
                                Go Home
                            </button>
                            <button
                                onClick={setHome}
                                className="py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg"
                            >
                                Set Home
                            </button>
                        </div>
                    </div>

                    {/* Right: Presets */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Presets</h3>
                            <button
                                onClick={() => setShowPresetInput(!showPresetInput)}
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-bold"
                            >
                                + New
                            </button>
                        </div>

                        {/* Save New Preset */}
                        {showPresetInput && (
                            <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                                <input
                                    type="text"
                                    value={currentPresetName}
                                    onChange={(e) => setCurrentPresetName(e.target.value)}
                                    placeholder="Preset name..."
                                    className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-white/10 mb-2"
                                    onKeyPress={(e) => e.key === 'Enter' && savePreset()}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={savePreset}
                                        className="py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowPresetInput(false);
                                            setCurrentPresetName('');
                                        }}
                                        className="py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Preset List */}
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {presets.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="text-sm">No presets saved</p>
                                    <p className="text-xs mt-2">Move camera and click "+ New"</p>
                                </div>
                            ) : (
                                presets.map((preset, index) => (
                                    <button
                                        key={preset.token || index}
                                        onClick={() => gotoPreset(preset)}
                                        className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-left transition-colors group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-white font-semibold">{preset.name || `Preset ${index + 1}`}</span>
                                            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white/5 rounded-b-3xl border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>💡 Press and hold direction buttons to move camera</span>
                        <span className={isPanning ? 'text-green-400' : ''}>
                            {isPanning ? '● Moving' : '○ Idle'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
