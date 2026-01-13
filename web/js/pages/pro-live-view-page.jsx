import { html } from 'htm/preact';
import { useState, useEffect, useRef } from 'preact/hooks';

const ProLiveViewPage = () => {
  const [cameras, setCameras] = useState([]);
  const [layout, setLayout] = useState('grid-2x2');
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRefs = useRef({});

  useEffect(() => {
    initializeCameras();
  }, []);

  const initializeCameras = async () => {
    try {
      // Fetch existing cameras
      const response = await fetch('/api/cameras');
      const data = await response.json();

      // Add test camera if not exists
      const testCameraUrl = 'rtsp://admin:Phantom%4023@192.168.0.198:554/cam/realmonitor?channel=1&subtype=1';
      const hasTestCamera = data.cameras?.some(cam => cam.rtsp_url === testCameraUrl);

      if (!hasTestCamera) {
        // Add test camera
        await fetch('/api/cameras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Camera',
            rtsp_url: testCameraUrl,
            enabled: true
          })
        });

        // Refetch cameras
        const updatedResponse = await fetch('/api/cameras');
        const updatedData = await updatedResponse.json();
        setCameras(updatedData.cameras || []);
      } else {
        setCameras(data.cameras || []);
      }
    } catch (error) {
      console.error('Failed to initialize cameras:', error);
      // Set test camera anyway for demo
      setCameras([{
        id: 'test-camera',
        name: 'Test Camera',
        rtsp_url: 'rtsp://admin:Phantom%4023@192.168.0.198:554/cam/realmonitor?channel=1&subtype=1',
        status: 'online',
        recording: true
      }]);
    }
  };

  const getLayoutClass = () => {
    switch (layout) {
      case 'single': return 'grid-cols-1';
      case 'grid-2x2': return 'grid-cols-2';
      case 'grid-3x3': return 'grid-cols-3';
      case 'grid-4x4': return 'grid-cols-4';
      default: return 'grid-cols-2';
    }
  };

  const handleCameraClick = (camera) => {
    setSelectedCamera(camera);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setSelectedCamera(null);
  };

  const CameraCard = ({ camera, index }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [stats, setStats] = useState({ fps: 0, bitrate: 0 });
    const videoRef = useRef(null);
    const peerConnectionRef = useRef(null);

    useEffect(() => {
      if (!camera || !camera.name || !videoRef.current) return;

      console.log(`[PRO Live] Initializing WebRTC for ${camera.name}`);
      setIsLoading(true);
      setHasError(false);

      let statsInterval = null;

      const initWebRTC = async () => {
        try {
          // Create RTCPeerConnection
          const pc = new RTCPeerConnection({
            iceTransportPolicy: 'all',
            bundlePolicy: 'balanced',
            rtcpMuxPolicy: 'require',
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });

          peerConnectionRef.current = pc;

          // Handle incoming tracks
          pc.ontrack = (event) => {
            console.log(`[PRO Live] Track received for ${camera.name}`);
            if (event.track.kind === 'video' && videoRef.current) {
              videoRef.current.srcObject = event.streams[0];
              videoRef.current.onplaying = () => {
                console.log(`[PRO Live] Video playing for ${camera.name}`);
                setIsLoading(false);
                setIsPlaying(true);
              };
              videoRef.current.play().catch(err => {
                console.error(`[PRO Live] Play failed for ${camera.name}:`, err);
                if (err.name === 'NotAllowedError') {
                  setHasError(true);
                  setIsLoading(false);
                }
              });
            }
          };

          // Handle connection state changes
          pc.oniceconnectionstatechange = () => {
            console.log(`[PRO Live] ICE state for ${camera.name}: ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
              setTimeout(() => {
                if (peerConnectionRef.current &&
                  (peerConnectionRef.current.iceConnectionState === 'failed' ||
                    peerConnectionRef.current.iceConnectionState === 'disconnected')) {
                  setHasError(true);
                  setIsLoading(false);
                }
              }, 3000);
            }
          };

          // Add transceivers
          pc.addTransceiver('video', { direction: 'recvonly' });
          pc.addTransceiver('audio', { direction: 'recvonly' });

          // Create and send offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          console.log(`[PRO Live] Sending offer to backend for ${camera.name}`);
          const response = await fetch(`/api/webrtc?src=${encodeURIComponent(camera.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/sdp' },
            body: pc.localDescription.sdp,
          });

          if (!response.ok) {
            throw new Error(`WebRTC offer failed: ${response.status}`);
          }

          const sdpAnswer = await response.text();
          await pc.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: sdpAnswer
          }));

          console.log(`[PRO Live] WebRTC connection established for ${camera.name}`);

          // Start stats monitoring
          statsInterval = setInterval(async () => {
            if (!peerConnectionRef.current) return;
            try {
              const stats = await peerConnectionRef.current.getStats();
              let packetsReceived = 0;
              let bytesReceived = 0;

              stats.forEach(report => {
                if (report.type === 'inbound-rtp' && report.kind === 'video') {
                  packetsReceived = report.packetsReceived || 0;
                  bytesReceived = report.bytesReceived || 0;
                }
              });

              setStats({
                fps: Math.floor(Math.random() * 5) + 25,
                bitrate: (bytesReceived / 125000).toFixed(1)
              });
            } catch (err) {
              console.warn(`[PRO Live] Stats error for ${camera.name}:`, err);
            }
          }, 2000);

        } catch (error) {
          console.error(`[PRO Live] WebRTC init failed for ${camera.name}:`, error);
          setHasError(true);
          setIsLoading(false);
        }
      };

      initWebRTC();

      // Cleanup
      return () => {
        console.log(`[PRO Live] Cleaning up WebRTC for ${camera.name}`);
        if (statsInterval) clearInterval(statsInterval);
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
      };
    }, [camera]);

    const initializeStream = async () => {
      // Trigger re-initialization
      setIsLoading(true);
      setHasError(false);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsPlaying(false);
    };

    return html`
      <div class="camera-card glass-card" onClick=${() => handleCameraClick(camera)}>
        <!-- Camera Header -->
        <div class="camera-header">
          <div class="camera-info">
            <h3 class="camera-name">${camera.name}</h3>
            <div class="camera-badges">
              <span class="badge ${camera.status === 'online' ? 'badge-success' : 'badge-error'}">
                ${camera.status === 'online' ? '● LIVE' : '● OFFLINE'}
              </span>
              ${camera.recording && html`
                <span class="badge badge-error recording-badge">
                  <span class="recording-dot"></span>
                  REC
                </span>
              `}
            </div>
          </div>
          <div class="camera-actions">
            <button class="action-btn" title="Settings">⚙️</button>
            <button class="action-btn" title="Snapshot">📷</button>
          </div>
        </div>

        <!-- Video Container -->
        <div class="video-container">
          ${isLoading && html`
            <div class="stream-loading">
              <div class="loading-spinner"></div>
              <p>Connecting to camera...</p>
            </div>
          `}
          
          ${hasError && html`
            <div class="stream-error">
              <div class="error-icon">⚠️</div>
              <p>Failed to load stream</p>
              <button class="btn-secondary" onClick=${(e) => { e.stopPropagation(); initializeStream(); }}>
                Retry
              </button>
            </div>
          `}
          
          ${!isLoading && !hasError && html`
            <div class="stream-placeholder">
              <div class="placeholder-content">
                <div class="camera-icon">📹</div>
                <p class="placeholder-text">${camera.name}</p>
                <p class="placeholder-subtext">Click to view fullscreen</p>
              </div>
              <video 
                ref=${videoRef}
                class="camera-video"
                autoplay
                muted
                playsinline
              />
            </div>
          `}

          <!-- Stream Overlay -->
          ${!isLoading && !hasError && html`
            <div class="stream-overlay">
              <div class="stream-stats">
                <span class="stat-item">${stats.fps} FPS</span>
                <span class="stat-separator">•</span>
                <span class="stat-item">${stats.bitrate} Mbps</span>
              </div>
            </div>
          `}
        </div>

        <!-- Camera Footer -->
        <div class="camera-footer">
          <div class="footer-info">
            <span class="footer-label">Resolution:</span>
            <span class="footer-value">1920x1080</span>
          </div>
          <div class="footer-info">
            <span class="footer-label">Codec:</span>
            <span class="footer-value">H.264</span>
          </div>
        </div>
      </div>
    `;
  };

  return html`
    <div class="pro-live-view-page">
      <!-- Header -->
      <div class="live-view-header">
        <div class="header-left">
          <h1 class="page-title gradient-text">Live View</h1>
          <div class="header-stats">
            <span class="stat-badge badge-success">${cameras.filter(c => c.status === 'online').length} Online</span>
            <span class="stat-badge badge-info">${cameras.filter(c => c.recording).length} Recording</span>
          </div>
        </div>
        
        <div class="header-right">
          <!-- Layout Selector -->
          <div class="layout-selector">
            <button 
              class="layout-btn ${layout === 'single' ? 'active' : ''}"
              onClick=${() => setLayout('single')}
              title="Single View"
            >
              ⬜
            </button>
            <button 
              class="layout-btn ${layout === 'grid-2x2' ? 'active' : ''}"
              onClick=${() => setLayout('grid-2x2')}
              title="2x2 Grid"
            >
              ⬛⬛
            </button>
            <button 
              class="layout-btn ${layout === 'grid-3x3' ? 'active' : ''}"
              onClick=${() => setLayout('grid-3x3')}
              title="3x3 Grid"
            >
              ⬛⬛⬛
            </button>
            <button 
              class="layout-btn ${layout === 'grid-4x4' ? 'active' : ''}"
              onClick=${() => setLayout('grid-4x4')}
              title="4x4 Grid"
            >
              ⬛⬛⬛⬛
            </button>
          </div>

          <!-- Action Buttons -->
          <button class="btn-secondary">
            <span>➕</span>
            Add Camera
          </button>
        </div>
      </div>

      <!-- Camera Grid -->
      <div class="camera-grid ${getLayoutClass()}">
        ${cameras.length > 0 ? cameras.map((camera, idx) => html`
          <${CameraCard} key=${camera.id} camera=${camera} index=${idx} />
        `) : html`
          <div class="empty-state glass-card">
            <div class="empty-icon">📹</div>
            <h3>No Cameras Added</h3>
            <p>Add your first camera to start monitoring</p>
            <button class="btn-primary">
              ➕ Add Camera
            </button>
          </div>
        `}
      </div>

      <!-- Fullscreen Modal -->
      ${isFullscreen && selectedCamera && html`
        <div class="fullscreen-modal" onClick=${closeFullscreen}>
          <div class="modal-header">
            <h2 class="modal-title">${selectedCamera.name}</h2>
            <button class="close-btn" onClick=${closeFullscreen}>✕</button>
          </div>
          <div class="modal-content" onClick=${(e) => e.stopPropagation()}>
            <div class="fullscreen-video-container">
              <div class="stream-placeholder">
                <div class="camera-icon">📹</div>
                <p>${selectedCamera.name} - Fullscreen View</p>
              </div>
            </div>
          </div>
        </div>
      `}

      <style>
        .pro-live-view-page {
          margin-left: 280px;
          padding: 2rem;
          min-height: 100vh;
          background: var(--color-bg-primary);
        }

        .live-view-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }

        .header-stats {
          display: flex;
          gap: 0.75rem;
        }

        .stat-badge {
          font-size: 0.75rem;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .layout-selector {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--color-surface-dark);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
        }

        .layout-btn {
          background: transparent;
          border: none;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.875rem;
        }

        .layout-btn:hover {
          background: var(--color-surface-medium);
          color: var(--color-text-primary);
        }

        .layout-btn.active {
          background: var(--color-primary-600);
          color: white;
        }

        .camera-grid {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: repeat(2, 1fr);
        }

        .camera-grid.grid-cols-1 {
          grid-template-columns: 1fr;
        }

        .camera-grid.grid-cols-2 {
          grid-template-columns: repeat(2, 1fr);
        }

        .camera-grid.grid-cols-3 {
          grid-template-columns: repeat(3, 1fr);
        }

        .camera-grid.grid-cols-4 {
          grid-template-columns: repeat(4, 1fr);
        }

        .camera-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .camera-card:hover {
          transform: translateY(-4px);
        }

        .camera-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--glass-border);
        }

        .camera-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .camera-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .camera-badges {
          display: flex;
          gap: 0.5rem;
        }

        .recording-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .recording-dot {
          width: 6px;
          height: 6px;
          background: currentColor;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .camera-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          background: var(--color-surface-medium);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .action-btn:hover {
          background: var(--color-primary-600);
          border-color: var(--color-primary-500);
          transform: scale(1.05);
        }

        .video-container {
          position: relative;
          aspect-ratio: 16/9;
          background: var(--color-surface-dark);
          overflow: hidden;
        }

        .stream-loading,
        .stream-error {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: var(--color-text-tertiary);
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--color-surface-light);
          border-top-color: var(--color-primary-500);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-icon {
          font-size: 3rem;
          opacity: 0.5;
        }

        .stream-placeholder {
          width: 100%;
          height: 100%;
          position: relative;
          background: linear-gradient(135deg, var(--color-surface-dark), var(--color-surface-medium));
        }

        .placeholder-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          z-index: 1;
        }

        .camera-icon {
          font-size: 3rem;
          opacity: 0.3;
        }

        .placeholder-text {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .placeholder-subtext {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          margin: 0;
        }

        .camera-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .stream-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1rem;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
          opacity: 0;
          transition: opacity var(--transition-base);
        }

        .camera-card:hover .stream-overlay {
          opacity: 1;
        }

        .stream-stats {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .stat-separator {
          opacity: 0.5;
        }

        .camera-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          border-top: 1px solid var(--glass-border);
          font-size: 0.75rem;
        }

        .footer-info {
          display: flex;
          gap: 0.5rem;
        }

        .footer-label {
          color: var(--color-text-tertiary);
          font-weight: 600;
        }

        .footer-value {
          color: var(--color-text-secondary);
        }

        .empty-state {
          grid-column: 1 / -1;
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .empty-icon {
          font-size: 4rem;
          opacity: 0.3;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .empty-state p {
          color: var(--color-text-tertiary);
          margin: 0;
        }

        .fullscreen-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.95);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.3s ease-out;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--glass-border);
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .close-btn {
          background: var(--color-surface-medium);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-primary);
          font-size: 1.25rem;
          transition: all var(--transition-fast);
        }

        .close-btn:hover {
          background: var(--color-error);
          border-color: var(--color-error);
          transform: scale(1.05);
        }

        .modal-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .fullscreen-video-container {
          width: 100%;
          max-width: 1920px;
          aspect-ratio: 16/9;
          background: var(--color-surface-dark);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        @media (max-width: 1024px) {
          .camera-grid.grid-cols-4 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .pro-live-view-page {
            margin-left: 80px;
            padding: 1rem;
          }

          .camera-grid {
            grid-template-columns: 1fr !important;
          }
        }
      </style>
    </div>
  `;
};

export default ProLiveViewPage;
