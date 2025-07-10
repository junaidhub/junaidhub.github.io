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
  thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  body.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = row.map(col => `<td>${col}</td>`).join('');
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

function getFileIcon(type) {
  const map = {
    'txt': '📄', 'md': '📝', 'csv': '📊', 'json': '🧾',
    'pdf': '📕', 'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️',
    'gif': '🖼️', 'zip': '🗜️', 'mp4': '🎞️', 'mp3': '🎵',
    'folder': '📁'
  };
  return map[type.toLowerCase()] || '📦';
}

let globalData = [];
let currentFolder = null;

async function renderDashboard() {
  const spinner = document.getElementById('loadingSpinner');
  spinner?.classList.remove('hidden');

  try {
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
      const hasRecent = folder.files.some(f => (Date.now() - new Date(f.updated).getTime()) < (24 * 60 * 60 * 1000));
      if (hasRecent) hasNew = true;

      const folderBtn = document.createElement('div');
      folderBtn.className = "folder-item bg-white rounded-lg shadow p-3 hover:shadow-md transition border border-gray-200 flex justify-between items-center";
      folderBtn.setAttribute('tabindex', '0');
      folderBtn.innerHTML = `<h2 class="text-base font-semibold text-blue-700">${getFileIcon('folder')} ${folder.folder}</h2>` +
        (hasRecent ? '<span class="badge">🆕</span>' : '');

      folderBtn.addEventListener('click', () => openFolderView(folder.folder));
      folderList.appendChild(folderBtn);
    }

    const notificationBar = document.getElementById('notificationBar');
    if (notificationBar) {
      notificationBar.classList.toggle('hidden', !hasNew || currentFolder !== null);
      notificationBar.innerHTML = hasNew && currentFolder === null ?
        '<div class="bg-yellow-100 text-yellow-700 text-sm px-4 py-2 rounded shadow">🆕 New file updates available in one or more folders</div>' : '';
    }

    spinner?.classList.add('hidden');
  } catch (err) {
    spinner.innerText = '⚠️ Failed to load folder data.';
    console.error(err);
  }
}

async function openFolderView(folderName) {
  currentFolder = folderName;
  const folderData = globalData.find(f => f.folder === folderName);
  if (!folderData) return;

  const folderViewer = document.getElementById('folderViewer');
  const folderTitle = document.getElementById('folderTitle');
  const folderContent = document.getElementById('folderContent');

  folderTitle.innerText = `📁 ${folderName}`;
  folderContent.innerHTML = '';

  const tabHeader = document.createElement('div');
  tabHeader.className = 'flex space-x-2 mb-4 overflow-x-auto';
  const tabContent = document.createElement('div');
  tabContent.id = 'tabContent';

  folderContent.appendChild(tabHeader);
  folderContent.appendChild(tabContent);

  folderData.files.forEach((file, index) => {
    const tab = document.createElement('button');
    tab.className = 'bg-white px-4 py-2 border rounded hover:bg-blue-100 text-sm';
    tab.innerText = file.name;

    tab.addEventListener('click', (e) => {
      showTabContent(file, tabHeader, tabContent, e.target);
    });

    tabHeader.appendChild(tab);
    if (index === 0) showTabContent(file, tabHeader, tabContent, tab); // auto-show first
  });

  document.getElementById('dashboard').classList.add('hidden');
  folderViewer.classList.remove('hidden');
  document.getElementById('notificationBar')?.classList.add('hidden');
}

async function showTabContent(file, tabHeader, tabContent, activeTab) {
  [...tabHeader.children].forEach(tab => tab.classList.remove('tab-active'));
  activeTab.classList.add('tab-active');

  tabContent.innerHTML = `<div class="text-center py-4 text-gray-500">Loading preview...</div>`;

  const wrapper = document.createElement('div');
  wrapper.className = "bg-white p-4 rounded-lg shadow border mt-2";

  const title = `<h3 class="text-lg font-semibold mb-2">${getFileIcon(file.type)} ${file.name}</h3>`;
  let content = '';

  if (file.type === 'txt' || file.type === 'md') {
    const text = await fetchText(file.url);
    content = `
      <div class="relative">
        <button class="absolute top-0 right-0 text-sm text-gray-500 hover:text-blue-600" onclick="navigator.clipboard.writeText(document.getElementById('txt-${file.name}').innerText)">📋</button>
        <pre id="txt-${file.name}">${text}</pre>
      </div>`;
  } else if (file.type === 'csv') {
    const csv = await fetchText(file.url);
    const table = parseCSV(csv);
    content = `<div class="overflow-auto max-h-[60vh]">${table.outerHTML}</div>`;
  } else if (file.type === 'json') {
    const json = await fetchText(file.url);
    const parsed = JSON.stringify(JSON.parse(json), null, 2);
    content = `<pre>${parsed}</pre>`;
  } else if (file.type.match(/(png|jpg|jpeg|gif)/)) {
    content = `<img src="${file.url}" alt="${file.name}" class="max-h-[70vh] mx-auto rounded-lg" />`;
  } else {
    content = `<a href="${file.url}" download class="text-blue-600 underline">⬇️ Download File</a>`;
  }

  const backBtn = `<button class="mt-4 text-blue-600 underline" onclick="openFolderView('${currentFolder}')">⬅ Back to folder</button>`;

  wrapper.innerHTML = title + content + backBtn;
  tabContent.innerHTML = '';
  tabContent.appendChild(wrapper);
}

async function loadNotifications() {
  try {
    const res = await fetch('notification.json');
    const notifications = await res.json();
    const container = document.getElementById('notificationList');
    container.innerHTML = '';

    notifications.forEach(n => {
      const note = document.createElement('div');
      note.className = 'bg-white p-3 rounded shadow border-l-4 border-blue-500';
      note.innerHTML = `
        <h3 class="text-sm font-semibold text-blue-700 mb-1">${n.title}</h3>
        <p class="text-sm text-gray-700">${n.message}</p>
        <p class="text-xs text-gray-400 mt-1">${new Date(n.date).toLocaleDateString()}</p>
      `;
      container.appendChild(note);
    });
  } catch (err) {
    console.error("Failed to load notifications", err);
    const container = document.getElementById('notificationList');
    container.innerHTML = '<p class="text-sm text-red-600">⚠️ Failed to load notifications.</p>';
  }
}

document.getElementById("closeViewer").addEventListener("click", () => {
  currentFolder = null;
  document.getElementById('folderViewer').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('notificationBar')?.classList.remove('hidden');
});

document.getElementById("refreshBtn").addEventListener("click", () => {
  renderDashboard();
  loadNotifications();
});

document.getElementById("toggleSidebar")?.addEventListener("click", () => {
  const sidebar = document.getElementById("sidebar");
  const icon = document.getElementById("toggleSidebar");
  sidebar.classList.toggle("hidden");
  icon.innerText = sidebar.classList.contains("hidden") ? '➡' : '⬅';
});

document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
  loadNotifications();

  // Search input
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
