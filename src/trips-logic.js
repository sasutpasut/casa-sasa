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
        return;
    }

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
                    body: formData
                });

                if (response.ok) {
                    alert('Trip added successfully!');
                    form.reset();
                    fetchAndRenderTrips(container);
                } else {
                    alert('Failed to add trip. Please try again.');
                }
            } catch (error) {
                console.error('Error adding trip:', error);
                alert('An error occurred while adding the trip. Please try again.');
            }
        };
    }

    fetchAndRenderTrips(container);
}

async function fetchAndRenderTrips(container) {
    try {
        const res = await fetch(`${API_URL}/api/trips`);
        const trips = await res.json();

        container.innerHTML = '';

        if (trips.length === 0) {
            container.innerHTML = '<p>No trips found. Use the form to add one!</p>';
            return;
        }

        trips.forEach(trip => {
            const card = document.createElement('div');
            card.className = 'trip-card';
            
            let imageHtml = ''
            if (trip.photos && trip.photos.length > 0) {
                const coverPhotoUrl = `${API_URL}/uploads/${trip.photos[0]}`;
                imageHtml = `<img src="${coverPhotoUrl}" class="trip-cover" alt="${trip.name}">`;
            } 
            
            const mapButtonHtml = trip.map_url 
                ? `<a href="${trip.map_url}" target="_blank" rel="noopener noreferrer" class="btn-map">🗺️ View Map Route</a>`
                : '';

            card.innerHTML = `
                <div class="trip-info">
                    <h2>${trip.name}</h2>
                    <p class="trip-author">Added by: <strong>${trip.author || 'Anonymous'}</strong></p>
                    <div class="trip-meta">
                        <span><strong>Length:</strong> ${trip.length} km</span>
                        <span> <strong>Elevation Gain:</strong> ${trip.elevation} m</span>
                        <span class="badge badge-${trip.difficulty.toLowerCase()}">${trip.difficulty}</span>
                    </div>
                    ${mapButtonHtml}
                    <p class="trip-description">${trip.description}</p>
                </div>
            ${imageHtml}
            `;

            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error fetching trips:', error);
    }
}