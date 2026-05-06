import './style.css'
import { renderNavigation } from './navigation.js'

async function init() {
  document.addEventListener('DOMContentLoaded', () => {
  renderNavigation();
  });
}


init()