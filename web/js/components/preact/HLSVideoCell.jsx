/**
 * HLSVideoCell Component
 * A self-contained component for displaying an HLS video stream
 */

import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { DetectionOverlay, takeSnapshotWithDetections } from './DetectionOverlay.jsx';
import { SnapshotButton } from './SnapshotManager.jsx';
import { LoadingIndicator } from './LoadingIndicator.jsx';
import { showSnapshotPreview } from './UI.jsx';
import { PTZControls } from './PTZControls.jsx';
import Hls from 'hls.js';

/**
 * HLSVideoCell component
 * @param {Object} props - Component props
 * @param {Object} props.stream - Stream object
 * @param {Function} props.onToggleFullscreen - Fullscreen toggle handler
 * @param {string} props.streamId - Stream ID for stable reference
 * @returns {JSX.Element} HLSVideoCell component
 */
export function HLSVideoCell({
  stream,
  streamId,
  onToggleFullscreen
}) {
  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // PTZ controls state
  const [showPTZControls, setShowPTZControls] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const cellRef = useRef(null);
  const hlsPlayerRef = useRef(null);
  const detectionOverlayRef = useRef(null);

  // Initialize HLS player when component mounts
  // Fetch motion stats to get "Last Motion" time
  const { data: motionStats } = useQuery(
    ['motionStats', streamName],
    `/api/motion/stats/${encodeURIComponent(streamName)}`,
    { enabled: !!streamName, refetchInterval: 30000 }
  );

  const formatLastMotion = (timestamp) => {
    if (!timestamp) return 'No motion detected';
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const lastMotionStr = formatLastMotion(motionStats?.newest_recording);

  useEffect(() => {
    if (!stream || !stream.name || !videoRef.current) return;

    console.log(`Initializing HLS player for stream ${stream.name}`);
    setIsLoading(true);
    setError(null);

    // Build the HLS stream URL with cache-busting timestamp to prevent stale data
    const timestamp = Date.now();
    const hlsStreamUrl = `/hls/${encodeURIComponent(stream.name)}/index.m3u8?_t=${timestamp}`;

    // Check if HLS.js is supported
    if (Hls.isSupported()) {
      console.log(`Using HLS.js for stream ${stream.name}`);
      const hls = new Hls({
        // Buffer management - optimized to prevent stalling
        maxBufferLength: 30,            // Maximum buffer length in seconds
        maxMaxBufferLength: 60,         // Maximum maximum buffer length
        backBufferLength: 10,           // Back buffer to prevent memory issues

        // Live stream settings - more conservative to prevent buffer stalls
        liveSyncDurationCount: 4,       // Increased from 3 - more buffer before playback
        liveMaxLatencyDurationCount: 12, // Increased from 10 - allow more latency before seeking
        liveDurationInfinity: false,    // Don't treat live streams as infinite
        lowLatencyMode: false,          // Disable low latency for stability

        // High water mark - start playback with more buffer
        highBufferWatchdogPeriod: 3,    // Check buffer health every 3 seconds

        // Loading timeouts
        fragLoadingTimeOut: 30000,      // Fragment loading timeout
        manifestLoadingTimeOut: 20000,  // Manifest loading timeout
        levelLoadingTimeOut: 20000,     // Level loading timeout

        // Quality settings
        startLevel: -1,                 // Auto-select quality
        abrEwmaDefaultEstimate: 500000, // Conservative bandwidth estimate
        abrBandWidthFactor: 0.7,        // Conservative bandwidth factor
        abrBandWidthUpFactor: 0.5,      // Conservative quality increase

        // Worker and debugging
        enableWorker: true,             // Use web worker for better performance
        debug: false,                   // Disable debug logging

        // Buffer flushing - important for preventing appendBuffer errors
        maxBufferHole: 0.5,             // Maximum buffer hole tolerance
        maxFragLookUpTolerance: 0.25,   // Fragment lookup tolerance
        nudgeMaxRetry: 5,               // Retry attempts for buffer nudging

        // Append error handling - increased retries for better recovery
        appendErrorMaxRetry: 5,         // Retry appending on error

        // Manifest refresh
        manifestLoadingMaxRetry: 3,     // Retry manifest loading
        manifestLoadingRetryDelay: 1000 // Delay between manifest retries
      });

      hls.loadSource(hlsStreamUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        setIsLoading(false);
        setIsPlaying(true);

        videoRef.current.play().catch(error => {
          console.warn('Auto-play prevented:', error);
          // We'll handle this with the play button overlay
        });
      });

      hls.on(Hls.Events.ERROR, function (event, data) {
        // Handle non-fatal errors
        if (!data.fatal) {
          // Don't log or recover from bufferStalledError - it's normal and HLS.js handles it
          if (data.details === 'bufferStalledError') {
            // This is a normal buffering event, HLS.js will handle it automatically
            // Don't call recoverMediaError() as it causes black flicker
            return;
          }

          console.log(`HLS non-fatal error: ${data.type}, details: ${data.details}`);

          // Handle other media errors by trying to recover
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.warn('Non-fatal media error, attempting recovery:', data.details);
            hls.recoverMediaError();
          } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn('Non-fatal network error:', data.details);
            // Network errors often resolve themselves, just log them
          }
          return;
        }

        // Log fatal errors
        console.error(`HLS fatal error: ${data.type}, details: ${data.details}`);

        // Handle fatal errors
        console.error('Fatal HLS error:', data);

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('Fatal network error encountered, trying to recover');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('Fatal media error encountered, trying to recover');
            hls.recoverMediaError();
            break;
          default:
            // Cannot recover
            hls.destroy();
            setError(data.details || 'HLS playback error');
            setIsLoading(false);
            setIsPlaying(false);
            break;
        }
      });

      // Store hls instance for cleanup
      // Note: We removed the periodic refresh as it was causing buffer state issues
      // HLS.js will automatically handle manifest refreshes for live streams
      hlsPlayerRef.current = hls;
    }
    // Check if HLS is supported natively (Safari)
    else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      console.log(`Using native HLS support for stream ${stream.name}`);
      // Native HLS support (Safari)
      videoRef.current.src = hlsStreamUrl;
      videoRef.current.addEventListener('loadedmetadata', function () {
        setIsLoading(false);
        setIsPlaying(true);
      });

      videoRef.current.addEventListener('error', function () {
        setError('HLS stream failed to load');
        setIsLoading(false);
        setIsPlaying(false);
      });
    } else {
      // Fallback for truly unsupported browsers
      console.error(`HLS not supported for stream ${stream.name} - neither HLS.js nor native support available`);
      setError('HLS not supported by your browser - please use a modern browser');
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      console.log(`Cleaning up HLS player for stream ${stream.name}`);

      // Destroy HLS instance
      if (hlsPlayerRef.current) {
        hlsPlayerRef.current.destroy();
        hlsPlayerRef.current = null;
      }

      // Reset video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, [stream]);

  // Handle retry button click
  const handleRetry = () => {
    // Force a re-render to restart the HLS player
    setError(null);
    setIsLoading(true);
    setIsPlaying(false);

    // Clean up existing player
    if (hlsPlayerRef.current) {
      hlsPlayerRef.current.destroy();
      hlsPlayerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }

    // Fetch updated stream info and reinitialize
    fetch(`/api/streams/${encodeURIComponent(stream.name)}`)
      .then(response => response.json())
      .then(updatedStream => {
        // Force a re-render by updating state
        setIsLoading(true);
      })
      .catch(error => {
        console.error(`Error fetching stream info for retry: ${error}`);
        setError('Failed to reconnect');
        setIsLoading(false);
      });
  };

  return (
    <div
      className="group relative bg-[#0d1726]/80 backdrop-blur-sm border border-white/5 rounded-[2rem] overflow-hidden transition-all duration-500 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] h-full flex flex-col"
      data-stream-name={stream.name}
      data-stream-id={streamId}
      ref={cellRef}
    >
      {/* Main Video Container */}
      <div className="relative flex-1 overflow-hidden">
        <video
          id={`video-${streamId.replace(/\s+/g, '-')}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          ref={videoRef}
          autoPlay
          muted
          playsInline
        />

        {/* Detection overlay component */}
        {stream.detection_based_recording && stream.detection_model && (
          <DetectionOverlay
            ref={detectionOverlayRef}
            streamName={stream.name}
            videoRef={videoRef}
            enabled={isPlaying}
            detectionModel={stream.detection_model}
          />
        )}

        {/* Gradient Overlay for Sleek Look */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1726] via-transparent to-transparent opacity-60"></div>

        {/* Top Controls Overlay (appears on hover) */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0 z-20">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                if (videoRef.current) {
                  let canvasRef = null;
                  if (detectionOverlayRef.current && typeof detectionOverlayRef.current.getCanvasRef === 'function') {
                    canvasRef = detectionOverlayRef.current.getCanvasRef();
                  }
                  if (canvasRef) {
                    const snapshot = takeSnapshotWithDetections(videoRef, canvasRef, stream.name);
                    if (snapshot) {
                      showSnapshotPreview(snapshot.canvas.toDataURL('image/jpeg', 0.95), `Snapshot: ${stream.name}`);
                    }
                  } else {
                    const videoElement = videoRef.current;
                    const canvas = document.createElement('canvas');
                    canvas.width = videoElement.videoWidth;
                    canvas.height = videoElement.videoHeight;
                    if (canvas.width > 0 && canvas.height > 0) {
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                      showSnapshotPreview(canvas.toDataURL('image/jpeg', 0.95), `Snapshot: ${stream.name}`);
                    }
                  }
                }
              }}
              className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white transition-all hover:scale-110 active:scale-95" title="Snapshot">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {stream.ptz_enabled && (
              <button
                onClick={() => setShowPTZControls(!showPTZControls)}
                className={`p-3 backdrop-blur-md rounded-2xl border transition-all hover:scale-110 active:scale-95 ${showPTZControls ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`} title="PTZ Controls">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}

            <button
              onClick={(e) => onToggleFullscreen(stream.name, e, cellRef.current)}
              className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white transition-all hover:scale-110 active:scale-95" title="Fullscreen">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>

          <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-white">{stream.name}</span>
          </div>
        </div>

        {/* PTZ Controls overlay */}
        <PTZControls
          stream={stream}
          isVisible={showPTZControls}
          onClose={() => setShowPTZControls(false)}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1726]/40 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Negotiating HLS...</span>
            </div>
          </div>
        )}

        {/* Error indicator */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1726] z-30 p-8 text-center">
            <div className="flex flex-col items-center max-w-[280px]">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">Signal Interrupted</h3>
              <p className="text-gray-500 text-xs mb-8 leading-relaxed font-bold">{error}</p>
              <button
                onClick={handleRetry}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/40"
              >
                Reconnect Node
              </button>
            </div>
          </div>
        )}

        {/* Play button overlay */}
        {!isPlaying && !isLoading && !error && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20 cursor-pointer group/play"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.play()
                  .then(() => {
                    setIsPlaying(true);
                  })
                  .catch(error => {
                    console.error('Play failed:', error);
                  });
              }
            }}
          >
            <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30 group-hover/play:scale-110 group-hover/play:bg-blue-600/40 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" className="ml-1">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info Bar - Premium Brand Styling */}
      <div className="bg-[#03070c]/60 backdrop-blur-md px-8 py-5 border-t border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Last Motion</span>
            <span className="text-xs font-black text-blue-400 uppercase tracking-widest leading-none mt-0.5">{lastMotionStr.toUpperCase()}</span>
          </div>
          <div className="flex items-center space-x-3 px-4 py-2 bg-green-500/10 rounded-xl border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active</span>
          </div>
        </div>

        {/* Decorative separator with animation */}
        <div className="h-[2px] w-full bg-white/5 relative overflow-hidden rounded-full">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent w-1/2 animate-[shimmer_3s_infinite]"></div>
        </div>
      </div>
    </div>
  );

}
