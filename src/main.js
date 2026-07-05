console.log('=== main.js LOADED ===');

import './style.css'
import { renderNavigation } from './navigation.js'
import { initGallery } from './gallery-logic.js'
import { initTrips } from './trips-logic.js'
import { renderAuthButton } from './auth.js'
import { renderLanguageToggle, updateI18nElements, t } from './language.js'
import { requireAuth } from './auth-guard.js'


async function init() {
  console.log('=== init() CALLED ===');
  // Check authentication first
  await requireAuth();

  // Initialize page content
  const initPage = () => {
    renderLanguageToggle();
    renderNavigation();
    renderAuthButton();
    updatePageLanguage();
    updateI18nElements();

    if(document.querySelector('.gallery-grid')) {
      initGallery();
    };

    if(document.getElementById('trips-container')) {
      console.log('=== trips-container found, calling initTrips() ===');
      initTrips();
    } else {
      console.log('=== trips-container NOT found ===');
    }
  };

  // Run immediately if DOM is already loaded, otherwise wait for DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    // DOM is already loaded
    initPage();
  }
}

function updatePageLanguage() {
  // Update header subtitle
  const headerSubtitle = document.querySelector('.header-content a div');
  if (headerSubtitle) {
    headerSubtitle.textContent = t('header.subtitle');
  }
}

init()