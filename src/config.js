// Determine the API URL based on current hostname
export const getApiUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return `http://${hostname}:3000`;
};

export const API_URL = getApiUrl();
