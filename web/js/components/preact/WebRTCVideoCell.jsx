/**
 * WebRTCVideoCell Component
 * A self-contained component for displaying a WebRTC video stream
 * with optional two-way audio (backchannel) support
 */

import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { DetectionOverlay, takeSnapshotWithDetections } from './DetectionOverlay.jsx';
import { SnapshotButton } from './SnapshotManager.jsx';
import { LoadingIndicator } from './LoadingIndicator.jsx';
import { showSnapshotPreview } from './UI.jsx';
import { PTZControls } from './PTZControls.jsx';
import adapter from 'webrtc-adapter';
import { useQuery } from '../../query-client.js';

/**
 * WebRTCVideoCell component
 * @param {Object} props - Component props
 * @param {Object} props.stream - Stream object
 * @param {Function} props.onToggleFullscreen - Fullscreen toggle handler
 * @param {string} props.streamId - Stream ID for stable reference
 * @returns {JSX.Element} WebRTCVideoCell component
 */
export function WebRTCVideoCell({
  stream,
  streamId,
  onToggleFullscreen
}) {
  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('unknown'); // 'unknown', 'good', 'poor', 'bad'

  // Backchannel (two-way audio) state
  const [isTalking, setIsTalking] = useState(false);
  const [microphoneError, setMicrophoneError] = useState(null);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [talkMode, setTalkMode] = useState('ptt'); // 'ptt' (push-to-talk) or 'toggle'

  // PTZ controls state
  const [showPTZControls, setShowPTZControls] = useState(false);
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Recording progress state
  const [recProgress, setRecProgress] = useState(0);

  // Recording progress animation (mock based on 10 min segments)
  useEffect(() => {
    if (!stream.recording) {
      setRecProgress(0);
      return;
    }

    const updateProgress = () => {
      // Calculate progress within a 10 minute (600s) window based on current time
      const now = Date.now() / 1000;
      const segmentDuration = 600;
      const currentProgress = (now % segmentDuration) / segmentDuration * 100;
      setRecProgress(currentProgress);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000);

    return () => clearInterval(interval);
  }, [stream.recording]);

  // Refs
  const videoRef = useRef(null);
  const cellRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const detectionOverlayRef = useRef(null);
  const abortControllerRef = useRef(null);
  const connectionMonitorRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const localStreamRef = useRef(null);
  const audioSenderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);

  // Initialize WebRTC connection when component mounts
  useEffect(() => {
    if (!stream || !stream.name || !videoRef.current) return;

    console.log(`Initializing WebRTC connection for stream ${stream.name}`);
    setIsLoading(true);
    setError(null);

    // Store cleanup functions
    let connectionTimeout = null;
    let statsInterval = null;

    // Async function to initialize WebRTC
    const initWebRTC = async () => {

      // Create a new RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceTransportPolicy: 'all',
        bundlePolicy: 'balanced',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 0,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ]
      });

      peerConnectionRef.current = pc;

      // Set up event handlers
      pc.ontrack = (event) => {
        console.log(`Track received for stream ${stream.name}`, event);

        if (event.track.kind === 'video') {
          const videoElement = videoRef.current;
          if (!videoElement) {
            console.error(`Video element not found for stream ${stream.name}`);
            return;
          }

          console.log(`Setting srcObject for stream ${stream.name}`, event.streams[0]);

          // Set srcObject
          videoElement.srcObject = event.streams[0];

          // Add event handlers
          videoElement.onloadedmetadata = () => {
            console.log(`Video metadata loaded for stream ${stream.name}`);
          };

          videoElement.onloadeddata = () => {
            console.log(`Video data loaded for stream ${stream.name}`);
          };

          videoElement.onplaying = () => {
            console.log(`Video playing for stream ${stream.name}`);
            setIsLoading(false);
            setIsPlaying(true);
          };

          videoElement.onwaiting = () => {
            console.log(`Video waiting for data for stream ${stream.name}`);
          };

          videoElement.onstalled = () => {
            console.warn(`Video stalled for stream ${stream.name}`);
          };

          videoElement.onerror = (event) => {
            console.error(`Error loading video for stream ${stream.name}:`, event);
            if (videoElement.error) {
              console.error(`Video error code: ${videoElement.error.code}, message: ${videoElement.error.message}`);
            }
            setError('Failed to load video');
            setIsLoading(false);
          };

          // Explicitly start playback
          console.log(`Attempting to play video for stream ${stream.name}`);
          videoElement.play()
            .then(() => {
              console.log(`Video play() succeeded for stream ${stream.name}`);
            })
            .catch(err => {
              console.error(`Video play() failed for stream ${stream.name}:`, err);
              // Try again with user interaction if autoplay was blocked
              if (err.name === 'NotAllowedError') {
                console.warn(`Autoplay blocked for stream ${stream.name}, user interaction required`);
                setError('Click to play video (autoplay blocked)');
              }
            });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state for stream ${stream.name}: ${pc.iceConnectionState}`);

        if (pc.iceConnectionState === 'failed') {
          console.error(`WebRTC ICE connection failed for stream ${stream.name}`);
          setError('WebRTC ICE connection failed');
          setIsLoading(false);
        } else if (pc.iceConnectionState === 'disconnected') {
          // Connection is temporarily disconnected, log but don't show error yet
          console.warn(`WebRTC ICE connection disconnected for stream ${stream.name}, attempting to recover...`);

          // Set a timeout to check if the connection recovers on its own
          setTimeout(() => {
            if (peerConnectionRef.current &&
              (peerConnectionRef.current.iceConnectionState === 'disconnected' ||
                peerConnectionRef.current.iceConnectionState === 'failed')) {
              console.error(`WebRTC ICE connection could not recover for stream ${stream.name}`);
              setError('WebRTC connection lost. Please retry.');
              setIsLoading(false);
            } else if (peerConnectionRef.current) {
              console.log(`WebRTC ICE connection recovered for stream ${stream.name}, current state: ${peerConnectionRef.current.iceConnectionState}`);
            }
          }, 5000); // Wait 5 seconds to see if connection recovers
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          // Connection is established or completed, clear any previous error
          if (error) {
            console.log(`WebRTC connection restored for stream ${stream.name}`);
            setError(null);
          }
        }
      };

      // Handle ICE gathering state changes
      pc.onicegatheringstatechange = () => {
        console.log(`ICE gathering state for stream ${stream.name}: ${pc.iceGatheringState}`);
      };

      // Handle ICE candidates - critical for NAT traversal
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`ICE candidate for stream ${stream.name}:`, event.candidate.candidate);

          // Send the ICE candidate to the server
          // Note: go2rtc typically handles ICE candidates in the SDP exchange,
          // but we log them here for debugging purposes
          // If trickle ICE is needed, uncomment the code below:
          fetch(`/api/webrtc/ice?src=${encodeURIComponent(stream.name)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(event.candidate)
          }).catch(err => console.warn('Failed to send ICE candidate:', err));
        } else {
          console.log(`ICE gathering complete for stream ${stream.name}`);
        }
      };

      // Add transceivers
      pc.addTransceiver('video', { direction: 'recvonly' });

      // Add audio transceiver for backchannel support if enabled
      // Use sendrecv to allow both receiving audio from camera and sending audio to camera
      if (stream.backchannel_enabled) {
        console.log(`Adding audio transceiver with sendrecv for backchannel on stream ${stream.name}`);
        const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
        // Store reference to the audio sender for later use
        audioSenderRef.current = audioTransceiver.sender;
      } else {
        // Just receive audio from the camera (if available)
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }

      // Connect directly to go2rtc for WebRTC
      // go2rtcBaseUrl is set at the start of initWebRTC from settings

      // Set a timeout for the entire connection process
      connectionTimeout = setTimeout(() => {
        if (peerConnectionRef.current &&
          peerConnectionRef.current.iceConnectionState !== 'connected' &&
          peerConnectionRef.current.iceConnectionState !== 'completed') {
          console.error(`WebRTC connection timeout for stream ${stream.name}, ICE state: ${peerConnectionRef.current.iceConnectionState}`);
          setError('Connection timeout. Check network/firewall settings.');
          setIsLoading(false);
        }
      }, 30000); // 30 second timeout

      // Create and send offer
      pc.createOffer()
        .then(offer => {
          console.log(`Created offer for stream ${stream.name}`);
          // For debugging, log a short preview of the SDP
          if (offer && offer.sdp) {
            const preview = offer.sdp.substring(0, 120).replace(/\n/g, '\\n');
            console.log(`SDP offer preview for ${stream.name}: ${preview}...`);
          }
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          console.log(`Set local description for stream ${stream.name}, waiting for ICE gathering...`);

          // Create a new AbortController for this request
          abortControllerRef.current = new AbortController();

          console.log(`Sending offer to backend proxy for stream ${stream.name}`);

          // Send the offer directly to Go2RTC as user requested
          // This mimics the behavior of stream.html access
          const go2rtcUrl = `http://${window.location.hostname}:1984/api/webrtc?src=${encodeURIComponent(stream.name)}`;
          console.log(`Sending offer to Go2RTC at ${go2rtcUrl}`);

          return fetch(go2rtcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/sdp',
            },
            body: pc.localDescription.sdp,
          });
        })
        .then(async (response) => {
          const bodyText = await response.text().catch(() => '');
          if (!response.ok) {
            console.error(`go2rtc /api/webrtc error for stream ${stream.name}: status=${response.status}, body="${bodyText}"`);
            throw new Error(`Failed to send offer: ${response.status} ${response.statusText}`);
          }
          return bodyText;
        })
        .then(sdpAnswer => {
          console.log(`Received SDP answer from go2rtc for stream ${stream.name}`);
          // go2rtc returns raw SDP, wrap it in RTCSessionDescription
          const answer = {
            type: 'answer',
            sdp: sdpAnswer
          };
          return pc.setRemoteDescription(new RTCSessionDescription(answer));
        })
        .then(() => {
          console.log(`Set remote description for stream ${stream.name}, ICE state: ${pc.iceConnectionState}`);
        })
        .catch(error => {
          console.error(`Error setting up WebRTC for stream ${stream.name}:`, error);
          setError(error.message || 'Failed to establish WebRTC connection');
          clearTimeout(connectionTimeout);
        });

      // Set up connection quality monitoring
      const startConnectionMonitoring = () => {
        // Clear any existing monitor
        if (connectionMonitorRef.current) {
          clearInterval(connectionMonitorRef.current);
        }

        // Start a new monitor
        connectionMonitorRef.current = setInterval(() => {
          if (!peerConnectionRef.current) return;

          // Get connection stats
          peerConnectionRef.current.getStats().then(stats => {
            let packetsLost = 0;
            let packetsReceived = 0;
            let currentRtt = 0;
            let jitter = 0;

            stats.forEach(report => {
              if (report.type === 'inbound-rtp' && report.kind === 'video') {
                packetsLost = report.packetsLost || 0;
                packetsReceived = report.packetsReceived || 0;
                jitter = report.jitter || 0;
              }

              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                currentRtt = report.currentRoundTripTime || 0;
              }
            });

            // Calculate packet loss percentage
            const totalPackets = packetsReceived + packetsLost;
            const lossPercentage = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

            // Determine connection quality
            let quality = 'unknown';

            if (packetsReceived > 0) {
              if (lossPercentage < 2 && currentRtt < 0.1 && jitter < 0.03) {
                quality = 'good';
              } else if (lossPercentage < 5 && currentRtt < 0.3 && jitter < 0.1) {
                quality = 'fair';
              } else if (lossPercentage < 15 && currentRtt < 1) {
                quality = 'poor';
              } else {
                quality = 'bad';
              }
            }

            // Update connection quality state if changed
            if (quality !== connectionQuality) {
              console.log(`WebRTC connection quality for stream ${stream.name} changed to ${quality}`);
              console.log(`Stats: loss=${lossPercentage.toFixed(2)}%, rtt=${(currentRtt * 1000).toFixed(0)}ms, jitter=${(jitter * 1000).toFixed(0)}ms`);
              setConnectionQuality(quality);
            }
          }).catch(err => {
            console.warn(`Error getting WebRTC stats for stream ${stream.name}:`, err);
          });
        }, 10000); // Check every 10 seconds
      };

      // Start monitoring once we have a connection
      if (peerConnectionRef.current && peerConnectionRef.current.iceConnectionState === 'connected') {
        startConnectionMonitoring();
      }

      // Listen for connection state changes to start/stop monitoring
      const originalOnIceConnectionStateChange = pc.oniceconnectionstatechange;
      pc.oniceconnectionstatechange = () => {
        // Call the original handler
        if (originalOnIceConnectionStateChange) {
          originalOnIceConnectionStateChange();
        }

        // Start monitoring when connected
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          startConnectionMonitoring();
          // Reset reconnect attempts counter when we get a good connection
          reconnectAttemptsRef.current = 0;
        }

        // Stop monitoring when disconnected or failed
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          if (connectionMonitorRef.current) {
            clearInterval(connectionMonitorRef.current);
            connectionMonitorRef.current = null;
          }
        }
      };
    }; // End of initWebRTC async function

    // Call the async init function
    initWebRTC();

    // Cleanup function
    return () => {
      console.log(`Cleaning up WebRTC connection for stream ${stream.name}`);

      // Stop connection monitoring
      if (connectionMonitorRef.current) {
        clearInterval(connectionMonitorRef.current);
        connectionMonitorRef.current = null;
      }

      // Abort any pending fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Clean up local microphone stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Clean up audio level monitoring
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
        audioContextRef.current = null;
      }
      analyserRef.current = null;

      // Clean up video element
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Reset audio sender ref
      audioSenderRef.current = null;
    };
  }, [stream]);

  // Handle retry button click
  const handleRetry = () => {
    // Force a re-render to restart the WebRTC connection
    setError(null);
    setIsLoading(true);

    // Clean up existing connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Force a re-render by updating state
    setIsPlaying(false);
  };

  // Internal Fullscreen Toggle Handler
  const handleFullscreenToggle = (e) => {
    e.stopPropagation(); // prevent bubbling
    if (!cellRef.current) return;

    if (!document.fullscreenElement) {
      cellRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }

    // Call parent prop if exists, just in case
    if (onToggleFullscreen && typeof onToggleFullscreen === 'function') {
      onToggleFullscreen(stream.name, e, cellRef.current);
    }
  };

  // Start audio level monitoring
  const startAudioLevelMonitoring = useCallback((localStream) => {
    try {
      // Create audio context and analyser for level monitoring
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(localStream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start monitoring audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioLevelIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          // Calculate average level
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          // Normalize to 0-100
          setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
        }
      }, 50);
    } catch (err) {
      console.warn('Failed to start audio level monitoring:', err);
    }
  }, []);

  // Stop audio level monitoring
  const stopAudioLevelMonitoring = useCallback(() => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Start push-to-talk (acquire microphone and send audio)
  const startTalking = useCallback(async () => {
    if (!stream.backchannel_enabled || !audioSenderRef.current) {
      console.warn('Backchannel not enabled or audio sender not available');
      return;
    }

    try {
      setMicrophoneError(null);

      // Request microphone access
      console.log(`Requesting microphone access for backchannel on stream ${stream.name}`);
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = localStream;
      setHasMicrophonePermission(true);

      // Start audio level monitoring
      startAudioLevelMonitoring(localStream);

      // Get the audio track and replace the sender's track
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack && audioSenderRef.current) {
        await audioSenderRef.current.replaceTrack(audioTrack);
        console.log(`Started sending audio for backchannel on stream ${stream.name}`);
        setIsTalking(true);
      }
    } catch (err) {
      console.error(`Failed to start backchannel audio for stream ${stream.name}:`, err);
      setHasMicrophonePermission(false);

      if (err.name === 'NotAllowedError') {
        setMicrophoneError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setMicrophoneError('No microphone found. Please connect a microphone.');
      } else {
        setMicrophoneError(`Microphone error: ${err.message}`);
      }
    }
  }, [stream, startAudioLevelMonitoring]);

  // Stop push-to-talk (stop sending audio)
  const stopTalking = useCallback(async () => {
    if (!stream.backchannel_enabled) return;

    try {
      // Stop audio level monitoring
      stopAudioLevelMonitoring();

      // Stop the local audio track
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Replace the sender's track with null to stop sending
      if (audioSenderRef.current) {
        await audioSenderRef.current.replaceTrack(null);
        console.log(`Stopped sending audio for backchannel on stream ${stream.name}`);
      }

      setIsTalking(false);
    } catch (err) {
      console.error(`Failed to stop backchannel audio for stream ${stream.name}:`, err);
    }
  }, [stream, stopAudioLevelMonitoring]);

  // Toggle talk mode handler
  const handleTalkToggle = useCallback(() => {
    if (talkMode === 'toggle') {
      if (isTalking) {
        stopTalking();
      } else {
        startTalking();
      }
    }
  }, [talkMode, isTalking, startTalking, stopTalking]);

  // Fetch motion stats to get "Last Motion" time
  const { data: motionStats } = useQuery(
    ['motionStats', stream.name],
    `/api/motion/stats/${encodeURIComponent(stream.name)}`,
    { enabled: !!stream.name, refetchInterval: 30000 }
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

  return (
    <div
      className={`group relative bg-[#0d1726] flex flex-col overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'rounded-[2rem] border border-white/5 backdrop-blur-sm bg-[#0d1726]/80'}`}
      data-stream-name={stream.name}
      data-stream-id={streamId}
      ref={cellRef}
      style={{
        pointerEvents: 'auto',
        aspectRatio: isFullscreen ? 'auto' : '16/10',
        width: isFullscreen ? '100vw' : 'auto',
        height: isFullscreen ? '100vh' : 'auto'
      }}
    >
      {/* Video Container */}
      <div className="relative flex-1 bg-black/40 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#0d1726]/60 backdrop-blur-sm">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-3"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Initializing Flow</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-red-500/10 backdrop-blur-sm p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs font-bold text-red-400 mb-4">{error}</p>
            <button onClick={handleRetry} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white transition-all border border-white/10">Retry Connection</button>
          </div>
        )}

        <video
          id={`video-${streamId.replace(/\s+/g, '-')}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          ref={videoRef}
          autoPlay
          muted
          disablePictureInPicture
          playsInline
        />

        {/* Custom Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1726] via-transparent to-transparent opacity-60"></div>

        {/* Detection Boxes */}
        {stream.detection_based_recording && stream.detection_model && (
          <DetectionOverlay
            ref={detectionOverlayRef}
            streamName={stream.name}
            videoRef={videoRef}
            enabled={isPlaying}
            detectionModel={stream.detection_model}
          />
        )}

        {/* Top Controls (Hidden by default, shown on hover) */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-2 rounded-xl flex space-x-1">
            <button onClick={handleFullscreenToggle} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-all">
              {isFullscreen ? (
                // Exit Fullscreen (Arrows In)
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H4m0 0v6m0-6l5 5m5-5H19m0 0v-6m0 6l-5-5m5 5V9m0 5h6m-6 0l5 5M14 10V4m0 0h6m0 6L14 4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9H3m0 0V3m0 0l6 6M15 9h6m0 0V3m0 0l-6 6M9 15H3m0 0v6m0 0l6-6M15 15h6m0 0v6m0 0l-6-6" />
                </svg>
              ) : (
                // Enter Fullscreen (Arrows Out)
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5-5M4 16v4m0 0h4m-4 4l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
            <SnapshotButton
              streamId={streamId}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-all"
              onSnapshot={() => {
                const videoElement = videoRef.current;
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                if (canvas.width > 0) {
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                  showSnapshotPreview(canvas.toDataURL('image/jpeg', 0.95), `Snapshot: ${stream.name}`);
                }
              }}
            />
            {stream.ptz_enabled && (
              <button onClick={() => setShowPTZControls(!showPTZControls)} className={`p-1.5 rounded-lg transition-all ${showPTZControls ? 'bg-blue-500 text-white' : 'hover:bg-white/10 text-white'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>

          <div className="bg-[#03070c]/60 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full">
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{stream.name}</span>
          </div>
        </div>

        {showPTZControls && (
          <div className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
            <PTZControls streamName={stream.name} onClose={() => setShowPTZControls(false)} />
          </div>
        )}
      </div>

      {/* Bottom Bar (Enterprise Look) */}
      <div className="bg-[#0d1726] px-6 py-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Last Motion</span>
            </div>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mt-0.5">{lastMotionStr.toUpperCase()}</span>
          </div>

          <div className="flex items-center space-x-3">
            {stream.backchannel_enabled && isPlaying && (
              <button
                onMouseDown={startTalking}
                onMouseUp={stopTalking}
                onMouseLeave={stopTalking}
                className={`p-2 rounded-xl transition-all border ${isTalking ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}

            <div className="flex items-center space-x-2 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
              <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">{isPlaying ? 'Active' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Red separator line matching the UI */}
        <div className="mt-3 h-[2px] w-full bg-white/5 relative overflow-hidden rounded-full">
          {stream.recording && (
            <div
              className="absolute left-0 top-0 h-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)] transition-all duration-1000 ease-linear"
              style={{ width: `${recProgress}%` }}
            ></div>
          )}
        </div>
      </div>
    </div>
  );
}
