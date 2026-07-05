import { t } from './language.js'
import { API_URL } from './config.js'

export async function checkAuthStatus() {
    try {
        const statusRes = await fetch(`${API_URL}/api/auth/status`, { credentials: 'include' });
        const status = await statusRes.json();
        return status;
    } catch (error) {
        console.error('Authentication status check failed:', error);
        return { loggedIn: false };
    }
}

export async function logout() {
    try {
        await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

export function renderAuthButton() {
    const headerActions = document.querySelectorAll('.header-actions');
    if (!headerActions || headerActions.length === 0) return;

    // Use the last header-actions div (on the right side)
    const rightActions = headerActions[headerActions.length - 1];

    checkAuthStatus().then(status => {
        if (status.loggedIn) {
            rightActions.innerHTML = `
                <button class="btn-login" id="logout-btn">${t('auth.logout')}</button>
            `;
            document.getElementById('logout-btn').onclick = logout;
        } else {
            rightActions.innerHTML = `
                <a href="login.html" class="btn-login">${t('auth.login')}</a>
            `;
        }
    });
}
