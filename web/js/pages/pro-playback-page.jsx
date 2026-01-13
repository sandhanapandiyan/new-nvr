import { html } from 'htm/preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

const ProPlaybackPage = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [recordings, setRecordings] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('all');
    const [cameras, setCameras] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [selectedRecording, setSelectedRecording] = useState(null);
    const videoRef = useRef(null);

    useEffect(() => {
        fetchCameras();
        fetchRecordings();
    }, [selectedDate, selectedCamera]);

    const fetchCameras = async () => {
        try {
            const response = await fetch('/api/cameras');
            const data = await response.json();
            setCameras(data.cameras || []);
        } catch (error) {
            console.error('Failed to fetch cameras:', error);
        }
    };

    const fetchRecordings = async () => {
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const url = selectedCamera === 'all'
                ? `/api/recordings?date=${dateStr}`
                : `/api/recordings?date=${dateStr}&camera=${selectedCamera}`;

            const response = await fetch(url);
            const data = await response.json();
            setRecordings(data.recordings || []);
        } catch (error) {
            console.error('Failed to fetch recordings:', error);
        }
    };

    const getDaysInMonth = () => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return eachDayOfInterval({ start, end });
    };

    const hasRecordingsOnDate = (date) => {
        // This would check if there are recordings on this date
        // For now, return true for demonstration
        return date <= new Date();
    };

    const handleDateSelect = (date) => {
        setSelectedDate(date);
    };

    const handlePlayRecording = (recording) => {
        setSelectedRecording(recording);
        setIsPlaying(true);
        if (videoRef.current) {
            videoRef.current.src = recording.url;
            videoRef.current.play();
        }
    };

    const togglePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSpeedChange = (speed) => {
        setPlaybackSpeed(speed);
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const days = getDaysInMonth();

    return html`
    <div class="pro-playback-page">
      <!-- Sidebar with Calendar -->
      <div class="playback-sidebar">
        <div class="sidebar-section">
          <h3 class="section-title">Archive</h3>
          <p class="section-subtitle">SEARCH FOOTAGE</p>
        </div>

        <!-- Calendar -->
        <div class="calendar-container glass-card">
          <div class="calendar-header">
            <button class="calendar-nav-btn" onClick=${() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
              ←
            </button>
            <h4 class="calendar-month">${format(currentMonth, 'MMMM yyyy')}</h4>
            <button class="calendar-nav-btn" onClick=${() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
              →
            </button>
          </div>

          <div class="calendar-grid">
            ${weekDays.map(day => html`
              <div key=${day} class="calendar-weekday">${day}</div>
            `)}
            ${days.map(day => html`
              <button
                key=${day.toISOString()}
                class="calendar-day ${isSameDay(day, selectedDate) ? 'selected' : ''} ${isToday(day) ? 'today' : ''} ${hasRecordingsOnDate(day) ? 'has-recordings' : ''}"
                onClick=${() => handleDateSelect(day)}
              >
                ${format(day, 'd')}
              </button>
            `)}
          </div>
        </div>

        <!-- Alert Folder -->
        <div class="alert-folder glass-card">
          <label class="folder-label">ALERT FOLDER</label>
          <select class="folder-select input-field">
            <option>Select Saved by Mode</option>
            <option>Motion Detection</option>
            <option>Manual Recording</option>
            <option>Scheduled</option>
          </select>
        </div>

        <!-- Index Archives Button -->
        <button class="index-archives-btn btn-primary">
          🔍 INDEX ARCHIVES
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="playback-content">
        <!-- Header -->
        <div class="playback-header">
          <div class="header-left">
            <h1 class="page-title gradient-text">Historical Playback</h1>
            <div class="header-info">
              <span class="info-label">MODE:</span>
              <span class="info-value">SPLIT VIEW (4)</span>
              <span class="separator">•</span>
              <span class="info-label">CAMERA:</span>
              <select 
                class="camera-select input-field"
                value=${selectedCamera}
                onChange=${(e) => setSelectedCamera(e.target.value)}
              >
                <option value="all">All Cameras</option>
                ${cameras.map(cam => html`
                  <option key=${cam.id} value=${cam.id}>${cam.name}</option>
                `)}
              </select>
            </div>
          </div>
        </div>

        <!-- Video Display Area -->
        <div class="video-display-area glass-card">
          ${selectedRecording ? html`
            <video
              ref=${videoRef}
              class="playback-video"
              onTimeUpdate=${(e) => setCurrentTime(e.target.currentTime)}
              onLoadedMetadata=${(e) => setDuration(e.target.duration)}
            />
          ` : html`
            <div class="no-footage-placeholder">
              <div class="placeholder-icon">📹</div>
              <h3>SELECT FOOTAGE TO PLAY</h3>
              <p>Choose a date from the calendar and select a recording from the timeline below</p>
            </div>
          `}
        </div>

        <!-- Timeline Controls -->
        <div class="timeline-container glass-card">
          <div class="timeline-header">
            <div class="timeline-info">
              <span class="timeline-date">${format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              <span class="timeline-count">${recordings.length} recordings</span>
            </div>
            <div class="playback-controls">
              <button class="control-btn" onClick=${togglePlayPause}>
                ${isPlaying ? '⏸' : '▶'}
              </button>
              <button class="control-btn">⏹</button>
              <button class="control-btn">⏮</button>
              <button class="control-btn">⏭</button>
              
              <div class="speed-control">
                <span class="speed-label">Speed:</span>
                ${[0.5, 1, 1.5, 2].map(speed => html`
                  <button
                    key=${speed}
                    class="speed-btn ${playbackSpeed === speed ? 'active' : ''}"
                    onClick=${() => handleSpeedChange(speed)}
                  >
                    ${speed}x
                  </button>
                `)}
              </div>

              <div class="time-display">
                <span class="current-time">${formatTime(currentTime)}</span>
                <span class="time-separator">/</span>
                <span class="total-time">${formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <!-- Timeline Ruler -->
          <div class="timeline-ruler">
            ${Array.from({ length: 24 }, (_, i) => html`
              <div key=${i} class="timeline-hour">
                <span class="hour-label">${i.toString().padStart(2, '0')}</span>
                <div class="hour-line"></div>
              </div>
            `)}
          </div>

          <!-- Recording Segments -->
          <div class="recording-segments">
            ${recordings.map((rec, idx) => html`
              <button
                key=${rec.id || idx}
                class="recording-segment ${selectedRecording?.id === rec.id ? 'active' : ''}"
                style=${{
            left: `${(rec.startHour / 24) * 100}%`,
            width: `${((rec.endHour - rec.startHour) / 24) * 100}%`
        }}
                onClick=${() => handlePlayRecording(rec)}
                title=${`${rec.camera} - ${rec.startTime} to ${rec.endTime}`}
              >
                <div class="segment-fill"></div>
              </button>
            `)}
          </div>

          <!-- Progress Bar -->
          ${selectedRecording && html`
            <div class="playback-progress">
              <div 
                class="progress-indicator"
                style=${{ left: `${(currentTime / duration) * 100}%` }}
              ></div>
            </div>
          `}
        </div>
      </div>

      <style>
        .pro-playback-page {
          display: flex;
          height: 100vh;
          background: var(--color-bg-primary);
          margin-left: 280px;
        }

        .playback-sidebar {
          width: 320px;
          background: var(--color-bg-secondary);
          border-right: 1px solid var(--glass-border);
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
        }

        .sidebar-section {
          margin-bottom: 0.5rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.25rem 0;
        }

        .section-subtitle {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          font-weight: 600;
          letter-spacing: 0.1em;
          margin: 0;
        }

        .calendar-container {
          padding: 1.5rem;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .calendar-nav-btn {
          background: var(--color-surface-medium);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }

        .calendar-nav-btn:hover {
          background: var(--color-primary-600);
          color: white;
          border-color: var(--color-primary-500);
        }

        .calendar-month {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }

        .calendar-weekday {
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-tertiary);
          padding: 0.5rem;
        }

        .calendar-day {
          aspect-ratio: 1;
          background: var(--color-surface-dark);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
        }

        .calendar-day:hover {
          background: var(--color-surface-medium);
          border-color: var(--color-primary-500);
          color: var(--color-text-primary);
        }

        .calendar-day.selected {
          background: var(--color-primary-600);
          border-color: var(--color-primary-500);
          color: white;
          box-shadow: 0 0 12px rgba(0, 128, 255, 0.4);
        }

        .calendar-day.today {
          border-color: var(--color-accent-cyan);
          font-weight: 700;
        }

        .calendar-day.has-recordings::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: var(--color-primary-400);
          border-radius: 50%;
        }

        .calendar-day.selected.has-recordings::after {
          background: white;
        }

        .alert-folder {
          padding: 1.5rem;
        }

        .folder-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-tertiary);
          letter-spacing: 0.1em;
          margin-bottom: 0.75rem;
        }

        .folder-select {
          margin: 0;
        }

        .index-archives-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .playback-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 2rem;
          gap: 1.5rem;
          overflow-y: auto;
        }

        .playback-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
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

        .header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.875rem;
        }

        .info-label {
          color: var(--color-text-tertiary);
          font-weight: 600;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .info-value {
          color: var(--color-text-primary);
          font-weight: 600;
        }

        .separator {
          color: var(--color-text-muted);
        }

        .camera-select {
          min-width: 200px;
          margin: 0;
        }

        .video-display-area {
          flex: 1;
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .playback-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .no-footage-placeholder {
          text-align: center;
          color: var(--color-text-tertiary);
        }

        .placeholder-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .no-footage-placeholder h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          margin: 0 0 0.5rem 0;
        }

        .no-footage-placeholder p {
          font-size: 0.875rem;
          margin: 0;
        }

        .timeline-container {
          padding: 1.5rem;
          position: relative;
        }

        .timeline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .timeline-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .timeline-date {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .timeline-count {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
        }

        .playback-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .control-btn {
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
          font-size: 1rem;
          transition: all var(--transition-fast);
        }

        .control-btn:hover {
          background: var(--color-primary-600);
          border-color: var(--color-primary-500);
          transform: scale(1.05);
        }

        .speed-control {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 1rem;
          border-left: 1px solid var(--glass-border);
          border-right: 1px solid var(--glass-border);
        }

        .speed-label {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          font-weight: 600;
        }

        .speed-btn {
          background: var(--color-surface-dark);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm);
          padding: 0.25rem 0.75rem;
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .speed-btn:hover {
          background: var(--color-surface-medium);
          color: var(--color-text-primary);
        }

        .speed-btn.active {
          background: var(--color-primary-600);
          border-color: var(--color-primary-500);
          color: white;
        }

        .time-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .current-time {
          color: var(--color-primary-400);
        }

        .time-separator {
          color: var(--color-text-muted);
        }

        .total-time {
          color: var(--color-text-secondary);
        }

        .timeline-ruler {
          display: flex;
          position: relative;
          height: 40px;
          border-bottom: 1px solid var(--glass-border);
          margin-bottom: 1rem;
        }

        .timeline-hour {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hour-label {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .hour-line {
          width: 1px;
          height: 12px;
          background: var(--glass-border);
        }

        .recording-segments {
          position: relative;
          height: 60px;
          margin-bottom: 1rem;
        }

        .recording-segment {
          position: absolute;
          height: 100%;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          transition: all var(--transition-fast);
        }

        .segment-fill {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, var(--color-primary-600), var(--color-accent-cyan));
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          opacity: 0.7;
        }

        .recording-segment:hover .segment-fill {
          opacity: 1;
          transform: scaleY(1.1);
          box-shadow: 0 4px 12px rgba(0, 128, 255, 0.4);
        }

        .recording-segment.active .segment-fill {
          opacity: 1;
          box-shadow: 0 0 20px rgba(0, 128, 255, 0.6);
        }

        .playback-progress {
          position: absolute;
          bottom: 1.5rem;
          left: 1.5rem;
          right: 1.5rem;
          height: 4px;
          background: var(--color-surface-dark);
          border-radius: var(--radius-full);
        }

        .progress-indicator {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: var(--color-primary-500);
          border-radius: 50%;
          box-shadow: 0 0 12px var(--color-primary-500);
          transition: left 0.1s linear;
        }
      </style>
    </div>
  `;
};

export default ProPlaybackPage;
