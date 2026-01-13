/**
 * LightNVR Web Interface Streams Page
 * Entry point for the streams page
 */

import { render } from 'preact';
import { StreamsManagement } from '../components/preact/StreamsManagement.jsx';
import { QueryClientProvider, queryClient } from '../query-client.js';
import { ToastContainer } from "../components/preact/ToastContainer.jsx";
import { setupSessionValidation } from '../utils/auth-utils.js';

// Render the StreamsManagement component when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Setup session validation (checks every 5 minutes)
  setupSessionValidation();

  // Get the container element
  const container = document.getElementById('main-content');

  if (container) {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastContainer />
        <StreamsManagement />
      </QueryClientProvider>,
      container
    );
  }
});
