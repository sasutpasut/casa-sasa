import { t } from './language.js'
import { API_URL } from './config.js'

// Generate a simple device fingerprint
function getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

// Ensure URL has protocol (http:// or https://)
function ensureProtocol(url) {
    if (!url) return '';
    // If URL already has protocol, return as is
    if (url.match(/^https?:\/\//i)) {
        return url;
    }
    // Add https:// by default
    return 'https://' + url;
}

// Check if trip form has any data entered
function isFormDirty() {
    const form = document.getElementById('add-trip-form');
    if (!form) return false;

    // Check text inputs
    const nameInput = document.getElementById('trip-name');
    const authorInput = document.getElementById('trip-author');
    const mapUrlInput = document.getElementById('trip-map-url');
    const descInput = document.getElementById('trip-description');
    const lengthInput = document.getElementById('trip-length');
    const elevationInput = document.getElementById('trip-elevation');

    if (nameInput?.value || authorInput?.value || mapUrlInput?.value ||
        descInput?.value || lengthInput?.value || elevationInput?.value) {
        return true;
    }

    // Check if files are selected
    const photoInput = document.getElementById('trip-photos');
    if (photoInput?.files && photoInput.files.length > 0) {
        return true;
    }

    return false;
}

let currentFilters = {
    car: 'all',
    type: 'all'
};

export async function initTrips() {
    console.log('=== initTrips CALLED ===');
    console.log('document.readyState:', document.readyState);

    if (document.readyState === 'loading') {
        console.log('Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded fired!');
            setupTripsWorkflow();
            setupBucketListWorkflow();
        });
    } else {
        console.log('DOM already loaded, running setup now');
        setupTripsWorkflow();
        setupBucketListWorkflow();
    }
}

async function setupTripsWorkflow() {
    console.log('=== setupTripsWorkflow STARTED ===');

    const container = document.getElementById('trips-container');
    const form = document.getElementById('add-trip-form');
    const addTripBtn = document.getElementById('add-trip-btn');

    console.log('Elements found:', {
        container: !!container,
        form: !!form,
        addTripBtn: !!addTripBtn
    });

    if (!container) {
        console.error('Trips container not found');
        return; // Valid: Inside setupTripsWorkflow function
    }

    // 1. Check Authentication Status to get user role
    let userRole = null;
    try {
        const statusRes = await fetch(`${API_URL}/api/auth/status`, { credentials: 'include' });
        const status = await statusRes.json();

        if (status.loggedIn) {
            userRole = status.role;
            // Show the add trip button for all logged-in users
            if (addTripBtn) {
                addTripBtn.style.display = 'inline-block';
            }
        }
    } catch (error) {
        console.error('Authentication status check failed:', error);
    }

    // 2. Set up modal form handlers
    if (addTripBtn) {
        addTripBtn.onclick = () => {
            const formModal = document.getElementById('trip-form-modal');
            const formTitle = formModal?.querySelector('h3[data-i18n]');

            if (formModal) {
                // Reset form to create mode
                if (form) {
                    form.reset();
                    delete form.dataset.editingTripId;
                    resetFormToCreateMode(form, container, userRole, formModal);
                }

                // Reset title
                if (formTitle) {
                    formTitle.textContent = t('tripForm.title');
                    formTitle.setAttribute('data-i18n', 'tripForm.title');
                }

                formModal.style.display = 'flex';
            }
        };
    }

    // Set up filter handlers
    const filterCar = document.getElementById('filter-car');
    const filterType = document.getElementById('filter-type');

    if (filterCar) {
        filterCar.onchange = () => {
            currentFilters.car = filterCar.value;
            fetchAndRenderTrips(container, userRole);
        };
    }

    if (filterType) {
        filterType.onchange = () => {
            currentFilters.type = filterType.value;
            fetchAndRenderTrips(container, userRole);
        };
    }

    // Close form modal handler
    const closeFormBtn = document.getElementById('close-form-modal');
    const formModal = document.getElementById('trip-form-modal');
    if (closeFormBtn && formModal) {
        closeFormBtn.onclick = () => {
            // Check if form has data and confirm before closing
            if (isFormDirty()) {
                if (!confirm(t('messages.unsavedChanges'))) {
                    return;
                }
            }
            formModal.style.display = 'none';
        };

        // Close when clicking outside
        formModal.onclick = (e) => {
            if (e.target === formModal) {
                // Check if form has data and confirm before closing
                if (isFormDirty()) {
                    if (!confirm(t('messages.unsavedChanges'))) {
                        return;
                    }
                }
                formModal.style.display = 'none';
            }
        };
    }

    // Bind the form handler if it exists on this page layout
    if (form) {
        console.log('=== Attaching form submit handler ===');
        form.onsubmit = async (e) => {
            console.log('=== FORM SUBMITTED ===');
            e.preventDefault();

            const formData = new FormData();
            formData.append('name', document.getElementById('trip-name').value);
            formData.append('map_url', document.getElementById('trip-map-url').value);
            formData.append('length', document.getElementById('trip-length').value);
            formData.append('elevation', document.getElementById('trip-elevation').value);
            formData.append('difficulty', document.getElementById('trip-difficulty').value);
            formData.append('description', document.getElementById('trip-description').value);
            formData.append('author', document.getElementById('trip-author').value);
            formData.append('trip_type', document.getElementById('trip-type').value);
            formData.append('start_from_moggio', document.getElementById('start-from-moggio').value);
            formData.append('drive_time', document.getElementById('drive-time').value || '0');

            const fileInput = document.getElementById('trip-photos');
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('photos', fileInput.files[i]);
            }

            try {
                console.log('Submitting trip form to:', `${API_URL}/api/trips`);
                const response = await fetch(`${API_URL}/api/trips`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include' // Sent auth token with form data
                });

                console.log('Response status:', response.status);

                if (response.ok) {
                    alert(t('messages.tripAddedSuccess'));
                    form.reset();
                    fetchAndRenderTrips(container, userRole);
                    // Close the modal
                    if (formModal) {
                        formModal.style.display = 'none';
                    }
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Server error:', errorData);
                    alert(`${t('messages.tripSaveFailed')}: ${errorData.error || ''}`);
                }
            } catch (error) {
                console.error('Error adding trip:', error);
                alert('An error occurred while adding the trip. Please check console for details.');
            }
        };
    }

    // 3. Kickoff data rendering passing the confirmed role downward
    fetchAndRenderTrips(container, userRole);
}

async function fetchAndRenderTrips(container, userRole) {
    try {
        const res = await fetch(`${API_URL}/api/trips`);
        const trips = await res.json();

        container.innerHTML = '';

        if (trips.length === 0) {
            container.innerHTML = '<p>No trips found. Use the form to add one!</p>';
            return; // Valid: Inside fetchAndRenderTrips function
        }

        // Apply filters
        let filteredTrips = trips;

        if (currentFilters.car === 'moggio') {
            filteredTrips = filteredTrips.filter(t => t.start_from_moggio === 1);
        } else if (currentFilters.car === 'car') {
            filteredTrips = filteredTrips.filter(t => t.start_from_moggio === 0);
        }

        if (currentFilters.type !== 'all') {
            filteredTrips = filteredTrips.filter(t => t.trip_type === currentFilters.type);
        }

        filteredTrips.forEach(trip => {
            const card = document.createElement('div');
            card.className = 'trip-card';

            let imageHtml = '';
            if (trip.photos && trip.photos.length > 0) {
                const coverPhotoUrl = `${API_URL}/uploads/${trip.photos[0]}`;
                imageHtml = `<img src="${coverPhotoUrl}" class="trip-cover" alt="${trip.name}">`;
            }

            const mapButtonHtml = trip.map_url
                ? `<a href="${ensureProtocol(trip.map_url)}" target="_blank" rel="noopener noreferrer" class="btn-map">🗺️ ${t('trips.map')}</a>`
                : '';

            const editButtonHtml = userRole === 'admin'
                ? `<button class="btn-edit" data-id="${trip.id}">✏️ ${t('trips.edit')}</button>`
                : '';

            const deleteButtonHtml = userRole === 'admin'
                ? `<button class="btn-delete" data-id="${trip.id}">🗑️ ${t('trips.delete')}</button>`
                : '';

            // Display stars for rating
            const avgRating = parseFloat(trip.average_rating) || 0;
            const fullStars = Math.floor(avgRating);
            const hasHalfStar = avgRating % 1 >= 0.5;
            let starsHtml = '';
            for (let i = 0; i < 5; i++) {
                if (i < fullStars) {
                    starsHtml += '★';
                } else if (i === fullStars && hasHalfStar) {
                    starsHtml += '⯨';
                } else {
                    starsHtml += '☆';
                }
            }

            // Trip type and location badge
            const tripTypeIcon = {
                'hike': '🥾',
                'city': '🏛️',
                'ascent': '⛰️',
                'bike': '🚴',
                'attraction': '🎯'
            }[trip.trip_type] || '🥾';

            const locationInfo = trip.start_from_moggio === 1
                ? 'From Moggio'
                : `🚗 ${trip.drive_time} min`;

            // Store trip data on the card for modal access
            card.dataset.tripId = trip.id;
            card.dataset.tripData = JSON.stringify(trip);

            card.innerHTML = `
                ${imageHtml}
                <div class="trip-info">
                    <h2>${trip.name}</h2>
                    <p class="trip-author">${t('trips.by')} ${trip.author || 'Anonymous'}</p>
                    <div style="color:#b8860b;font-size:12px;margin:4px 0;">
                        ${starsHtml} <span style="color:#777;font-family:'Courier New',monospace;">(${trip.rating_count || 0})</span>
                    </div>
                    <div class="trip-meta">
                        <span>${tripTypeIcon} ${trip.trip_type}</span>
                        <span>${trip.length} km</span>
                        <span>↗ ${trip.elevation} m</span>
                        <span class="badge badge-${trip.difficulty.toLowerCase()}">${trip.difficulty.toUpperCase()}</span>
                    </div>
                    <div style="font-size:11px;color:#3a6a3a;font-family:'Courier New',monospace;margin-top:4px;">
                        ${locationInfo}
                    </div>
                    <div class="card-actions" style="display: flex; gap: 8px; margin-top: 8px;">
                        ${mapButtonHtml}
                        ${editButtonHtml}
                        ${deleteButtonHtml}
                    </div>
                </div>
            `;

            // Add click handler to open modal (but not when clicking on buttons/links)
            card.addEventListener('click', (e) => {
                // Don't open modal if clicking on links or buttons
                if (e.target.tagName === 'A' || e.target.closest('a') ||
                    e.target.closest('.btn-map') || e.target.closest('.btn-delete') || e.target.closest('.btn-edit')) {
                    return;
                }
                openTripModal(trip);
            });

            container.appendChild(card);
        });

        // 4. Set up individual event bindings for Admin triggers
        if (userRole === 'admin') {
            document.querySelectorAll('.btn-edit').forEach(button => {
                button.onclick = async (e) => {
                    e.stopPropagation();
                    const tripId = e.target.getAttribute('data-id');
                    const card = e.target.closest('.trip-card');
                    const tripData = JSON.parse(card.dataset.tripData);
                    openEditTripModal(tripData, container, userRole);
                };
            });

            document.querySelectorAll('.btn-delete').forEach(button => {
                button.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm(t('messages.tripDeleteConfirm'))) return; // Valid: Inside inline event wrapper

                    const tripId = e.target.getAttribute('data-id');
                    try {
                        const delRes = await fetch(`${API_URL}/api/trips/${tripId}`, {
                            method: 'DELETE',
                            credentials: 'include' // Sent auth token with deletion request
                        });

                        if (delRes.ok) {
                            fetchAndRenderTrips(container, userRole);
                        } else {
                            const errData = await delRes.json();
                            alert(errData.error || t('messages.tripDeleteFailed'));
                        }
                    } catch (error) {
                        console.error("Error executing trip deletion:", error);
                        alert(t('messages.tripDeleteError'));
                    }
                };
            });
        }
    } catch (error) {
        console.error('Error fetching trips:', error);
    }
}

async function openTripModal(trip) {
    const modal = document.getElementById('trip-modal');
    const modalBody = document.getElementById('trip-modal-body');

    if (!modal || !modalBody) return;

    // Build photo gallery HTML if photos exist
    let galleryHtml = '';
    if (trip.photos && trip.photos.length > 0) {
        const photoElements = trip.photos.map(photo =>
            `<img src="${API_URL}/uploads/${photo}" alt="${trip.name}" onclick="openImageInNewTab('${API_URL}/uploads/${photo}')">`
        ).join('');
        galleryHtml = `
            <h3 style="font-family:Georgia,serif;color:#0b5c34;font-size:18px;margin:16px 0 8px;font-weight:bold;">Photos</h3>
            <div class="trip-modal-gallery">
                ${photoElements}
            </div>
        `;
    }

    const mapButtonHtml = trip.map_url
        ? `<a href="${ensureProtocol(trip.map_url)}" target="_blank" rel="noopener noreferrer" class="btn-map">🗺️ ${t('trips.map')}</a>`
        : '';

    // Get device ID and check if user has rated
    const deviceId = getDeviceId();
    let userRating = null;
    try {
        const res = await fetch(`${API_URL}/api/trips/${trip.id}/my-rating?device_id=${deviceId}`);
        const data = await res.json();
        userRating = data.rating;
    } catch (error) {
        console.error('Error fetching user rating:', error);
    }

    // Build rating stars (clickable)
    let ratingStarsHtml = '<div style="font-size:24px;margin:8px 0;">';
    for (let i = 1; i <= 5; i++) {
        const filled = userRating && i <= userRating;
        ratingStarsHtml += `<span class="rating-star" data-rating="${i}" style="cursor:pointer;color:${filled ? '#b8860b' : '#ddd'};">${filled ? '★' : '☆'}</span>`;
    }
    ratingStarsHtml += '</div>';

    const avgRating = parseFloat(trip.average_rating) || 0;
    const ratingText = trip.rating_count > 0
        ? `${avgRating.toFixed(1)} / 5 (${trip.rating_count} ratings)`
        : 'No ratings yet';

    const tripTypeIcon = {
        'hike': '🥾',
        'city': '🏛️',
        'ascent': '⛰️',
        'bike': '🚴',
        'attraction': '🎯'
    }[trip.trip_type] || '🥾';

    const locationInfo = trip.start_from_moggio === 1
        ? 'Start from Moggio'
        : `🚗 ${trip.drive_time} min drive`;

    modalBody.innerHTML = `
        <div class="modal-trip-body">
            <h1 style="font-family:Georgia,serif;color:#0b5c34;font-size:28px;margin:0 0 6px;font-weight:bold;">${trip.name}</h1>
            <hr class="section-divider">

            <p class="trip-author" style="margin:8px 0;">${t('trips.by')} ${trip.author || 'Anonymous'}</p>

            <div style="margin:12px 0;">
                <div style="font-size:13px;color:#777;font-family:'Courier New',monospace;margin-bottom:4px;">${ratingText}</div>
                <div style="font-size:12px;color:#0b5c34;margin-bottom:8px;">Rate this trip:</div>
                ${ratingStarsHtml}
            </div>

            <div style="display:flex;gap:12px;margin:12px 0;flex-wrap:wrap;font-family:'Courier New',monospace;font-size:13px;color:#3a6a3a;">
                <span>${tripTypeIcon} ${trip.trip_type}</span>
                <span><strong>Length:</strong> ${trip.length} km</span>
                <span><strong>Elevation:</strong> ${trip.elevation} m</span>
                <span class="badge badge-${trip.difficulty.toLowerCase()}">${trip.difficulty.toUpperCase()}</span>
            </div>

            <div style="font-size:13px;color:#3a6a3a;font-family:'Courier New',monospace;margin:8px 0;">
                📍 ${locationInfo}
            </div>

            ${galleryHtml}

            <h3 style="font-family:Georgia,serif;color:#0b5c34;font-size:18px;margin:16px 0 8px;font-weight:bold;">Description</h3>
            <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">${trip.description}</p>

            ${mapButtonHtml}
        </div>
    `;

    // Add rating click handlers
    document.querySelectorAll('.rating-star').forEach(star => {
        star.onclick = async () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            try {
                const res = await fetch(`${API_URL}/api/trips/${trip.id}/rate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating, device_id: deviceId })
                });

                if (res.ok) {
                    // Update star display
                    document.querySelectorAll('.rating-star').forEach(s => {
                        const starRating = parseInt(s.getAttribute('data-rating'));
                        if (starRating <= rating) {
                            s.textContent = '★';
                            s.style.color = '#b8860b';
                        } else {
                            s.textContent = '☆';
                            s.style.color = '#ddd';
                        }
                    });

                    // Reload trips to update average
                    setTimeout(() => {
                        const container = document.getElementById('trips-container');
                        if (container) {
                            fetchAndRenderTrips(container, null);
                        }
                    }, 500);
                } else {
                    alert(t('messages.ratingFailed'));
                }
            } catch (error) {
                console.error('Error saving rating:', error);
                alert(t('messages.ratingError'));
            }
        };
    });

    modal.style.display = 'flex';

    // Close modal handlers
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }

    // Close when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Close on Escape key
    document.onkeydown = (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            modal.style.display = 'none';
        }
    };
}

// Helper function to open image in new tab
window.openImageInNewTab = (url) => {
    window.open(url, '_blank');
};

// Function to open edit trip modal
async function openEditTripModal(trip, container, userRole) {
    const formModal = document.getElementById('trip-form-modal');
    const form = document.getElementById('add-trip-form');
    const formTitle = formModal.querySelector('h3[data-i18n]');

    if (!formModal || !form) return;

    // Change title to "Edit Trip"
    if (formTitle) {
        formTitle.textContent = t('tripForm.editTitle');
        formTitle.setAttribute('data-i18n', 'tripForm.editTitle');
    }

    // Populate form with existing trip data
    document.getElementById('trip-name').value = trip.name;
    document.getElementById('trip-author').value = trip.author || '';
    document.getElementById('trip-map-url').value = trip.map_url || '';
    document.getElementById('trip-length').value = trip.length;
    document.getElementById('trip-elevation').value = trip.elevation;
    document.getElementById('trip-difficulty').value = trip.difficulty;
    document.getElementById('trip-type').value = trip.trip_type;
    document.getElementById('start-from-moggio').value = trip.start_from_moggio ? 'true' : 'false';
    document.getElementById('drive-time').value = trip.drive_time || 0;
    document.getElementById('trip-description').value = trip.description;

    // Store trip ID for update
    form.dataset.editingTripId = trip.id;

    // Change form submit handler to update instead of create
    form.onsubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('name', document.getElementById('trip-name').value);
        formData.append('map_url', document.getElementById('trip-map-url').value);
        formData.append('length', document.getElementById('trip-length').value);
        formData.append('elevation', document.getElementById('trip-elevation').value);
        formData.append('difficulty', document.getElementById('trip-difficulty').value);
        formData.append('description', document.getElementById('trip-description').value);
        formData.append('author', document.getElementById('trip-author').value);
        formData.append('trip_type', document.getElementById('trip-type').value);
        formData.append('start_from_moggio', document.getElementById('start-from-moggio').value);
        formData.append('drive_time', document.getElementById('drive-time').value || '0');

        const fileInput = document.getElementById('trip-photos');
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('photos', fileInput.files[i]);
        }

        try {
            const tripId = form.dataset.editingTripId;
            const response = await fetch(`${API_URL}/api/trips/${tripId}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                alert(t('messages.tripUpdatedSuccess'));
                form.reset();
                delete form.dataset.editingTripId;
                fetchAndRenderTrips(container, userRole);
                formModal.style.display = 'none';

                // Reset form title and handler
                if (formTitle) {
                    formTitle.textContent = t('tripForm.title');
                    formTitle.setAttribute('data-i18n', 'tripForm.title');
                }
                resetFormToCreateMode(form, container, userRole, formModal);
            } else {
                alert(t('messages.tripUpdateFailed'));
            }
        } catch (error) {
            console.error('Error updating trip:', error);
            alert(t('messages.tripUpdateError'));
        }
    };

    formModal.style.display = 'flex';
}

// Reset form back to create mode
function resetFormToCreateMode(form, container, userRole, formModal) {
    delete form.dataset.editingTripId;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('name', document.getElementById('trip-name').value);
        formData.append('map_url', document.getElementById('trip-map-url').value);
        formData.append('length', document.getElementById('trip-length').value);
        formData.append('elevation', document.getElementById('trip-elevation').value);
        formData.append('difficulty', document.getElementById('trip-difficulty').value);
        formData.append('description', document.getElementById('trip-description').value);
        formData.append('author', document.getElementById('trip-author').value);
        formData.append('trip_type', document.getElementById('trip-type').value);
        formData.append('start_from_moggio', document.getElementById('start-from-moggio').value);
        formData.append('drive_time', document.getElementById('drive-time').value || '0');

        const fileInput = document.getElementById('trip-photos');
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('photos', fileInput.files[i]);
        }

        try {
            const response = await fetch(`${API_URL}/api/trips`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                alert('Trip added successfully!');
                form.reset();
                fetchAndRenderTrips(container, userRole);
                if (formModal) {
                    formModal.style.display = 'none';
                }
            } else {
                alert('Failed to add trip. Please try again.');
            }
        } catch (error) {
            console.error('Error adding trip:', error);
            alert('An error occurred while adding the trip. Please try again.');
        }
    };
}

// ========== BUCKET LIST FUNCTIONALITY ==========

// Check if bucket list form has any data entered
function isBucketFormDirty() {
    const nameInput = document.getElementById('bucket-name');
    const descInput = document.getElementById('bucket-description');
    const urlInput = document.getElementById('bucket-url');

    if (nameInput?.value || descInput?.value || urlInput?.value) {
        return true;
    }

    return false;
}

async function setupBucketListWorkflow() {
    const container = document.getElementById('bucket-list-container');
    const addBucketBtn = document.getElementById('add-bucket-btn');
    const bucketForm = document.getElementById('bucket-form');
    const bucketModal = document.getElementById('bucket-form-modal');
    const closeBucketBtn = document.getElementById('close-bucket-modal');

    if (!container) {
        console.error('Bucket list container not found');
        return;
    }

    // Check Authentication Status to get user role
    let userRole = null;
    try {
        const statusRes = await fetch(`${API_URL}/api/auth/status`, { credentials: 'include' });
        const status = await statusRes.json();

        if (status.loggedIn && status.role === 'admin') {
            userRole = status.role;
            // Show the add bucket item button for admin
            if (addBucketBtn) {
                addBucketBtn.style.display = 'inline-block';
            }
        }
    } catch (error) {
        console.error('Authentication status check failed:', error);
    }

    // Set up add button handler
    if (addBucketBtn) {
        addBucketBtn.onclick = () => {
            if (bucketForm) {
                bucketForm.reset();
                delete bucketForm.dataset.editingItemId;

                const formTitle = bucketModal?.querySelector('h3[data-i18n]');
                if (formTitle) {
                    formTitle.textContent = t('bucketListForm.addTitle');
                    formTitle.setAttribute('data-i18n', 'bucketListForm.addTitle');
                }
            }
            if (bucketModal) {
                bucketModal.style.display = 'flex';
            }
        };
    }

    // Set up close modal handler
    if (closeBucketBtn && bucketModal) {
        closeBucketBtn.onclick = () => {
            // Check if form has data and confirm before closing
            if (isBucketFormDirty()) {
                if (!confirm(t('messages.unsavedChanges'))) {
                    return;
                }
            }
            bucketModal.style.display = 'none';
        };

        bucketModal.onclick = (e) => {
            if (e.target === bucketModal) {
                // Check if form has data and confirm before closing
                if (isBucketFormDirty()) {
                    if (!confirm(t('messages.unsavedChanges'))) {
                        return;
                    }
                }
                bucketModal.style.display = 'none';
            }
        };
    }

    // Set up form submit handler
    if (bucketForm) {
        bucketForm.onsubmit = async (e) => {
            e.preventDefault();

            const itemData = {
                name: document.getElementById('bucket-name').value,
                description: document.getElementById('bucket-description').value,
                url: document.getElementById('bucket-url').value || null
            };

            const isEditing = bucketForm.dataset.editingItemId;
            const endpoint = isEditing
                ? `${API_URL}/api/bucket-list/${bucketForm.dataset.editingItemId}`
                : `${API_URL}/api/bucket-list`;
            const method = isEditing ? 'PUT' : 'POST';

            try {
                const response = await fetch(endpoint, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData),
                    credentials: 'include'
                });

                if (response.ok) {
                    alert(isEditing ? t('messages.itemUpdatedSuccess') : t('messages.itemAddedSuccess'));
                    bucketForm.reset();
                    delete bucketForm.dataset.editingItemId;
                    fetchAndRenderBucketList(container, userRole);
                    if (bucketModal) {
                        bucketModal.style.display = 'none';
                    }
                } else {
                    alert('Failed to save item. Please try again.');
                }
            } catch (error) {
                console.error('Error saving bucket list item:', error);
                alert('An error occurred while saving the item. Please try again.');
            }
        };
    }

    // Initial render
    fetchAndRenderBucketList(container, userRole);
}

async function fetchAndRenderBucketList(container, userRole) {
    try {
        const res = await fetch(`${API_URL}/api/bucket-list`);
        const items = await res.json();

        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<li style="color:#777;">No items yet. Add your first bucket list item!</li>';
            return;
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.style.marginBottom = '8px';

            const nameHtml = item.url
                ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer" style="color:#0b6b3a;font-weight:bold;">${item.name}</a>`
                : `<strong>${item.name}</strong>`;

            const editButtonHtml = userRole === 'admin'
                ? `<button class="btn-edit-bucket" data-id="${item.id}" style="margin-left:8px;font-size:10px;padding:2px 6px;">✏️ ${t('trips.editBucketItem')}</button>`
                : '';

            const deleteButtonHtml = userRole === 'admin'
                ? `<button class="btn-delete-bucket" data-id="${item.id}" style="margin-left:4px;font-size:10px;padding:2px 6px;">🗑️ ${t('trips.deleteBucketItem')}</button>`
                : '';

            li.innerHTML = `
                ${nameHtml} - ${item.description}
                ${editButtonHtml}
                ${deleteButtonHtml}
            `;

            container.appendChild(li);
        });

        // Set up edit and delete handlers for admin
        if (userRole === 'admin') {
            document.querySelectorAll('.btn-edit-bucket').forEach(button => {
                button.onclick = async () => {
                    const itemId = button.getAttribute('data-id');
                    const item = items.find(i => i.id == itemId);
                    if (item) {
                        openEditBucketModal(item);
                    }
                };
            });

            document.querySelectorAll('.btn-delete-bucket').forEach(button => {
                button.onclick = async () => {
                    if (!confirm(t('messages.itemDeleteConfirm'))) return;

                    const itemId = button.getAttribute('data-id');
                    try {
                        const delRes = await fetch(`${API_URL}/api/bucket-list/${itemId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });

                        if (delRes.ok) {
                            fetchAndRenderBucketList(container, userRole);
                        } else {
                            alert("Failed to delete item.");
                        }
                    } catch (error) {
                        console.error("Error deleting bucket list item:", error);
                        alert("An error occurred while deleting the item.");
                    }
                };
            });
        }
    } catch (error) {
        console.error('Error fetching bucket list:', error);
    }
}

function openEditBucketModal(item) {
    const bucketModal = document.getElementById('bucket-form-modal');
    const bucketForm = document.getElementById('bucket-form');
    const formTitle = bucketModal?.querySelector('h3[data-i18n]');

    if (!bucketModal || !bucketForm) return;

    // Change title to "Edit Item"
    if (formTitle) {
        formTitle.textContent = t('bucketListForm.editTitle');
        formTitle.setAttribute('data-i18n', 'bucketListForm.editTitle');
    }

    // Populate form with existing data
    document.getElementById('bucket-name').value = item.name;
    document.getElementById('bucket-description').value = item.description;
    document.getElementById('bucket-url').value = item.url || '';

    // Store item ID for update
    bucketForm.dataset.editingItemId = item.id;

    bucketModal.style.display = 'flex';
}