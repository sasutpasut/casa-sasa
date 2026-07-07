import { API_URL } from './config.js';
import { t } from './language.js';

let userRole = null;
let editingPointId = null;
let tempX = null;
let tempY = null;

export async function initMap() {
    console.log('=== initMap() CALLED ===');

    // Check if user is logged in and get role
    try {
        const statusRes = await fetch(`${API_URL}/api/auth/status`, { credentials: 'include' });
        const status = await statusRes.json();

        if (status.loggedIn) {
            userRole = status.role;
            console.log('User role:', userRole);

            // Show add button for admin
            if (userRole === 'admin') {
                const addBtn = document.getElementById('add-point-btn');
                if (addBtn) addBtn.style.display = 'inline-block';
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }

    setupEventListeners();
    loadMapPoints();
}

function setupEventListeners() {
    const addBtn = document.getElementById('add-point-btn');
    const modal = document.getElementById('point-modal');
    const closeModal = document.getElementById('close-point-modal');
    const form = document.getElementById('point-form');
    const mapImage = document.getElementById('map-image');
    const tooltip = document.getElementById('point-tooltip');
    const tooltipClose = document.getElementById('tooltip-close');

    // Add point button
    if (addBtn) {
        addBtn.onclick = () => {
            editingPointId = null;
            tempX = null;
            tempY = null;
            document.getElementById('point-title').value = '';
            const modalTempMarker = document.getElementById('modal-temp-marker');
            if (modalTempMarker) modalTempMarker.style.display = 'none';
            modal.style.display = 'block';
        };
    }

    // Close modal
    if (closeModal) {
        closeModal.onclick = () => {
            modal.style.display = 'none';
        };
    }

    // Click on modal map to set point location (admin only)
    const modalMapImage = document.getElementById('modal-map-image');
    const modalTempMarker = document.getElementById('modal-temp-marker');

    if (modalMapImage && userRole === 'admin') {
        modalMapImage.onclick = (e) => {
            const rect = modalMapImage.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            tempX = x;
            tempY = y;

            // Show temporary marker
            modalTempMarker.style.display = 'block';
            modalTempMarker.style.left = x + '%';
            modalTempMarker.style.top = y + '%';

            console.log(`Point set at: ${x.toFixed(2)}%, ${y.toFixed(2)}%`);
        };
    }

    // Form submit
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            if (tempX === null || tempY === null) {
                alert(t('map.clickMapFirst') || 'Please click on the map to set the point location first!');
                return;
            }

            const title = document.getElementById('point-title').value;

            const payload = {
                x_percent: tempX,
                y_percent: tempY,
                title,
                description: ''
            };

            try {
                const url = editingPointId
                    ? `${API_URL}/api/map-points/${editingPointId}`
                    : `${API_URL}/api/map-points`;

                const method = editingPointId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    credentials: 'include'
                });

                if (response.ok) {
                    alert(t('map.pointSaved') || 'Point saved successfully!');
                    modal.style.display = 'none';
                    loadMapPoints();
                } else {
                    alert(t('map.saveFailed') || 'Failed to save point.');
                }
            } catch (error) {
                console.error('Error saving point:', error);
                alert(t('map.saveError') || 'An error occurred while saving the point.');
            }
        };
    }

    // Close tooltip
    if (tooltipClose) {
        tooltipClose.onclick = () => {
            tooltip.style.display = 'none';
        };
    }
}

async function loadMapPoints() {
    try {
        const response = await fetch(`${API_URL}/api/map-points`);
        const points = await response.json();

        const container = document.getElementById('map-points-container');
        const mapImage = document.getElementById('map-image');
        container.innerHTML = '';

        points.forEach(point => {
            const marker = document.createElement('div');
            marker.className = 'map-point';
            marker.style.cssText = `
                position: absolute;
                left: ${point.x_percent}%;
                top: ${point.y_percent}%;
                width: 14px;
                height: 14px;
                background: #0b6b3a;
                border: 2px solid #fff;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                transition: all 0.2s;
            `;

            marker.onmouseenter = () => {
                marker.style.transform = 'translate(-50%, -50%) scale(1.3)';
                marker.style.background = '#084d29';
                marker.style.zIndex = '10';
            };

            marker.onmouseleave = () => {
                marker.style.transform = 'translate(-50%, -50%)';
                marker.style.background = '#0b6b3a';
                marker.style.zIndex = '1';
            };

            marker.onclick = () => {
                showTooltip(point, marker);
            };

            // Admin: right-click to edit/delete
            if (userRole === 'admin') {
                marker.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (confirm(t('map.deleteConfirm') || 'Delete this point?')) {
                        deletePoint(point.id);
                    }
                };
            }

            container.appendChild(marker);
        });
    } catch (error) {
        console.error('Error loading map points:', error);
    }
}

function showTooltip(point, markerElement) {
    const tooltip = document.getElementById('point-tooltip');
    const title = document.getElementById('tooltip-title');

    title.textContent = point.title;

    // Show tooltip first to get dimensions
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden';

    // Wait for next frame to get accurate dimensions
    requestAnimationFrame(() => {
        // Get the marker's position in percentage (same as it's positioned)
        const markerLeft = parseFloat(markerElement.style.left);
        const markerTop = parseFloat(markerElement.style.top);

        // Get tooltip dimensions
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;

        // Get map image dimensions to convert percentage to pixels
        const mapImage = document.getElementById('map-image');
        const mapWidth = mapImage.offsetWidth;
        const mapHeight = mapImage.offsetHeight;

        // Calculate pixel positions from percentages
        const markerX = (markerLeft / 100) * mapWidth;
        const markerY = (markerTop / 100) * mapHeight;

        // Position tooltip centered above the marker
        const left = markerX - (tooltipWidth / 2);
        const top = markerY - tooltipHeight - 10;

        tooltip.style.left = Math.max(0, left) + 'px';
        tooltip.style.top = Math.max(0, top) + 'px';
        tooltip.style.visibility = 'visible';
    });
}

async function deletePoint(id) {
    try {
        const response = await fetch(`${API_URL}/api/map-points/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            alert(t('map.pointDeleted') || 'Point deleted successfully!');
            loadMapPoints();
        } else {
            alert(t('map.deleteFailed') || 'Failed to delete point.');
        }
    } catch (error) {
        console.error('Error deleting point:', error);
        alert(t('map.deleteError') || 'An error occurred while deleting the point.');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap);
} else {
    initMap();
}
