import './style.css'
import { renderNavigation } from './navigation.js'
import { initGallery } from './gallery-logic.js'
import {initTrips} from './trips-logic.js'


async function init() {
  document.addEventListener('DOMContentLoaded', () => {
    renderNavigation();
    
    if(document.querySelector('.gallery-grid')) {
      initGallery();
    };

    if(document.querySelector('.trips-container')) {
      initTrips();
    }
  });
}

init()