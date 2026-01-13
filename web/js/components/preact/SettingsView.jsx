/**
 * LightNVR Web Interface SettingsView Component
 * Preact component for the settings page
 */

import { useState, useEffect } from 'preact/hooks';
import { showStatusMessage } from './ToastContainer.jsx';
import { ContentLoader } from './LoadingIndicator.jsx';
import { useQuery, useMutation, fetchJSON } from '../../query-client.js';
import { ThemeCustomizer } from './ThemeCustomizer.jsx';
import { validateSession } from '../../utils/auth-utils.js';
import { MainLayout } from './MainLayout.jsx';

/**
 * SettingsView component
 * @returns {JSX.Element} SettingsView component
 */
export function SettingsView() {
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    logLevel: '2',
    storagePath: '/var/lib/lightnvr/recordings',
    storagePathHls: '',
    maxStorage: '500',
    retention: '90',
    autoDelete: true,
    dbPath: '/var/lib/lightnvr/lightnvr.db',
    webPort: '8080',
    authEnabled: true,
    username: 'admin',
    password: 'admin',
    webrtcDisabled: false,
    bufferSize: '1024',
    useSwap: true,
    swapSize: '128',
    detectionModelsPath: '',
    defaultDetectionThreshold: 50,
    defaultPreBuffer: 5,
    defaultPostBuffer: 10,
    bufferStrategy: 'auto'
  });

  // Fetch user role on mount
  useEffect(() => {
    async function fetchUserRole() {
      const session = await validateSession();
      if (session.valid) {
        setUserRole(session.role);
      } else {
        setUserRole('');
      }
    }
    fetchUserRole();
  }, []);

  const roleLoading = userRole === null;
  const canModifySettings = true; // Always allow editing
  const isViewer = userRole === 'viewer';

  const {
    data: settingsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['settings'],
    '/api/settings',
    {
      timeout: 15000,
      retries: 2,
      retryDelay: 1000
    }
  );

  const saveSettingsMutation = useMutation({
    mutationKey: ['saveSettings'],
    mutationFn: async (mappedSettings) => {
      return await fetchJSON('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mappedSettings),
        timeout: 20000,
        retries: 1,
        retryDelay: 2000
      });
    },
    onSuccess: () => {
      showStatusMessage('Settings saved successfully');
      refetch();
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      showStatusMessage(`Error saving settings: ${error.message}`);
    }
  });

  useEffect(() => {
    if (settingsData) {
      const mappedData = {
        logLevel: settingsData.log_level?.toString() || '',
        storagePath: settingsData.storage_path || '',
        storagePathHls: settingsData.storage_path_hls || '',
        maxStorage: settingsData.max_storage_size?.toString() || '',
        retention: settingsData.retention_days?.toString() || '',
        autoDelete: settingsData.auto_delete_oldest || false,
        dbPath: settingsData.db_path || '',
        webPort: settingsData.web_port?.toString() || '',
        authEnabled: settingsData.web_auth_enabled || false,
        username: settingsData.web_username || '',
        password: settingsData.web_password || '',
        webrtcDisabled: settingsData.webrtc_disabled || false,
        bufferSize: settingsData.buffer_size?.toString() || '',
        useSwap: settingsData.use_swap || false,
        swapSize: settingsData.swap_size?.toString() || '',
        detectionModelsPath: settingsData.models_path || '',
        defaultDetectionThreshold: settingsData.default_detection_threshold || 50,
        defaultPreBuffer: settingsData.pre_detection_buffer?.toString() || '5',
        defaultPostBuffer: settingsData.post_detection_buffer?.toString() || '10',
        bufferStrategy: settingsData.buffer_strategy || 'auto'
      };

      setSettings(prev => ({
        ...prev,
        ...mappedData
      }));
    }
  }, [settingsData]);

  const saveSettings = () => {
    const mappedSettings = {
      log_level: parseInt(settings.logLevel, 10),
      storage_path: settings.storagePath,
      storage_path_hls: settings.storagePathHls,
      max_storage_size: parseInt(settings.maxStorage, 10),
      retention_days: parseInt(settings.retention, 10),
      auto_delete_oldest: settings.autoDelete,
      db_path: settings.dbPath,
      web_port: parseInt(settings.webPort, 10),
      web_auth_enabled: settings.authEnabled,
      web_username: settings.username,
      web_password: settings.password,
      webrtc_disabled: settings.webrtcDisabled,
      buffer_size: parseInt(settings.bufferSize, 10),
      use_swap: settings.useSwap,
      swap_size: parseInt(settings.swapSize, 10),
      models_path: settings.detectionModelsPath,
      default_detection_threshold: settings.defaultDetectionThreshold,
      pre_detection_buffer: parseInt(settings.defaultPreBuffer, 10),
      post_detection_buffer: parseInt(settings.defaultPostBuffer, 10),
      buffer_strategy: settings.bufferStrategy
    };

    saveSettingsMutation.mutate(mappedSettings);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleThresholdChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setSettings(prev => ({
      ...prev,
      defaultDetectionThreshold: value
    }));
  };

  const renderSectionIcon = (type) => {
    switch (type) {
      case 'general':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>;
      case 'storage':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>;
      case 'network':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>;
      case 'security':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
      case 'detection':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
      case 'appearance':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.828 2.828a2 2 0 010 2.828l-1.657 1.657m-4.243-4.243L7 11.586" /></svg>;
      case 'export':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
      default:
        return null;
    }
  };

  const navItem = (id, label) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-3 px-6 py-4 border-l-4 transition-all duration-300 ${activeTab === id
        ? 'bg-blue-600/10 border-blue-500 text-blue-400'
        : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
        }`}
    >
      {renderSectionIcon(id)}
      <span className="font-bold text-sm tracking-wide uppercase">{label}</span>
      {activeTab === id && (
        <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
      )}
    </button>
  );

  return (
    <MainLayout currentPath="/settings.html">
      <div className="min-h-screen bg-[#0f172a] text-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </span>
                SYSTEM CONFIGURATION
              </h1>
              <p className="text-gray-400 mt-2 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20 animate-pulse"></span>
                Node Management & Performance Tuning
              </p>
            </div>

            <div className="flex items-center gap-4">
              {canModifySettings && (
                <button
                  onClick={saveSettings}
                  disabled={saveSettingsMutation.isLoading}
                  className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-blue-900/40 active:scale-95 disabled:opacity-50"
                >
                  {saveSettingsMutation.isLoading ? 'Processing...' : 'APPLY CHANGES'}
                </button>
              )}
            </div>
          </div>

          <ContentLoader
            isLoading={isLoading}
            hasData={!!settingsData}
            loadingMessage="Synchronizing configuration state..."
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1 rounded-3xl bg-[#1e293b]/50 backdrop-blur-xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5">
                  <h3 className="text-xs font-black text-gray-500 tracking-[0.2em] uppercase">Control Panel</h3>
                </div>
                <div className="flex flex-col">
                  {navItem('general', 'General')}
                  {navItem('storage', 'Storage')}
                  {navItem('network', 'Network')}
                  {navItem('security', 'Security')}
                  {navItem('detection', 'Detection')}
                  {navItem('export', 'Export')}
                  {navItem('appearance', 'Appearance')}
                </div>
                <div className="p-6 mt-12">
                  <div className="bg-blue-600/5 rounded-2xl p-4 border border-blue-600/10">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Protection Level</p>
                    <p className="text-xs text-blue-200 opacity-70 leading-relaxed font-medium">Enterprise data-at-rest encryption ACTIVE.</p>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3">
                <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                  {/* Glassmorphism Background Decoration */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-all duration-700 group-hover:bg-blue-600/10"></div>

                  {activeTab === 'general' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <div className="section-header">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">General Settings</h2>
                        <p className="text-gray-400 text-sm font-medium">Configure core system behavior and logging.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Log Level</label>
                          <select
                            name="logLevel"
                            disabled={!canModifySettings}
                            value={settings.logLevel}
                            onChange={handleInputChange}
                            className="w-full bg-[#334155]/30 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none font-bold"
                          >
                            <option value="0">0 - ERROR (Production)</option>
                            <option value="1">1 - WARNING (Minimal)</option>
                            <option value="2">2 - INFO (Standard)</option>
                            <option value="3">3 - DEBUG (Verbose)</option>
                          </select>
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Memory Buffer Optimization</label>
                          <div className="bg-blue-600/5 rounded-2xl p-6 border border-blue-600/10">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm font-bold text-gray-300">Buffer Size (KB)</span>
                              <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-black">{settings.bufferSize} KB</span>
                            </div>
                            <input
                              type="range"
                              name="bufferSize"
                              min="128"
                              max="4096"
                              step="128"
                              value={settings.bufferSize}
                              onChange={handleInputChange}
                              className="w-full h-1.5 bg-blue-900/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'storage' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <div className="section-header">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Storage Architecture</h2>
                        <p className="text-gray-400 text-sm font-medium">Manage recording paths and retention policies.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Storage Path</label>
                          <input
                            type="text"
                            name="storagePath"
                            disabled={!canModifySettings}
                            value={settings.storagePath}
                            onChange={handleInputChange}
                            className="w-full bg-[#334155]/30 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Retention (Days)</label>
                            <input
                              type="number"
                              name="retention"
                              disabled={!canModifySettings}
                              value={settings.retention}
                              onChange={handleInputChange}
                              className="w-full bg-[#334155]/30 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Limit (GB)</label>
                            <input
                              type="number"
                              name="maxStorage"
                              disabled={!canModifySettings}
                              value={settings.maxStorage}
                              onChange={handleInputChange}
                              className="w-full bg-[#334155]/30 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-blue-600/5 rounded-2xl border border-blue-600/10">
                          <div>
                            <h4 className="text-sm font-bold text-white">Auto-Cleanup Engine</h4>
                            <p className="text-xs text-gray-400 font-medium">Automatically purge oldest segments when limit is reached.</p>
                          </div>
                          <button
                            onClick={() => handleInputChange({ target: { name: 'autoDelete', type: 'checkbox', checked: !settings.autoDelete } })}
                            className={`w-14 h-8 rounded-full transition-all duration-300 relative ${settings.autoDelete ? 'bg-blue-600' : 'bg-gray-700'}`}
                          >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 ${settings.autoDelete ? 'left-7' : 'left-1'}`}></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'network' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <div className="section-header">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Network Infrastructure</h2>
                        <p className="text-gray-400 text-sm font-medium">Web server and streaming protocol configuration.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Web Port</label>
                          <input
                            type="number"
                            name="webPort"
                            disabled={!canModifySettings}
                            value={settings.webPort}
                            onChange={handleInputChange}
                            className="w-full bg-[#334155]/30 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold"
                          />
                        </div>

                        <div className="flex items-center justify-between p-6 bg-amber-600/5 rounded-2xl border border-amber-600/10">
                          <div>
                            <h4 className="text-sm font-bold text-white">Force HLS Protocol</h4>
                            <p className="text-xs text-gray-400 font-medium">Disable WebRTC ultra-low latency for maximum compatibility.</p>
                          </div>
                          <button
                            onClick={() => handleInputChange({ target: { name: 'webrtcDisabled', type: 'checkbox', checked: !settings.webrtcDisabled } })}
                            className={`w-14 h-8 rounded-full transition-all duration-300 relative ${settings.webrtcDisabled ? 'bg-amber-600' : 'bg-gray-700'}`}
                          >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 ${settings.webrtcDisabled ? 'left-7' : 'left-1'}`}></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <div className="section-header">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Access Control</h2>
                        <p className="text-gray-400 text-sm font-medium">Configure administrator credentials and authentication.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-8">
                        <div className="flex items-center justify-between p-6 bg-red-600/5 rounded-2xl border border-red-600/10">
                          <div>
                            <h4 className="text-sm font-bold text-white">Global Authentication</h4>
                            <p className="text-xs text-gray-400 font-medium">Enforce login for all web interface access.</p>
                          </div>
                          <button
                            onClick={() => handleInputChange({ target: { name: 'authEnabled', type: 'checkbox', checked: !settings.authEnabled } })}
                            className={`w-14 h-8 rounded-full transition-all duration-300 relative ${settings.authEnabled ? 'bg-red-600' : 'bg-gray-700'}`}
                          >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 ${settings.authEnabled ? 'left-7' : 'left-1'}`}></div>
                          </button>
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Admin Username</label>
                          <input
                            type="text"
                            name="username"
                            disabled={!canModifySettings}
                            value={settings.username}
                            onChange={handleInputChange}
                            className="w-full bg-[#334155]/30 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Admin Password</label>
                          <input
                            type="password"
                            name="password"
                            disabled={!canModifySettings}
                            value={settings.password}
                            onChange={handleInputChange}
                            className="w-full bg-[#334155]/30 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-2xl tracking-[0.5em]"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'detection' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <div className="section-header">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Intelligence Engine</h2>
                        <p className="text-gray-400 text-sm font-medium">Fine-tune object detection and buffering parameters.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-4 p-6 bg-emerald-600/5 rounded-2xl border border-emerald-600/10">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Confidence Threshold</label>
                            <span className="text-2xl font-black text-emerald-400">{settings.defaultDetectionThreshold}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings.defaultDetectionThreshold}
                            onChange={handleThresholdChange}
                            className="w-full h-1.5 bg-emerald-900/30 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Pre-Buffer (SEC)</label>
                            <input
                              type="number"
                              name="defaultPreBuffer"
                              disabled={!canModifySettings}
                              value={settings.defaultPreBuffer}
                              onChange={handleInputChange}
                              className="w-full bg-[#334155]/30 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Post-Buffer (SEC)</label>
                            <input
                              type="number"
                              name="defaultPostBuffer"
                              disabled={!canModifySettings}
                              value={settings.defaultPostBuffer}
                              onChange={handleInputChange}
                              className="w-full bg-[#334155]/30 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Buffer Strategy</label>
                          <select
                            name="bufferStrategy"
                            disabled={!canModifySettings}
                            value={settings.bufferStrategy}
                            onChange={handleInputChange}
                            className="w-full bg-[#334155]/30 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none font-bold"
                          >
                            <option value="auto">AUTO OPTIMIZED</option>
                            <option value="go2rtc">GO2RTC NATIVE</option>
                            <option value="hls_segment">HLS SEGMENTATION</option>
                            <option value="memory_packet">MEMORY PACKET</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'export' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <div className="section-header">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Export Configuration</h2>
                        <p className="text-gray-400 text-sm font-medium">Configure video export settings and storage management.</p>
                      </div>

                      {/* Export Folder Path */}
                      <div className="bg-white/3 rounded-2xl p-6 border border-white/10">
                        <label className="block text-xs font-black text-gray-300 uppercase tracking-widest mb-3">Export Folder Path</label>
                        <input
                          type="text"
                          value={formSettings.export_folder || 'local/recordings/export'}
                          onChange={(e) => setFormSettings({ ...formSettings, export_folder: e.target.value })}
                          className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                          placeholder="local/recordings/export"
                          disabled={!canModifySettings}
                        />
                        <p className="mt-2 text-xs text-gray-500">Exported videos will be saved to this folder</p>
                      </div>

                      {/* Format & Quality */}
                      <div className="bg-white/3 rounded-2xl p-6 border border-white/10">
                        <label className="block text-xs font-black text-gray-300 uppercase tracking-widest mb-3">Video Codec</label>
                        <select
                          value={formSettings.export_video_codec || 'copy'}
                          onChange={(e) => setFormSettings({ ...formSettings, export_video_codec: e.target.value })}
                          className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          disabled={!canModifySettings}
                        >
                          <option value="copy">Copy (No Re-encode - Fastest)</option>
                          <option value="h264">H.264 (High Compatibility)</option>
                          <option value="h265">H.265/HEVC (Better Compression)</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500">Copy is recommended for fast, lossless exports</p>
                      </div>

                      {/* Storage Management */}
                      <div className="bg-white/3 rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <label className="block text-xs font-black text-gray-300 uppercase tracking-widest">Auto-Cleanup Exports</label>
                            <p className="text-xs text-gray-500 mt-1">Automatically delete old exports to save space</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formSettings.export_auto_cleanup || false}
                              onChange={(e) => setFormSettings({ ...formSettings, export_auto_cleanup: e.target.checked })}
                              className="sr-only peer"
                              disabled={!canModifySettings}
                            />
                            <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        {formSettings.export_auto_cleanup && (
                          <div className="mt-4 space-y-4">
                            <div>
                              <label className="block text-xs font-black text-gray-300 uppercase tracking-widest mb-2">Export Retention (Days)</label>
                              <input
                                type="number"
                                value={formSettings.export_retention_days || 7}
                                onChange={(e) => setFormSettings({ ...formSettings, export_retention_days: parseInt(e.target.value) })}
                                min="1"
                                max="90"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                disabled={!canModifySettings}
                              />
                              <p className="mt-2 text-xs text-gray-500">Exports older than this will be automatically deleted</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Format Info */}
                      <div className="bg-blue-600/5 rounded-2xl p-6 border border-blue-600/20">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <div>
                            <p className="text-blue-400 font-bold text-sm mb-1">Export Information</p>
                            <p className="text-blue-200/70 text-xs leading-relaxed">Exports use FFmpeg concatenation to merge multiple recordings into a single MP4 file. The "Copy" codec option provides the fastest export with no quality loss.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'appearance' && (

                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <div className="section-header">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Visual Experience</h2>
                        <p className="text-gray-400 text-sm font-medium">Customize the PRO NVR Enterprise branding and theme.</p>
                      </div>

                      <div className="p-2">
                        <ThemeCustomizer />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ContentLoader>
        </div>
      </div>
    </MainLayout>
  );
}
