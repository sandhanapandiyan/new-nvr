import { render } from 'preact';
import '../../css/base.css';
import '../../css/main.css';
import '../../css/components.css';
import '../../css/layout.css';
import '../../css/live.css';
import { LiveMonitoring } from '../components/preact/LiveMonitoring.jsx';
import { QueryClientProvider, queryClient } from '../query-client.js';
import { ToastContainer } from "../components/preact/ToastContainer.jsx";
import { setupSessionValidation } from '../utils/auth-utils.js';

// Render the Modern Live Monitoring Dashboard
document.addEventListener('DOMContentLoaded', () => {
    setupSessionValidation();
    const container = document.getElementById('main-content');

    if (container) {
        render(
            <QueryClientProvider client={queryClient}>
                <ToastContainer />
                <LiveMonitoring />
            </QueryClientProvider>,
            container
        );
    }
});
