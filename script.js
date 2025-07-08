// script.js

async function fetchText(url) {
  try {
    const res = await fetch(url);
    return await res.text();
  } catch {
    return "⚠️ Failed to load file.";
  }
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch {
    return [];
  }
}

function parseCSV(csvText) {
  const rows = csvText.trim().split('\n').map(r => r.split(','));
  const headers = rows[0];
  const body = rows.slice(1);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
  body.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = row.map(col => `<td>${col}</td>`).join('');
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

let globalData = [];
let currentFolder = null;

async function renderManualBanners(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const manualBanners = await fetchJSON('banners.json');
  if (!Array.isArray(manualBanners) || manualBanners.length === 0) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'relative overflow-hidden';
  const inner = document.createElement('div');
  inner.className = 'flex transition-transform duration-500 ease-in-out';
  wrapper.appendChild(inner);
  container.appendChild(wrapper);

  manualBanners.forEach(banner => {
    const slide = document.createElement('div');
    slide.className = 'min-w-full px-4 py-2 text-sm text-yellow-800 bg-yellow-100 rounded';
    if (!banner.link || banner.link === '#') {
      slide.innerText = banner.message;
    } else {
      const a = document.createElement('a');
      a.href = banner.link;
      a.target = banner.target || '_self';
      a.innerText = banner.message;
      a.className = 'hover:underline';
      slide.appendChild(a);
    }
    inner.appendChild(slide);
  });

  let index = 0;
  setInterval(() => {
    index = (index + 1) % manualBanners.length;
    inner.style.transform = `translateX(-${index * 100}%)`;
  }, 4000);
}

// ...rest of script remains unchanged

// Place the rest of your script.js content here below this line (unchanged).
// e.g., renderDashboard, openFolderView, showTabContent, etc.
