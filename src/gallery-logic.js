let allImagePaths = [];
let currentImageIndex = 0;

export function loadGallery() {
    const container = document.querySelector('.gallery-grid');
    if (!container) {
        console.error('Gallery container not found');
        return;
    }

    // Import images
    const images = import.meta.glob('/src/assets/gallery/*.{png,jpg,jpeg,SVG,webp}', { eager: true });

    // Reset path array
    allImagePaths = Object.values(images).map(image => image.default);

    // Loop through images and create elements
    allImagePaths.forEach((imgPath, index) => {
        const imgElement = document.createElement('img');
        imgElement.src = imgPath;
        imgElement.alt = `Gallery image ${index + 1}`;
        imgElement.classList.add('gallery-item');
        imgElement.loading = 'lazy';

        imgElement.addEventListener('click', () => {
            openModal(index);
        });

        container.appendChild(imgElement);}
    );

    setupModalControls();
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

