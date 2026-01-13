import { render } from 'preact';
import { PlaybackControlRoom } from '../components/preact/PlaybackControlRoom.jsx';
import { QueryClientProvider, queryClient } from '../query-client.js';
import { ToastContainer } from "../components/preact/ToastContainer.jsx";
import { setupSessionValidation } from '../utils/auth-utils.js';

// Render the Modern Playback Control Room
document.addEventListener('DOMContentLoaded', () => {
    setupSessionValidation();
    const container = document.getElementById('main-content');

    if (container) {
        render(
            <QueryClientProvider client={queryClient}>
                <ToastContainer />
                <PlaybackControlRoom />
            </QueryClientProvider>,
            container
        );
    }
});
