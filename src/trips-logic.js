const API_URL = 'http://localhost:3000';

export async function initTrips() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setupTripsWorkflow());
    } else {
        setupTripsWorkflow();
    }
}

async function setupTripsWorkflow() {
    const container = document.getElementById('trips-container');
    const form = document.getElementById('add-trip-form');
    
    if (!container) {
        console.error('Trips container not found');
        return; // Valid: Inside setupTripsWorkflow function
    }

    // 1. Check Authentication Status with credentials included
    let userRole = null;
    try {
        const statusRes = await fetch(`${API_URL}/api/auth/status`, { credentials: 'include' });
        const status = await statusRes.json();

        if (!status.loggedIn) {
            window.location.href = 'login.html'; 
            return; // Valid: Inside setupTripsWorkflow function
        }
        
        userRole = status.role; 
    } catch (error) {
        console.error('Authentication status check failed:', error);
        window.location.href = 'login.html';
        return; // Valid: Inside setupTripsWorkflow function
    }

    // 2. Bind the form handler if it exists on this page layout
    if (form) {
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

            const fileInput = document.getElementById('trip-photos');
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('photos', fileInput.files[i]);
            }

            try {
                const response = await fetch(`${API_URL}/api/trips`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include' // Sent auth token with form data
                });

                if (response.ok) {
                    alert('Trip added successfully!');
                    form.reset();
                    fetchAndRenderTrips(container, userRole);
                } else {
                    alert('Failed to add trip. Please try again.');
                }
            } catch (error) {
                console.error('Error adding trip:', error);
                alert('An error occurred while adding the trip. Please try again.');
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

        trips.forEach(trip => {
            const card = document.createElement('div');
            card.className = 'trip-card';
            
            let imageHtml = '';
            if (trip.photos && trip.photos.length > 0) {
                const coverPhotoUrl = `${API_URL}/uploads/${trip.photos[0]}`;
                imageHtml = `<img src="${coverPhotoUrl}" class="trip-cover" alt="${trip.name}">`;
            } 
            
            const mapButtonHtml = trip.map_url 
                ? `<a href="${trip.map_url}" target="_blank" rel="noopener noreferrer" class="btn-map">🗺️ View Map Route</a>`
                : '';

            const deleteButtonHtml = userRole === 'admin'
                ? `<button class="btn-delete" data-id="${trip.id}">🗑️ Delete Trip</button>`
                : '';

            card.innerHTML = `
                <div class="trip-info">
                    <h2>${trip.name}</h2>
                    <p class="trip-author">Added by: <strong>${trip.author || 'Anonymous'}</strong></p>
                    <div class="trip-meta">
                        <span><strong>Length:</strong> ${trip.length} km</span>
                        <span><strong>Elevation Gain:</strong> ${trip.elevation} m</span>
                        <span class="badge badge-${trip.difficulty.toLowerCase()}">${trip.difficulty}</span>
                    </div>
                    <p class="trip-description">${trip.description}</p>
                    <div class="card-actions" style="display: flex; gap: 10px; margin-top: 10px;">
                        ${mapButtonHtml}
                        ${deleteButtonHtml}
                    </div>
                </div>
                ${imageHtml}
            `;

            container.appendChild(card);
        });

        // 4. Set up individual event bindings for Admin triggers
        if (userRole === 'admin') {
            document.querySelectorAll('.btn-delete').forEach(button => {
                button.onclick = async (e) => {
                    if (!confirm("Are you sure you want to delete this trip permanently?")) return; // Valid: Inside inline event wrapper
                    
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
                            alert(errData.error || "Failed to delete trip.");
                        }
                    } catch (error) {
                        console.error("Error executing trip deletion:", error);
                        alert("An error occurred while deleting the trip.");
                    }
                };
            });
        }
    } catch (error) {
        console.error('Error fetching trips:', error);
    }
}