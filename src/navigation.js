import { t } from './language.js'

export function renderNavigation() {
  const sidebar = document.getElementById('navigation')
  sidebar.innerHTML = `
    <ul>
      <li><a href="/index.html">${t('nav.home')}</a></li>
      <li><a href="/how-to-get-here.html">${t('nav.howToGetHere')}</a></li>
      <li><a href="/instructions.html">${t('nav.instructions')}</a></li>
      <li><a href="/trips.html">${t('nav.tripsAndTips')}</a></li>
      <li><a href="/gallery.html">${t('nav.gallery')}</a></li>
    </ul>
  `
}