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
  table.className = "table-auto w-full text-sm border border-gray-300";

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="bg-gray-200">${headers.map(h => `<th class="px-2 py-1 border">${h}</th>`).join('')}</tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  body.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = row.map(col => `<td class="px-2 py-1 border">${col}</td>`).join('');
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

let globalData = [];
let currentFolder = null;
let openTabs = [];

async function renderDashboard() {
  const spinner = document.getElementById('loadingSpinner');
  spinner?.classList.remove('hidden');

  const res = await fetch('files.json');
  const data = await res.json();
  globalData = data;

  const folderList = document.getElementById('folderList');
  folderList.innerHTML = '';

  const notificationList = document.getElementById("notificationList");
  if (notificationList) notificationList.innerHTML = '';

  const sortedData = data.sort((a, b) => {
    const maxA = Math.max(...a.files.map(f => new Date(f.updated).getTime()));
    const maxB = Math.max(...b.files.map(f => new Date(f.updated).getTime()));
    return maxB - maxA;
  });

  let hasNew = false;

  for (const folder of sortedData) {
    const hasRecent = folder.files.some(f => (Date.now() - new Date(f.updated).getTime()) < (24 * 60 * 60 * 1000));
    if (hasRecent) hasNew = true;

    const folderBtn = document.createElement('div');
    folderBtn.className = "bg-white rounded-lg shadow p-3 hover:shadow-md transition cursor-pointer border border-gray-200 hover:bg-blue-50 flex justify-between items-center";
    folderBtn.setAttribute('tabindex', '0');
    folderBtn.innerHTML = `<h2 class="text-base font-semibold text-blue-700">${folder.folder}</h2>`;

    folderBtn.addEventListener('click', () => openFolderView(folder.folder));
    folderList.appendChild(folderBtn);

    for (const file of folder.files) {
      const isRecent = (Date.now() - new Date(file.updated).getTime()) < (24 * 60 * 60 * 1000);
      if (isRecent && notificationList) {
        const notifItem = document.createElement("div");
        notifItem.className = "bg-white rounded shadow p-3 border hover:bg-blue-50";

        notifItem.innerHTML = `
          <div class="font-semibold text-sm text-blue-700 mb-1">${file.name}</div>
          <div class="text-xs text-gray-500 mb-2">in <strong>${folder.folder}</strong></div>
          <div class="flex gap-2">
            <button class="text-xs text-white bg-blue-600 px-2 py-1 rounded hover:bg-blue-700" onclick="openFolderView('${folder.folder}'); showTabContentByName('${file.name}')">Open</button>
            <button class="text-xs text-blue-600 underline" onclick="openFolderView('${folder.folder}')">Full View</button>
          </div>
        `;
        notificationList.appendChild(notifItem);
      }
    }
  }

  const notificationBar = document.getElementById('notificationBar');
  if (notificationBar) {
    notificationBar.classList.toggle('hidden', !hasNew || currentFolder !== null);
    notificationBar.innerHTML = hasNew && currentFolder === null
      ? '<div class="bg-yellow-100 text-yellow-700 text-sm px-4 py-2 rounded shadow">🆕 New file updates available in one or more folders</div>'
      : '';
  }

  spinner?.classList.add('hidden');
}

async function openFolderView(folderName) {
  currentFolder = folderName;
  const folderData = globalData.find(f => f.folder === folderName);
  if (!folderData) return;

  const folderViewer = document.getElementById('folderViewer');
  const folderTitle = document.getElementById('folderTitle');
  const folderContent = document.getElementById('folderContent');

  folderTitle.innerText = `${folderName}`;
  folderContent.innerHTML = '';
  openTabs = [];

  const tabHeader = document.createElement('div');
  tabHeader.className = 'flex space-x-2 mb-4 overflow-x-auto';
  const tabContent = document.createElement('div');
  tabContent.id = 'tabContent';

  folderContent.appendChild(tabHeader);
  folderContent.appendChild(tabContent);

  for (const file of folderData.files) {
    const tab = document.createElement('button');
    tab.className = 'bg-white px-4 py-2 border rounded hover:bg-blue-100 text-sm';
    tab.innerText = file.name;
    tab.addEventListener('click', () => showTabContent(file));
    tabHeader.appendChild(tab);
  }

  if (folderData.files.length > 0) {
    await showTabContent(folderData.files[0]);
  }

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
        <pre id="txt-${file.name}" class="bg-gray-50 p-4 rounded border max-h-[60vh] overflow-auto whitespace-pre-wrap">${text}</pre>
      </div>`;
  } else if (file.type === 'csv') {
    const csv = await fetchText(file.url);
    const table = parseCSV(csv);
    content = `<div class="overflow-auto max-h-[60vh]">${table.outerHTML}</div>`;
  } else if (file.type.match(/(png|jpg|jpeg|gif)/)) {
    content = `<img src="${file.url}" alt="${file.name}" class="max-h-[70vh] mx-auto rounded-lg" />`;
  } else {
    content = `<a href="${file.url}" download class="text-blue-600 underline">⬇️ Download File</a>`;
  }

  const backBtn = `<button class="mt-4 text-blue-600 underline" onclick="openFolderView('${currentFolder}')">⬅ Back to folder</button>`;

  wrapper.innerHTML = title + content + backBtn;
  tabContent.appendChild(wrapper);
}

function showTabContentByName(name) {
  const folder = globalData.find(f => f.folder === currentFolder);
  if (!folder) return;
  const file = folder.files.find(f => f.name === name);
  if (file) showTabContent(file);
}

document.getElementById("closeViewer").addEventListener("click", () => {
  currentFolder = null;
  document.getElementById('folderViewer').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('notificationBar')?.classList.remove('hidden');
});

document.getElementById("refreshBtn").addEventListener("click", () => {
  renderDashboard();
});

document.getElementById("toggleSidebar")?.addEventListener("click", () => {
  const sidebar = document.getElementById("sidebar");
  const icon = document.getElementById("toggleSidebar");
  sidebar.classList.toggle("hidden");
  icon.innerText = sidebar.classList.contains("hidden") ? '➡' : '⬅';
});

document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'searchInput';
  searchInput.placeholder = 'Search folder...';
  searchInput.className = 'w-full mt-4 p-2 border rounded text-base';

  const folderList = document.getElementById('folderList');
  folderList.parentElement.insertBefore(searchInput, folderList);

  searchInput.addEventListener('input', () => {
    const searchValue = searchInput.value.toLowerCase();
    const folderItems = folderList.querySelectorAll('div');
    folderItems.forEach(folder => {
      const text = folder.innerText.toLowerCase();
      folder.style.display = text.includes(searchValue) ? '' : 'none';
    });
  });
});
