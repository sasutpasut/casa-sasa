// Determine the API URL based on current hostname
// In production, API requests go through nginx proxy (no port needed)
// In development, connect directly to backend on port 3000
export const getApiUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Production: use same origin (nginx proxies /api to backend)
    return '';
};

export const API_URL = getApiUrl();
