const API_URL = 'http://localhost:3000';

export async function initTrips() {
    const container = document.querySelector('.trips-container');
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
            formData.append('length', document.getElementById('trip-length').value);
            formData.append('elevation', document.getElementById('trip-elevation').value);
            formData.append('difficulty', document.getElementById('trip-difficulty').value);
            formData.append('description', document.getElementById('trip-description').value);

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

            const coverPhoto = trip.photos.length > 0
                ? `${API_URL}/uploads/${trip.photos[0]}`
                : 'https://via.placeholder.com/300x200?text=No+Image';

            card.innerHTML = `
                <img src="${coverPhoto}" class="trip-cover" alt="${trip.name}">
                <div class="trip-info">
                    <h3>${trip.name}</h3>
                    <div class="trip-meta">
                        <span><strong>Length:</strong> ${trip.length} km</span>
                        <span> <strong>Elevation Gain:</strong> ${trip.elevation} m</span>
                        <span class="badge badge-${trip.difficulty.toLowerCase()}">${trip.difficulty}</span>
                    </div>
                    <p class="trip-description">${trip.description}</p>
                </div>
            `;

            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error fetching trips:', error);
    }
}