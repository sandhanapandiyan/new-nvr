/**
 * Premium Theme Customizer Component for PRO NVR Enterprise
 * Allows users to customize color themes and intensity with glassmorphism UI
 */

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { COLOR_THEMES, applyThemeColors } from '../../utils/theme-init.js';

/**
 * ThemeCustomizer component
 * @returns {JSX.Element} ThemeCustomizer component
 */
export function ThemeCustomizer() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true); // Default to dark for Enterprise UI
  const [colorIntensity, setColorIntensity] = useState(60);
  const [colorTheme, setColorTheme] = useState('default');

  // Load saved preferences from localStorage
  useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem('lightnvr-theme');
    const savedIntensity = localStorage.getItem('lightnvr-color-intensity');
    const savedColorTheme = localStorage.getItem('lightnvr-color-theme');

    // Enterprise UI defaults to dark mode
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      setIsDark(true);
    }

    // Load intensity
    if (savedIntensity) {
      setColorIntensity(parseInt(savedIntensity));
    }

    // Load color theme
    if (savedColorTheme && COLOR_THEMES[savedColorTheme]) {
      setColorTheme(savedColorTheme);
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;

    // Apply dark/light mode class
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply color theme and intensity
    applyThemeColors(isDark, colorTheme, colorIntensity);

    // Save to localStorage
    localStorage.setItem('lightnvr-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('lightnvr-color-intensity', colorIntensity.toString());
    localStorage.setItem('lightnvr-color-theme', colorTheme);
  }, [mounted, isDark, colorIntensity, colorTheme]);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  const handleIntensityChange = (e) => {
    setColorIntensity(parseInt(e.target.value));
  };

  const handleThemeChange = (themeId) => {
    setColorTheme(themeId);
  };

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-20 bg-white/5 rounded-3xl"></div>
        <div className="h-40 bg-white/5 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Dark Mode Toggle */}
      <div className="group relative bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-6 transition-all duration-300 hover:border-blue-500/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-500/10"></div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-amber-600/20 text-amber-400'}`}>
              {isDark ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Interface Mode</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Currently optimized for {isDark ? 'Industrial Dark' : 'Daylight Vision'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`w-14 h-8 rounded-full transition-all duration-300 relative ${isDark ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'bg-gray-700'}`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 ${isDark ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>
      </div>

      {/* Color Theme Selection */}
      <div className="space-y-4">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Brand Palette</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(COLOR_THEMES).map(([themeId, themeConfig]) => (
            <button
              key={themeId}
              onClick={() => handleThemeChange(themeId)}
              className={`relative group overflow-hidden p-6 rounded-3xl border transition-all duration-500 ${colorTheme === themeId
                  ? 'bg-blue-600/10 border-blue-500 shadow-xl shadow-blue-900/20'
                  : 'bg-white/5 border-white/5 hover:border-white/20'
                }`}
            >
              {/* Highlight background */}
              {colorTheme === themeId && (
                <div className="absolute inset-0 bg-blue-600/5 animate-pulse"></div>
              )}

              <div className="relative z-10 flex flex-col items-center gap-3">
                <span className={`text-3xl transition-transform duration-500 group-hover:scale-110 ${colorTheme === themeId ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'grayscale group-hover:grayscale-0 opacity-50 group-hover:opacity-100'}`}>
                  {themeConfig.icon}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${colorTheme === themeId ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                  {themeConfig.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Intensity Control */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Visual Saturation</label>
          <span className="text-xl font-black text-blue-400">{colorIntensity}%</span>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-8">
          <div className="space-y-8">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={colorIntensity}
              onChange={handleIntensityChange}
              className="w-full h-2 bg-blue-900/30 rounded-lg appearance-none cursor-pointer accent-blue-500 shadow-inner"
            />

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Subtle', val: 25 },
                { label: 'Balanced', val: 60 },
                { label: 'Hyper-Bold', val: 90 }
              ].map(preset => (
                <button
                  onClick={() => setColorIntensity(preset.val)}
                  className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${colorIntensity === preset.val
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Console */}
      <div className="space-y-4">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">System Preview</label>
        <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-8 overflow-hidden relative group">
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="aspect-video rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center overflow-hidden">
              <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin"></div>
            </div>
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded-xl bg-blue-600/20 border border-blue-500/30"></div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-white/5"></div>
                <div className="h-2 w-5/6 rounded-full bg-white/5"></div>
                <div className="h-2 w-4/6 rounded-full bg-white/5"></div>
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-10 flex-1 rounded-xl bg-blue-600 shadow-lg shadow-blue-900/40"></div>
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
