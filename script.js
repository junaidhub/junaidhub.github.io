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
    'txt': '📄',
    'md': '📝',
    'csv': '📊',
    'pdf': '📕',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🖼️',
    'zip': '🗜️',
    'mp4': '🎞️',
    'mp3': '🎵',
    'folder': '📁'
  };
  return map[type.toLowerCase()] || '📦';
}

async function renderDashboard() {
  const spinner = document.getElementById('loadingSpinner');
  spinner?.classList.remove('hidden');

  const res = await fetch('files.json');
  const data = await res.json();
  const dashboard = document.getElementById('dashboard');
  const searchValue = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  const filterValue = document.getElementById('filterSelect')?.value || 'all';
  const scrollY = window.scrollY;
  dashboard.innerHTML = '';

  const sortedData = data.sort((a, b) => {
    const maxA = Math.max(...a.files.map(f => new Date(f.updated).getTime()));
    const maxB = Math.max(...b.files.map(f => new Date(f.updated).getTime()));
    return maxB - maxA;
  });

  for (const folder of sortedData) {
    const folderKey = `folder_${folder.folder}`;
    const isOpen = localStorage.getItem(folderKey) === 'true';

    const section = document.createElement('div');
    section.className = "bg-white rounded-lg shadow p-4";

    const header = document.createElement('div');
    header.className = "flex justify-between items-center cursor-pointer";
    header.innerHTML = `
      <h2 class="text-xl font-semibold text-blue-600">${getFileIcon('folder')} ${folder.folder}</h2>
      <span class="text-sm text-gray-500">${isOpen ? 'Click to collapse' : 'Click to expand'}</span>
    `;

    const content = document.createElement('div');
    content.className = `grid grid-cols-1 gap-4 mt-4 folder-content ${isOpen ? '' : 'hidden'}`;

    for (const file of folder.files) {
      const fileTypeMatch = filterValue === 'all' || file.type === filterValue;
      if (!fileTypeMatch) continue;

      const card = document.createElement('div');
      card.className = "card bg-gray-50 p-4 rounded border shadow-sm file-card";
      card.setAttribute('data-filename', file.name.toLowerCase());

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
        preview = `<img src="${file.url}" alt="${file.name}" class="img-preview mt-2 rounded-lg max-h-32" />`;
      } else {
        preview = `<a href="${file.url}" download class="text-blue-600 text-sm underline mt-2 inline-block">⬇️ Download</a>`;
      }

      const copyBtn = `<button class="copy-btn" onclick="navigator.clipboard.writeText('${file.url}')">📋 Copy URL</button>`;

      card.innerHTML = title + time + preview + copyBtn;
      content.appendChild(card);

      if (!file.name.toLowerCase().includes(searchValue)) {
        card.style.display = 'none';
      }
    }

    section.appendChild(header);
    section.appendChild(content);

    header.addEventListener('click', () => {
      const isNowOpen = content.classList.toggle('hidden') === false;
      header.querySelector('span').textContent = isNowOpen ? 'Click to collapse' : 'Click to expand';
      localStorage.setItem(folderKey, isNowOpen);
    });

    dashboard.appendChild(section);
  }

  spinner?.classList.add('hidden');
  window.scrollTo({ top: scrollY });
}

function enableSearch() {
  const input = document.getElementById('searchInput');
  input.addEventListener('input', () => {
    const query = input.value.toLowerCase();
    const cards = document.querySelectorAll('.file-card');

    cards.forEach(card => {
      const match = card.getAttribute('data-filename').includes(query);
      card.style.display = match ? 'block' : 'none';
    });
  });
}

function enableThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  toggleBtn?.addEventListener('click', () => {
    document.getElementById('body').classList.toggle('dark-mode');
  });
}

function enableFilter() {
  const filterSelect = document.getElementById('filterSelect');
  filterSelect?.addEventListener('change', () => renderDashboard());
}

document.getElementById("refreshBtn").addEventListener("click", () => {
  renderDashboard();
});

// Initial run
renderDashboard().then(() => {
  enableSearch();
  enableThemeToggle();
  enableFilter();
});

// Auto-refresh every 60 seconds
setInterval(() => {
  renderDashboard();
}, 60000);
