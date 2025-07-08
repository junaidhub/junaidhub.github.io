async function fetchText(url) {
  try {
    const res = await fetch(url);
    return await res.text();
  } catch {
    return "⚠️ Failed to load file.";
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

async function renderDashboard() {
  const spinner = document.getElementById('loadingSpinner');
  spinner?.classList.remove('hidden');

  const res = await fetch('files.json');
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

  const notificationBar = document.getElementById('notificationBar');
  notificationBar.classList.toggle('hidden', !hasNew || currentFolder !== null);
  notificationBar.innerHTML = hasNew && currentFolder === null
    ? `<div class="bg-yellow-100 text-yellow-800 px-4 py-2 rounded text-sm">New files available in one or more folders</div>`
    : '';

  spinner?.classList.add('hidden');
}

async function openFolderView(folderName) {
  currentFolder = folderName;
  const folderData = globalData.find(f => f.folder === folderName);
  if (!folderData) return;

  const folderViewer = document.getElementById('folderViewer');
  const folderTitle = document.getElementById('folderTitle');
  const folderContent = document.getElementById('folderContent');

  folderTitle.textContent = folderName;
  folderContent.innerHTML = '';

  const tabHeader = document.createElement('div');
  tabHeader.className = 'flex gap-2 mb-4 flex-wrap';
  const tabContent = document.createElement('div');
  tabContent.id = 'tabContent';

  folderContent.appendChild(tabHeader);
  folderContent.appendChild(tabContent);

  folderData.files.forEach((file, idx) => {
    const tab = document.createElement('button');
    tab.className = 'px-4 py-2 border rounded bg-white hover:bg-blue-50 text-sm';
    tab.innerText = file.name;
    tab.addEventListener('click', () => showTabContent(file));
    tabHeader.appendChild(tab);
    if (idx === 0) showTabContent(file);
  });

  document.getElementById('dashboard').classList.add('hidden');
  folderViewer.classList.remove('hidden');
  document.getElementById('notificationBar')?.classList.add('hidden');
}

async function showTabContent(file) {
  const tabContent = document.getElementById('tabContent');
  tabContent.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = "bg-white p-4 rounded-lg shadow border";

  const title = `<h3 class="text-lg font-semibold mb-2">${file.name}</h3>`;
  let content = '';

  if (file.type === 'txt' || file.type === 'md') {
    const text = await fetchText(file.url);
    content = `
      <div class="relative">
        <button class="absolute top-0 right-0 text-sm text-gray-500 hover:text-blue-600" onclick="navigator.clipboard.writeText(document.getElementById('txt-${file.name}').innerText)">📋</button>
        <pre id="txt-${file.name}" class="bg-gray-50 p-4 rounded border file-preview whitespace-pre-wrap">${text}</pre>
      </div>`;
  } else if (file.type === 'csv') {
    const csv = await fetchText(file.url);
    const table = parseCSV(csv);
    content = `<div class="file-preview">${table.outerHTML}</div>`;
  } else if (file.type.match(/(png|jpg|jpeg|gif|webp)/)) {
    content = `<img src="${file.url}" alt="${file.name}" class="preview" />`;
  } else if (file.type.match(/(mp4|webm)/)) {
    content = `<video controls class="w-full max-h-[60vh] rounded"><source src="${file.url}" type="video/${file.type}">Your browser does not support video.</video>`;
  } else if (file.type === 'pdf') {
    content = `<iframe src="${file.url}" class="w-full h-[70vh] rounded" frameborder="0"></iframe>`;
  } else {
    content = `<a href="${file.url}" download class="text-blue-600 underline">⬇️ Download File</a>`;
  }

  const backBtn = `<button class="mt-4 text-blue-600 underline" onclick="openFolderView('${currentFolder}')">← Back to folder</button>`;

  wrapper.innerHTML = title + content + backBtn;
  tabContent.appendChild(wrapper);
}

// Sidebar search
document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();

  document.getElementById("closeViewer").addEventListener("click", () => {
    currentFolder = null;
    document.getElementById('folderViewer').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('notificationBar')?.classList.remove('hidden');
  });

  document.getElementById("refreshBtn").addEventListener("click", () => {
    renderDashboard();
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
