import { render } from 'preact';
import { SystemDashboard } from '../components/preact/SystemDashboard.jsx';
import { QueryClientProvider, queryClient } from '../query-client.js';
import { ToastContainer } from "../components/preact/ToastContainer.jsx";
import { setupSessionValidation } from '../utils/auth-utils.js';

// Render the Modern System Dashboard
document.addEventListener('DOMContentLoaded', () => {
    setupSessionValidation();
    const container = document.getElementById('main-content');

    if (container) {
        render(
            <QueryClientProvider client={queryClient}>
                <ToastContainer />
                <SystemDashboard />
            </QueryClientProvider>,
            container
        );
    }
});
