/**
 * LightNVR Web Interface LoginView Component
 * Preact component for the login page
 */

import { useState, useRef, useEffect } from 'preact/hooks';

/**
 * LoginView component
 * @returns {JSX.Element} LoginView component
 */
export function LoginView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const redirectTimerRef = useRef(null);

  // Check URL for error, auth_required, or logout parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
      setErrorMessage('Invalid username or password');
    } else if (urlParams.has('auth_required') && urlParams.has('logout')) {
      setErrorMessage('You have been successfully logged out.');
    } else if (urlParams.has('auth_required')) {
      const reason = urlParams.get('reason');
      if (reason === 'session_expired') {
        setErrorMessage('Your session has expired. Please log in again.');
      } else {
        setErrorMessage('Authentication required. Please log in to continue.');
      }
    } else if (urlParams.has('logout')) {
      setErrorMessage('You have been successfully logged out.');
    }
  }, []);

  // Request controller for cancelling requests
  const requestControllerRef = useRef(null);

  // Cleanup function for any timers
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // Function to check if browser might be blocking redirects
  const checkBrowserRedirectSupport = () => {
    // Check if running in a sandboxed iframe which might block navigation
    const isSandboxed = window !== window.top;

    // Check if there are any service workers that might intercept navigation
    const hasServiceWorker = 'serviceWorker' in navigator;

    // Log potential issues
    if (isSandboxed) {
      console.warn('Login page is running in an iframe, which might block navigation');
    }

    if (hasServiceWorker) {
      console.log('Service Worker API is available, checking for active service workers');
      navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length > 0) {
          console.warn(`${registrations.length} service worker(s) detected which might intercept navigation`);
        } else {
          console.log('No active service workers detected');
        }
      });
    }

    return { isSandboxed, hasServiceWorker };
  };

  // Handle login form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setErrorMessage('Please enter both username and password');
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage('');

    try {
      // Store credentials in localStorage for future requests
      const authString = btoa(`${username}:${password}`);
      localStorage.setItem('auth', authString);

      // Make login request
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        body: JSON.stringify({ username, password }),
        timeout: 10000
      });

      if (response.ok) {
        // Successful login
        console.log('Login successful, proceeding to redirect');

        // Try multiple redirect approaches
        try {
          // Get redirect URL from query parameter if it exists
          const urlParams = new URLSearchParams(window.location.search);
          const redirectUrl = urlParams.get('redirect');

          // Add timestamp to prevent caching issues
          const targetUrl = redirectUrl
            ? redirectUrl
            : `/index.html`;


          // Set a fallback timer in case the redirect doesn't happen immediately
          redirectTimerRef.current = setTimeout(() => {
            console.log('Fallback: trying window.location.href');
            window.location.href = targetUrl;

            // If that also doesn't work, try replace
            redirectTimerRef.current = setTimeout(() => {
              console.log('Fallback: trying window.location.replace');
              window.location.replace(targetUrl);
            }, 500);
          }, 500);
        } catch (redirectError) {
          console.error('Redirect error:', redirectError);
          // Last resort: try a different approach
          window.location.replace('index.html');
        }
      } else {
        // Failed login
        setIsLoggingIn(false);
        setErrorMessage('Invalid username or password');
        localStorage.removeItem('auth');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Reset login state on error
      setIsLoggingIn(false);
      setErrorMessage('An error occurred during login. Please try again.');
      localStorage.removeItem('auth');
    }
  };

  // Determine error message class based on content
  const getErrorMessageClass = () => {
    const baseClass = "mb-4 p-3 rounded-lg ";

    // Check for success messages
    const isSuccess = (
      errorMessage.includes('successfully logged out') ||
      errorMessage.includes('Click the button below') ||
      errorMessage.includes('Login successful')
    );

    return baseClass + (
      isSuccess
        ? 'badge-success'
        : 'badge-danger'
    );
  };

  return (
    <section id="login-page" className="page flex items-center justify-center min-h-screen bg-[#0f172a] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>

      <div className="login-container w-full max-w-md p-8 bg-[#1e293b]/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">PRO NVR</h1>
          <p className="text-blue-400 font-bold text-xs tracking-widest uppercase opacity-80">Enterprise Solution v1.0</p>
        </div>

        {errorMessage && (
          <div className={getErrorMessageClass()}>
            <div className="flex items-center">
              <span className="mr-2">
                {errorMessage.includes('success') ? '✓' : '⚠'}
              </span>
              {errorMessage}
            </div>
          </div>
        )}

        <form id="login-form" className="space-y-6" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <input
                type="text"
                id="username"
                name="username"
                className="w-full bg-[#334155]/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-[none] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <input
                type="password"
                id="password"
                name="password"
                className="w-full bg-[#334155]/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-[none] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>
          <div className="form-group pt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1e293b] disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </span>
              ) : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="mt-10 pt-6 border-t border-white/5 text-center">
          <p className="text-gray-500 text-xs">
            Industrial Grade Security & Monitoring
          </p>
        </div>
      </div>
    </section>
  );
}
