import './style.css'
import { fetchMockData } from './api/mockService'

const app = document.querySelector('#app')

async function init() {
  const data = await fetchMockData()

  app.innerHTML = `
    <div class="container">
      <h1>Mock Frontend App</h1>
      <p>${data.message}</p>
      <button id="refresh">Refresh Data</button>
    </div>
  `

  document.getElementById('refresh').onclick = init
}

init()