/**
 * Modern Toast Notification System
 * Displays all system events: success, error, warning, info
 */

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

// Notification types with colors and icons
const NOTIFICATION_TYPES = {
    success: {
        bgColor: 'bg-emerald-500',
        borderColor: 'border-emerald-400',
        icon: '✓',
        iconBg: 'bg-emerald-600'
    },
    error: {
        bgColor: 'bg-red-500',
        borderColor: 'border-red-400',
        icon: '✕',
        iconBg: 'bg-red-600'
    },
    warning: {
        bgColor: 'bg-amber-500',
        borderColor: 'border-amber-400',
        icon: '⚠',
        iconBg: 'bg-amber-600'
    },
    info: {
        bgColor: 'bg-blue-500',
        borderColor: 'border-blue-400',
        icon: 'ℹ',
        iconBg: 'bg-blue-600'
    }
};

/**
 * Single Toast Notification Component
 */
function ToastNotification({ notification, onDismiss }) {
    const { id, type, message, duration } = notification;
    const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (duration && duration > 0) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            onDismiss(id);
        }, 300); // Match animation duration
    };

    return (
        <div
            className={`
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        mb-3 pointer-events-auto
      `}
        >
            <div
                className={`
          ${config.bgColor} ${config.borderColor}
          border-l-4 rounded-lg shadow-2xl
          p-4 pr-12 relative
          min-w-[320px] max-w-md
          backdrop-blur-sm bg-opacity-95
        `}
            >
                {/* Icon */}
                <div className="flex items-start space-x-3">
                    <div className={`${config.iconBg} rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white text-lg font-bold">{config.icon}</span>
                    </div>

                    {/* Message */}
                    <div className="flex-1 pt-0.5">
                        <p className="text-white font-semibold text-sm leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>

                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/20"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Progress bar for timed notifications */}
                {duration && duration > 0 && !isExiting && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-lg overflow-hidden">
                        <div
                            className="h-full bg-white/40 animate-shrink-width"
                            style={{ animationDuration: `${duration}ms` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Main Notification System Container
 */
export function NotificationSystem() {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Create global function to show notifications
        window.showNotification = (message, type = 'info', duration = 5000) => {
            const id = Date.now() + Math.random();
            const notification = {
                id,
                type,
                message,
                duration
            };

            setNotifications(prev => [...prev, notification]);

            // Log to console for debugging
            console.log(`[${type.toUpperCase()}] ${message}`);
        };

        // Convenience methods
        window.showSuccess = (message, duration = 3000) => window.showNotification(message, 'success', duration);
        window.showError = (message, duration = 7000) => window.showNotification(message, 'error', duration);
        window.showWarning = (message, duration = 5000) => window.showNotification(message, 'warning', duration);
        window.showInfo = (message, duration = 5000) => window.showNotification(message, 'info', duration);

        // Cleanup
        return () => {
            delete window.showNotification;
            delete window.showSuccess;
            delete window.showError;
            delete window.showWarning;
            delete window.showInfo;
        };
    }, []);

    const handleDismiss = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
            <div className="flex flex-col items-end">
                {notifications.map(notification => (
                    <ToastNotification
                        key={notification.id}
                        notification={notification}
                        onDismiss={handleDismiss}
                    />
                ))}
            </div>

            {/* Add custom CSS for animation */}
            <style>{`
        @keyframes shrink-width {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-shrink-width {
          animation: shrink-width linear;
        }
      `}</style>
        </div>
    );
}

/**
 * Hook for using notifications in components
 */
export function useNotification() {
    return {
        showNotification: (message, type, duration) => {
            if (window.showNotification) {
                window.showNotification(message, type, duration);
            }
        },
        showSuccess: (message, duration) => {
            if (window.showSuccess) {
                window.showSuccess(message, duration);
            }
        },
        showError: (message, duration) => {
            if (window.showError) {
                window.showError(message, duration);
            }
        },
        showWarning: (message, duration) => {
            if (window.showWarning) {
                window.showWarning(message, duration);
            }
        },
        showInfo: (message, duration) => {
            if (window.showInfo) {
                window.showInfo(message, duration);
            }
        }
    };
}
