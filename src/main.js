import './style.css'
import { renderNavigation } from './navigation.js'
import { loadGallery } from './gallery-logic.js'


async function init() {
  document.addEventListener('DOMContentLoaded', () => {
    renderNavigation();
    if(document.querySelector('.gallery-grid')) {
      loadGallery();
    };
  });
}

init()