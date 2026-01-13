import { html } from 'htm/preact';
import { useState, useEffect } from 'preact/hooks';

const ProSidebar = ({ currentPage = 'live' }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userInfo, setUserInfo] = useState({ username: 'Admin', role: 'Administrator' });

    const menuItems = [
        {
            id: 'live',
            label: 'Live View',
            icon: '📹',
            path: '/index.html',
            badge: null
        },
        {
            id: 'playback',
            label: 'Playback',
            icon: '⏯️',
            path: '/timeline.html',
            badge: null
        },
        {
            id: 'recordings',
            label: 'Video Exports',
            icon: '📼',
            path: '/recordings.html',
            badge: null
        },
        {
            id: 'streams',
            label: 'Cameras',
            icon: '📡',
            path: '/streams.html',
            badge: null
        },
        {
            id: 'system',
            label: 'System Settings',
            icon: '⚙️',
            path: '/system.html',
            badge: null
        },
        {
            id: 'users',
            label: 'Users',
            icon: '👥',
            path: '/users.html',
            badge: null
        }
    ];

    const handleNavigation = (path) => {
        window.location.href = path;
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return html`
    <aside class="pro-sidebar ${isCollapsed ? 'collapsed' : ''}">
      <!-- Logo & Brand -->
      <div class="sidebar-header">
        <div class="logo-container">
          <div class="logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="url(#logoGradient)" opacity="0.2"/>
              <circle cx="16" cy="16" r="10" fill="url(#logoGradient)"/>
              <circle cx="16" cy="16" r="4" fill="white"/>
              <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stop-color="#0080ff"/>
                  <stop offset="100%" stop-color="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          ${!isCollapsed && html`
            <div class="brand-text">
              <h1 class="brand-name">PRO NVR</h1>
              <p class="brand-tagline">ENTERPRISE v1.0</p>
            </div>
          `}
        </div>
        <button 
          class="collapse-btn"
          onClick=${() => setIsCollapsed(!isCollapsed)}
          title=${isCollapsed ? 'Expand' : 'Collapse'}
        >
          ${isCollapsed ? '→' : '←'}
        </button>
      </div>

      <!-- Navigation Menu -->
      <nav class="sidebar-nav">
        ${menuItems.map(item => html`
          <button
            key=${item.id}
            class="nav-item ${currentPage === item.id ? 'active' : ''}"
            onClick=${() => handleNavigation(item.path)}
            title=${item.label}
          >
            <span class="nav-icon">${item.icon}</span>
            ${!isCollapsed && html`
              <span class="nav-label">${item.label}</span>
            `}
            ${item.badge && !isCollapsed && html`
              <span class="nav-badge">${item.badge}</span>
            `}
          </button>
        `)}
      </nav>

      <!-- User Profile -->
      <div class="sidebar-footer">
        <div class="user-profile">
          <div class="user-avatar">
            <span class="avatar-text">${userInfo.username.charAt(0)}</span>
            <span class="status-indicator online"></span>
          </div>
          ${!isCollapsed && html`
            <div class="user-info">
              <p class="user-name">${userInfo.username}</p>
              <p class="user-role">${userInfo.role}</p>
            </div>
          `}
        </div>
        ${!isCollapsed && html`
          <button class="logout-btn" onClick=${handleLogout} title="Logout">
            <span>🚪</span>
          </button>
        `}
      </div>

      <style>
        .pro-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          width: 280px;
          background: var(--color-bg-secondary);
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          transition: width var(--transition-base);
          z-index: 1000;
        }

        .pro-sidebar.collapsed {
          width: 80px;
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .logo-icon {
          flex-shrink: 0;
        }

        .brand-text {
          flex: 1;
          min-width: 0;
        }

        .brand-name {
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--color-primary-400), var(--color-accent-cyan));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          line-height: 1.2;
        }

        .brand-tagline {
          font-size: 0.625rem;
          color: var(--color-text-tertiary);
          font-weight: 600;
          letter-spacing: 0.1em;
          margin: 0;
        }

        .collapse-btn {
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
          flex-shrink: 0;
        }

        .collapse-btn:hover {
          background: var(--color-primary-600);
          color: white;
          border-color: var(--color-primary-500);
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-lg);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-base);
          font-size: 0.875rem;
          font-weight: 500;
          text-align: left;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .pro-sidebar.collapsed .nav-item {
          justify-content: center;
          padding: 0.875rem;
        }

        .nav-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 3px;
          height: 100%;
          background: var(--color-primary-500);
          transform: scaleY(0);
          transition: transform var(--transition-base);
        }

        .nav-item:hover {
          background: var(--color-surface-medium);
          border-color: var(--glass-border);
          color: var(--color-text-primary);
        }

        .nav-item.active {
          background: linear-gradient(135deg, rgba(0, 128, 255, 0.1), rgba(6, 182, 212, 0.1));
          border-color: var(--color-primary-500);
          color: var(--color-primary-400);
        }

        .nav-item.active::before {
          transform: scaleY(1);
        }

        .nav-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }

        .nav-label {
          flex: 1;
          white-space: nowrap;
        }

        .nav-badge {
          background: var(--color-primary-600);
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-full);
          font-size: 0.625rem;
          font-weight: 700;
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .user-avatar {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, var(--color-primary-600), var(--color-accent-cyan));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .avatar-text {
          color: white;
          font-weight: 700;
          font-size: 1rem;
        }

        .status-indicator {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--color-bg-secondary);
        }

        .status-indicator.online {
          background: var(--color-success);
          box-shadow: 0 0 8px var(--color-success);
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .logout-btn {
          background: var(--color-surface-medium);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .logout-btn:hover {
          background: var(--color-error);
          border-color: var(--color-error);
          transform: scale(1.05);
        }

        /* Scrollbar for nav */
        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: var(--color-surface-light);
          border-radius: var(--radius-full);
        }
      </style>
    </aside>
  `;
};

export default ProSidebar;
