// script.js

async function renderDashboard(filesJsonPath = 'assets/files.json') {
  const spinner = document.getElementById('loadingSpinner');
  spinner?.classList.remove('hidden');

  const res = await fetch(filesJsonPath);
  const data = await res.json();
  globalData = data;

  const folderList = document.getElementById('folderList');
  folderList.innerHTML = '';

  const sortedData = data.sort((a, b) => {
    const maxA = Math.max(...a.files.map(f => new Date(f.updated).getTime()));
    const maxB = Math.max(...b.files.map(f => new Date(f.updated).getTime()));
    return maxB - maxA;
  });

  let hasNew = false;

  for (const folder of sortedData) {
    const hasRecent = folder.files.some(f => (Date.now() - new Date(f.updated).getTime()) < 86400000);
    if (hasRecent) hasNew = true;

    const div = document.createElement('div');
    div.className = "card cursor-pointer border border-gray-200";
    div.setAttribute('tabindex', '0');
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-medium text-blue-700">${folder.folder}</span>
        ${hasRecent ? '<span class="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded">NEW</span>' : ''}
      </div>
    `;
    div.addEventListener('click', () => openFolderView(folder.folder));
    folderList.appendChild(div);
  }

  spinner?.classList.add('hidden');
}

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
  const manualBanners = await fetchJSON('assets/banners.json');
  if (!Array.isArray(manualBanners) || manualBanners.length === 0) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'relative overflow-hidden h-40 w-full';

  const inner = document.createElement('div');
  inner.className = 'absolute w-full flex flex-col animate-scroll-vertical';
  wrapper.appendChild(inner);
  container.appendChild(wrapper);

  manualBanners.forEach(banner => {
    const slide = document.createElement('div');
    slide.className = 'px-4 py-2 text-sm text-yellow-800 bg-yellow-100 border-b border-yellow-300';
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
}

document.addEventListener("DOMContentLoaded", async () => {
  await renderManualBanners("notificationBar");
  await renderDashboard('assets/files.json');

  document.getElementById("closeViewer").addEventListener("click", () => {
    currentFolder = null;
    document.getElementById('folderViewer').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('notificationBar')?.classList.remove('hidden');
  });

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    const searchValue = searchInput.value.toLowerCase();
    const folderItems = document.getElementById('folderList').children;
    for (const item of folderItems) {
      const text = item.innerText.toLowerCase();
      item.style.display = text.includes(searchValue) ? '' : 'none';
    }
  });
});
