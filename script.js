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

function getFileIcon(type) {
  const map = {
    'txt': '📄', 'md': '📝', 'csv': '📊', 'pdf': '📕', 'png': '🖼️', 'jpg': '🖼️',
    'jpeg': '🖼️', 'gif': '🖼️', 'zip': '🗜️', 'mp4': '🎞️', 'mp3': '🎵', 'folder': '📁'
  };
  return map[type.toLowerCase()] || '📦';
}

let globalData = [];

async function renderDashboard() {
  const spinner = document.getElementById('loadingSpinner');
  spinner?.classList.remove('hidden');

  const res = await fetch('files.json');
  const data = await res.json();
  globalData = data;
  const dashboard = document.getElementById('dashboard');
  const searchValue = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  dashboard.innerHTML = '';

  const sortedData = data.sort((a, b) => {
    const maxA = Math.max(...a.files.map(f => new Date(f.updated).getTime()));
    const maxB = Math.max(...b.files.map(f => new Date(f.updated).getTime()));
    return maxB - maxA;
  });

  for (const folder of sortedData) {
    const section = document.createElement('div');
    section.className = "bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer";
    section.innerHTML = `
      <h2 class="text-xl font-semibold text-blue-600">${getFileIcon('folder')} ${folder.folder}</h2>
    `;

    section.addEventListener('click', () => openFolderView(folder.folder));
    dashboard.appendChild(section);
  }

  spinner?.classList.add('hidden');
}

async function openFolderView(folderName) {
  const folderData = globalData.find(f => f.folder === folderName);
  if (!folderData) return;

  const folderViewer = document.getElementById('folderViewer');
  const folderTitle = document.getElementById('folderTitle');
  const folderContent = document.getElementById('folderContent');

  folderTitle.innerText = `📁 ${folderName}`;
  folderContent.innerHTML = '';

  for (const file of folderData.files) {
    const card = document.createElement('div');
    card.className = "card bg-gray-50 p-4 rounded border shadow-sm file-card";

    const updatedDate = new Date(file.updated);
    const isNew = (Date.now() - updatedDate.getTime()) < (24 * 60 * 60 * 1000);

    const title = `<p class="font-medium"><span class="file-icon">${getFileIcon(file.type)}</span>${file.name}</p>`;
    const time = `<p class="text-sm text-gray-500">${updatedDate.toLocaleString()} ${isNew ? '<span class="text-green-600 font-bold">🆕</span>' : ''}</p>`;

    let preview = "";
    if (file.type === 'txt' || file.type === 'md') {
      const contentText = await fetchText(file.url);
      preview = `<pre class="bg-white text-sm p-2 mt-2 rounded overflow-auto max-h-40 border">${contentText}</pre>`;
    } else if (file.type === 'csv') {
      const contentText = await fetchText(file.url);
      const table = parseCSV(contentText);
      preview = `<div class="overflow-auto mt-2 max-h-48 border rounded">${table.outerHTML}</div>`;
    } else if (file.type.match(/(png|jpg|jpeg|gif)/)) {
      preview = `<img src="${file.url}" alt="${file.name}" class="img-preview mt-2 rounded-lg max-h-32 mx-auto" />`;
    } else {
      preview = `<a href="${file.url}" download class="text-blue-600 text-sm underline mt-2 inline-block">⬇️ Download</a>`;
    }

    const copyBtn = `<button class="copy-btn mt-2 text-sm text-gray-600 underline" onclick="navigator.clipboard.writeText('${file.url}')">📋 Copy URL</button>`;

    card.innerHTML = title + time + preview + copyBtn;
    folderContent.appendChild(card);
  }

  document.getElementById('dashboard').classList.add('hidden');
  folderViewer.classList.remove('hidden');
}

function enableSearch() {
  const input = document.getElementById('searchInput');
  input.addEventListener('input', () => renderDashboard());
}

document.getElementById("closeViewer").addEventListener("click", () => {
  document.getElementById('folderViewer').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
});

document.addEventListener("DOMContentLoaded", () => {
  renderDashboard().then(() => enableSearch());
});
