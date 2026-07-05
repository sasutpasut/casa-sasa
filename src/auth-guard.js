import { API_URL } from './config.js'

// Check authentication and redirect to login if not authenticated
export async function requireAuth() {
    // Don't check auth on login page
    if (window.location.pathname.includes('login.html')) {
        document.body.classList.add('auth-verified');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/status`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (!data.loggedIn) {
            // Store the intended destination
            sessionStorage.setItem('intended_url', window.location.href);
            // Redirect to login immediately without showing content
            window.location.replace('/login.html');
        } else {
            // User is authenticated, show the page
            document.body.classList.add('auth-verified');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        // On error, redirect to login immediately
        window.location.replace('/login.html');
    }
}
