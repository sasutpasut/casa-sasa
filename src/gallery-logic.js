import { API_URL } from './config.js'

let allImagePaths = [];
let currentImageIndex = 0;
let userRole = null;

export async function initGallery() {
    const container = document.querySelector('.gallery-grid');
    const uploadForm = document.getElementById('upload-form');
    const uploadSection = document.getElementById('upload-section');

    if (!container) {
        console.error('Gallery container not found');
        return;
    }

    // Check if user is logged in to show upload form and delete buttons
    try {
        const statusRes = await fetch(`${API_URL}/api/auth/status`, { credentials: 'include' });
        const status = await statusRes.json();

        if (status.loggedIn) {
            userRole = status.role;
            if (uploadSection) {
                uploadSection.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }

    fetchImages(container);

    if(uploadForm) {
        uploadForm.onsubmit = async (event) => {
            event.preventDefault();
            const fileInput = document.getElementById('file-input');
            const files = fileInput.files;

            if(files.length === 0) return;

            // Limit to 10 files
            if(files.length > 10) {
                alert('You can only upload up to 10 images at once.');
                return;
            }

            const uploadButton = uploadForm.querySelector('button[type="submit"]');
            uploadButton.disabled = true;
            uploadButton.textContent = `Uploading ${files.length} photo${files.length > 1 ? 's' : ''}...`;

            let successCount = 0;
            let failCount = 0;

            // Upload files one by one
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('image', files[i]);

                try {
                    const response = await fetch(`${API_URL}/api/upload`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                    });

                    if(response.ok) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    console.error('Error uploading image:', error);
                    failCount++;
                }

                // Update button text with progress
                uploadButton.textContent = `Uploading ${i + 1}/${files.length}...`;
            }

            // Reset button
            uploadButton.disabled = false;
            uploadButton.textContent = 'Upload Photos';

            // Show results
            if (successCount > 0 && failCount === 0) {
                alert(`Successfully uploaded ${successCount} photo${successCount > 1 ? 's' : ''}!`);
            } else if (successCount > 0 && failCount > 0) {
                alert(`Uploaded ${successCount} photo${successCount > 1 ? 's' : ''}, ${failCount} failed.`);
            } else {
                alert('Failed to upload photos. Please try again.');
            }

            fileInput.value = '';
            fetchImages(container);
        }
    }
}

async function fetchImages(container) {
    try {
        const res = await fetch(`${API_URL}/api/images`);
        allImagePaths = await res.json();

        container.innerHTML = '';

        allImagePaths.forEach((imgPath, index) => {
            const frameElement = document.createElement('div');
            frameElement.className = 'gallery-frame';

            const imgElement = document.createElement('img');
            imgElement.src = imgPath;
            imgElement.alt = `Gallery image ${index + 1}`;
            imgElement.className = 'gallery-item';
            imgElement.loading = 'lazy';
            imgElement.onclick = () => openModal(index);

            const tempImage = new Image();
            tempImage.src = imgPath;
            tempImage.onload = () => {
                if(tempImage.naturalWidth > tempImage.naturalHeight) {
                    frameElement.classList.add('frame-landscape');
                } else {
                    frameElement.classList.add('frame-portrait');
                }
            };

            frameElement.appendChild(imgElement);

            // Add delete button for admin users
            if (userRole === 'admin') {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'gallery-delete-btn';
                deleteBtn.textContent = '🗑️';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation(); // Prevent opening modal
                    deleteImage(imgPath, container);
                };
                frameElement.appendChild(deleteBtn);
            }

            container.appendChild(frameElement);
        });

        setupModalControls();
    } catch (error) {
        console.error('Error fetching images:', error);
    }
}

async function deleteImage(imagePath, container) {
    if (!confirm('Are you sure you want to delete this image?')) {
        return;
    }

    try {
        // Extract filename from path
        const filename = imagePath.split('/').pop();

        const response = await fetch(`${API_URL}/api/images/${filename}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            alert('Image deleted successfully!');
            fetchImages(container);
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to delete image.');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        alert('An error occurred while deleting the image.');
    }
}

function openModal(index) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('enlarged-image');

    if (modal && modalImage) {
        modalImage.src = allImagePaths[index];
        modal.style.display = 'flex';
    }
}

function setupModalControls() {
    const modal = document.getElementById('image-modal');
    const closeBtn = document.querySelector('.close-modal');
    const prevBtn = document.querySelector('.prev-modal');
    const nextBtn = document.querySelector('.next-modal');

    if (!modal) {
        console.error('Modal controls not found');
        return;
    }

    if (!closeBtn) console.error('Close button not found');
    if (!prevBtn) console.error('Previous button not found');
    if (!nextBtn) console.error('Next button not found');

    if (prevBtn) prevBtn.onclick = () => changeImage(-1);
    if (nextBtn) nextBtn.onclick = () => changeImage(1);
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';

    // Close modal when clicking outside the image
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    document.onkeydown = (event) => {
    if(modal.style.display === 'flex') {
        if(event.key === 'ArrowLeft') {
            changeImage(-1);
        } else if(event.key === 'ArrowRight') {
            changeImage(1);
        } else if(event.key === 'Escape') {
            modal.style.display = 'none';
        }
    }
}
}

function changeImage(direction) {
    const modalImage = document.getElementById('enlarged-image');
    if(!modalImage) return;

    currentImageIndex += direction;

    if (currentImageIndex < 0) {
        currentImageIndex = allImagePaths.length - 1;
    } else if (currentImageIndex >= allImagePaths.length) {
        currentImageIndex = 0;
    }

    modalImage.src = allImagePaths[currentImageIndex];
}

