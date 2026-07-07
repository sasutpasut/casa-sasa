import { t } from './language.js'

export function renderNavigation() {
  const sidebar = document.getElementById('navigation')
  sidebar.innerHTML = `
    <ul>
      <li><a href="/">${t('nav.home')}</a></li>
      <li><a href="/how-to-get-here">${t('nav.howToGetHere')}</a></li>
      <li><a href="/instructions">${t('nav.instructions')}</a></li>
      <li><a href="/trips">${t('nav.tripsAndTips')}</a></li>
      <li><a href="/map">${t('nav.map')}</a></li>
      <li><a href="/gallery">${t('nav.gallery')}</a></li>
    </ul>
  `
}