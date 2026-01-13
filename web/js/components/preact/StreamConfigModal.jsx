/**
 * Premium Stream Configuration Modal Component for PRO NVR Enterprise
 * Features glassmorphism UI, modern typography, and refined accordion sections
 */

import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { ZoneEditor } from './ZoneEditor.jsx';

/**
 * Enterprise Accordion Section Component
 */
function AccordionSection({ title, isExpanded, onToggle, children, badge, icon }) {
  return (
    <div className={`mb-4 transition-all duration-500 ${isExpanded ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5'} border rounded-[2rem] overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-all duration-300"
      >
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-2xl transition-all duration-500 ${isExpanded ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-gray-500'}`}>
            {icon || (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <div>
            <h4 className={`text-sm font-black uppercase tracking-widest ${isExpanded ? 'text-white' : 'text-gray-400'}`}>{title}</h4>
            {badge && (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mt-1 block">
                {badge}
              </span>
            )}
          </div>
        </div>
        <svg
          className={`w-5 h-5 transition-all duration-500 ${isExpanded ? 'transform rotate-180 text-blue-400' : 'text-gray-600'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="p-8 pt-0 space-y-6 border-t border-white/5">
          <div className="pt-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Stream Configuration Modal
 */
export function StreamConfigModal({
  isEditing,
  currentStream,
  detectionModels,
  expandedSections,
  onToggleSection,
  onInputChange,
  onThresholdChange,
  onTestConnection,
  onTestMotion,
  onSave,
  onClose,
  onRefreshModels
}) {
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [detectionZones, setDetectionZones] = useState(currentStream.detectionZones || []);
  const [zonesLoading, setZonesLoading] = useState(false);

  // Load zones from API when modal opens for existing stream
  useEffect(() => {
    const loadZones = async () => {
      if (!isEditing || !currentStream.name) {
        return;
      }

      setZonesLoading(true);
      try {
        const response = await fetch(`/api/streams/${encodeURIComponent(currentStream.name)}/zones`);
        if (response.ok) {
          const data = await response.json();
          if (data.zones && Array.isArray(data.zones)) {
            setDetectionZones(data.zones);
            onInputChange({ target: { name: 'detectionZones', value: data.zones } });
          }
        }
      } catch (error) {
        console.error('Error loading zones:', error);
      } finally {
        setZonesLoading(false);
      }
    };

    loadZones();
  }, [isEditing, currentStream.name]);

  const handleZonesChange = (zones) => {
    setDetectionZones(zones);
    onInputChange({ target: { name: 'detectionZones', value: zones } });
  };

  const inputClass = "w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-600";
  const labelClass = "block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1";

  return (
    <Fragment>
      {showZoneEditor && (
        <ZoneEditor
          streamName={currentStream.name}
          zones={detectionZones}
          onZonesChange={handleZonesChange}
          onClose={() => setShowZoneEditor(false)}
        />
      )}

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}></div>

        {/* Modal Container */}
        <div className="relative w-full max-w-5xl bg-[#1e293b] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-500">

          {/* Header */}
          <div className="flex justify-between items-center p-10 border-b border-white/5 flex-shrink-0 relative">
            {/* Decorative glow */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

            <div className="relative z-10">
              <h3 className="text-3xl font-black text-white uppercase tracking-tight">
                {isEditing ? 'Pulse Core Configuration' : 'Integrate Local Node'}
              </h3>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                Node Metadata & Intelligent Logic Synthesis
              </p>
            </div>
            <button
              onClick={onClose}
              className="relative z-10 p-4 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all duration-300 group"
            >
              <svg className="w-6 h-6 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
            <form id="stream-form" className="space-y-4">

              {/* Basic Settings */}
              <AccordionSection
                title="Telemetry & Core Parameters"
                isExpanded={expandedSections.basic}
                onToggle={() => onToggleSection('basic')}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Node Identifier</label>
                    <input
                      type="text"
                      name="name"
                      className={`${inputClass} font-mono ${isEditing ? 'opacity-50 grayscale' : ''}`}
                      value={currentStream.name}
                      onInput={onInputChange}
                      disabled={isEditing}
                      placeholder="e.g. front_dock_main"
                      required
                    />
                    {isEditing && (
                      <p className="mt-2 text-[9px] font-bold text-blue-400 uppercase tracking-widest ml-1">Immutability Protocol Active: Identifier cannot be modified</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Transport Endpoint (RTSP URL)</label>
                    <input
                      type="text"
                      name="url"
                      className={`${inputClass} font-mono`}
                      placeholder="rtsp://192.168.1.100:554/live"
                      value={currentStream.url}
                      onInput={onInputChange}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="checkbox"
                        id="stream-enabled"
                        name="enabled"
                        className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer"
                        checked={currentStream.enabled}
                        onChange={onInputChange}
                      />
                      <label htmlFor="stream-enabled" className="text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer">Active</label>
                    </div>
                    <div className="flex items-center space-x-2 flex-1 border-l border-white/5 pl-4">
                      <input
                        type="checkbox"
                        id="stream-streaming-enabled"
                        name="streamingEnabled"
                        className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer"
                        checked={currentStream.streamingEnabled}
                        onChange={onInputChange}
                      />
                      <label htmlFor="stream-streaming-enabled" className="text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer">Live Mesh</label>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <input
                      type="checkbox"
                      id="stream-is-onvif"
                      name="isOnvif"
                      className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer"
                      checked={currentStream.isOnvif}
                      onChange={onInputChange}
                    />
                    <label htmlFor="stream-is-onvif" className="text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer">ONVIF Intelligence</label>
                  </div>

                  {currentStream.isOnvif && (
                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-blue-600/5 rounded-[2rem] border border-blue-500/20">
                      <div className="md:col-span-3 pb-2 border-b border-white/5">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Authentication Matrix</h4>
                      </div>
                      <div>
                        <label className={labelClass}>Operator</label>
                        <input type="text" name="onvifUsername" className={inputClass} value={currentStream.onvifUsername || ''} onInput={onInputChange} placeholder="admin" />
                      </div>
                      <div>
                        <label className={labelClass}>Keyphrase</label>
                        <input type="password" name="onvifPassword" className={inputClass} value={currentStream.onvifPassword || ''} onInput={onInputChange} placeholder="••••••••" />
                      </div>
                      <div>
                        <label className={labelClass}>Profile ID</label>
                        <input type="text" name="onvifProfile" className={inputClass} value={currentStream.onvifProfile || ''} onInput={onInputChange} placeholder="Profile_0" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:col-span-2">
                    <div>
                      <label className={labelClass}>Horizontal</label>
                      <input type="number" name="width" className={inputClass} value={currentStream.width} onInput={onInputChange} />
                    </div>
                    <div>
                      <label className={labelClass}>Vertical</label>
                      <input type="number" name="height" className={inputClass} value={currentStream.height} onInput={onInputChange} />
                    </div>
                    <div>
                      <label className={labelClass}>Cadence (FPS)</label>
                      <input type="number" name="fps" className={inputClass} value={currentStream.fps} onInput={onInputChange} />
                    </div>
                    <div>
                      <label className={labelClass}>Protocol</label>
                      <select name="protocol" className={inputClass} value={currentStream.protocol} onChange={onInputChange}>
                        <option value="0">TCP Industrial</option>
                        <option value="1">UDP Dynamic</option>
                      </select>
                    </div>
                  </div>
                </div>
              </AccordionSection>

              {/* Recording Settings */}
              <AccordionSection
                title="Distributed Archival Strategy"
                isExpanded={expandedSections.recording}
                onToggle={() => onToggleSection('recording')}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>}
              >
                <div className="space-y-8">
                  <div className="flex flex-wrap gap-6 bg-white/5 p-6 rounded-[2rem] border border-white/5">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" id="stream-record" name="record" className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer" checked={currentStream.record} onChange={onInputChange} />
                      <label htmlFor="stream-record" className="text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer">Continuous Stream Capture</label>
                    </div>
                    <div className="flex items-center space-x-3 border-l border-white/5 pl-6">
                      <input type="checkbox" id="stream-record-audio" name="recordAudio" className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer" checked={currentStream.recordAudio} onChange={onInputChange} />
                      <label htmlFor="stream-record-audio" className="text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer">Acoustic Logic</label>
                    </div>
                    <div className="flex items-center space-x-3 border-l border-white/5 pl-6">
                      <input type="checkbox" id="stream-backchannel-enabled" name="backchannelEnabled" className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer" checked={currentStream.backchannelEnabled} onChange={onInputChange} />
                      <label htmlFor="stream-backchannel-enabled" className="text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer">Universal Intercom</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <label className={labelClass}>Archival Lifespan (Days)</label>
                      <input type="number" name="retentionDays" className={inputClass} min="0" value={currentStream.retentionDays || 0} onInput={onInputChange} />
                      <p className="mt-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">0 = Indefinite Retention</p>
                    </div>
                    <div>
                      <label className={labelClass}>Intelligence Persistence</label>
                      <input type="number" name="detectionRetentionDays" className={inputClass} min="0" value={currentStream.detectionRetentionDays || 0} onInput={onInputChange} />
                      <p className="mt-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Detections Only</p>
                    </div>
                    <div>
                      <label className={labelClass}>Node Quota (MB)</label>
                      <input type="number" name="maxStorageMb" className={inputClass} min="0" step="1024" value={currentStream.maxStorageMb || 0} onInput={onInputChange} />
                      <p className="mt-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Storage Hard-Limit</p>
                    </div>
                  </div>
                </div>
              </AccordionSection>

              {/* AI Detection */}
              <AccordionSection
                title="Synthetic Vision Intelligence"
                isExpanded={expandedSections.detection}
                onToggle={() => onToggleSection('detection')}
                badge="Neural Core"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.31a2 2 0 00-1.1 1.764V18a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 012-2h3a2 2 0 012 2v0a2 2 0 01.586 1.414l.066.066a2 2 0 002.828 0l.066-.066a2 2 0 01.586-1.414V9a2 2 0 012-2h2.5a2 2 0 012 2v.5a2 2 0 00.586 1.414l.066.066a2 2 0 010 2.828l-.066.066a2 2 0 00-.586 1.414V14a2 2 0 01-2 2h-3a2 2 0 01-2-2v0a2 2 0 01-.586-1.414l-.066-.066a2 2 0 00-2.828 0l-.066.066a2 2 0 01-.586 1.414V19" /></svg>}
              >
                <div className="space-y-8">
                  <div className="flex items-center space-x-4 bg-emerald-600/5 p-6 rounded-[2rem] border border-emerald-500/20">
                    <input
                      type="checkbox"
                      id="stream-detection-enabled"
                      name="detectionEnabled"
                      className="w-6 h-6 rounded-lg border-white/10 bg-white/5 text-emerald-500 focus:ring-0 cursor-pointer"
                      checked={currentStream.detectionEnabled}
                      onChange={onInputChange}
                    />
                    <div>
                      <label htmlFor="stream-detection-enabled" className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] cursor-pointer block">Activate Neural Logic</label>
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Autonomous event triggering based on object classification</p>
                    </div>
                  </div>

                  {currentStream.detectionEnabled && (
                    <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className={labelClass}>Neural Model Architecture</label>
                          <div className="flex space-x-3">
                            <select
                              name="detectionModel"
                              className={inputClass}
                              value={currentStream.detectionModel}
                              onChange={onInputChange}
                            >
                              <option value="">Baseline (None)</option>
                              {detectionModels.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={onRefreshModels}
                              className="p-4 rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Inference Threshold: <span className="text-blue-400">{currentStream.detectionThreshold}%</span></label>
                          <input
                            type="range"
                            name="detectionThreshold"
                            className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-4"
                            min="0"
                            max="100"
                            value={currentStream.detectionThreshold}
                            onInput={onThresholdChange}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                          <label className={labelClass}>Inference Interval</label>
                          <input type="number" name="detectionInterval" className={inputClass} min="1" value={currentStream.detectionInterval} onInput={onInputChange} />
                          <p className="mt-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">N Frames Skip</p>
                        </div>
                        <div>
                          <label className={labelClass}>Pre-Buffer (SEC)</label>
                          <input type="number" name="preBuffer" className={inputClass} min="0" value={currentStream.preBuffer} onInput={onInputChange} />
                          <p className="mt-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Event Pre-Roll</p>
                        </div>
                        <div>
                          <label className={labelClass}>Post-Buffer (SEC)</label>
                          <input type="number" name="postBuffer" className={inputClass} min="0" value={currentStream.postBuffer} onInput={onInputChange} />
                          <p className="mt-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Cooldown Period</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionSection>

              {/* Zones */}
              {currentStream.detectionEnabled && (
                <AccordionSection
                  title="Spatial Intelligence Zones"
                  isExpanded={expandedSections.zones}
                  onToggle={() => onToggleSection('zones')}
                  badge="Coordinates"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-8 bg-white/5 border border-white/5 rounded-[2.5rem]">
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight">
                          {detectionZones.length === 0 ? 'Primitive Field (No Zones)' : `Dynamic Segment Grid: ${detectionZones.length} Active`}
                        </p>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Multi-Polygon coordinate mapping system</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowZoneEditor(true)}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-widest text-white rounded-2xl transition-all shadow-xl shadow-blue-900/40"
                      >
                        Open Cartesian Editor
                      </button>
                    </div>

                    {detectionZones.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {detectionZones.map((zone) => (
                          <div key={zone.id} className="flex items-center justify-between p-4 bg-[#0d1726] border border-white/5 rounded-2xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-4 h-4 rounded-lg shadow-lg shadow-white/5 border border-white/20" style={{ backgroundColor: zone.color }} />
                              <span className="text-[10px] font-black text-white uppercase tracking-widest">{zone.name}</span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${zone.enabled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-white/5 text-gray-700'}`}>
                              {zone.enabled ? 'Active' : 'Offline'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Advanced Controls */}
              <AccordionSection
                title="System Flux & Priority"
                isExpanded={expandedSections.advanced}
                onToggle={() => onToggleSection('advanced')}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className={labelClass}>Compute Priority</label>
                    <select name="priority" className={inputClass} value={currentStream.priority} onChange={onInputChange}>
                      <option value="1">Level 1 (Low)</option>
                      <option value="5">Level 5 (Medium)</option>
                      <option value="10">Level 10 (Critical)</option>
                    </select>
                    <p className="mt-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Resource threading prioritization</p>
                  </div>

                  <div>
                    <label className={labelClass}>Segment Duration (SECONDS)</label>
                    <input type="number" name="segment" className={inputClass} min="30" value={currentStream.segment} onInput={onInputChange} />
                    <p className="mt-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Archival Block Sizing</p>
                  </div>
                </div>
              </AccordionSection>

            </form>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-10 border-t border-white/5 flex-shrink-0 bg-[#0d1726]/60 backdrop-blur-3xl relative z-10">
            <button
              type="button"
              onClick={onTestConnection}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white rounded-2xl transition-all"
            >
              Test Synchronicity
            </button>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-10 py-4 bg-transparent border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all rounded-2xl"
              >
                Terminate
              </button>
              <button
                type="button"
                onClick={onSave}
                className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-[0.2em] text-white rounded-2xl transition-all shadow-xl shadow-blue-900/40"
              >
                {isEditing ? 'Commit Configuration' : 'Integrate Node'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
