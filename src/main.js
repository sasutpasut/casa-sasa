import './style.css'
import { renderNavigation } from './navigation.js'
import { initGallery } from './gallery-logic.js'


async function init() {
  document.addEventListener('DOMContentLoaded', () => {
    renderNavigation();
    if(document.querySelector('.gallery-grid')) {
      initGallery();
    };
  });
}

init()