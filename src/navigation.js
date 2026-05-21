export function renderNavigation() {
  const sidebar = document.getElementById('navigation')
  sidebar.innerHTML = `
    <ul>
      <li><a href="/index.html">Home</a></li>
      <li><a href="/how-to-get-here.html">How to get here</a></li>
      <li><a href="/instructions.html">Instructions</a></li>
      <li><a href="/trips.html">Trips</a></li>
      <li><a href="/gallery.html">Gallery</a></li>
    </ul>
  `
}