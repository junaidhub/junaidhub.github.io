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

function openModal(htmlContent) {
  const modal = document.getElementById("previewModal");
  const modalContent = document.getElementById("modalContent");
  modalContent.innerHTML = htmlContent;
  modal.classList.remove("hidden");
}

function closeModal() {
  const modal = document.getElementById("previewModal");
  modal.classList.add("hidden");
  document.getElementById("modalContent").innerHTML = "";
}

async function renderDashboard() {
  const res = await fetch('files.json');
  const data = await res.json();
  const dashboard = document.getElementById('dashboard');

  const searchValue = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  const scrollY = window.scrollY;

  dashboard.innerHTML = '';

  for (const folder of data) {
    const folderKey = `folder_${folder.folder}`;
    const isOpen = localStorage.getItem(folderKey) === 'true';

    const section = document.createElement('div');
    section.className = "bg-white rounded-lg shadow p-4";

    const header = document.createElement('div');
    header.className = "flex justify-between items-center cursor-pointer";
    header.innerHTML = `
      <h2 class="text-xl font-semibold text-blue-600">${folder.folder}</h2>
      <span class="text-sm text-gray-500">${isOpen ? 'Click to collapse' : 'Click to expand'}</span>
    `;

    const content = document.createElement('div');
    content.className = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 folder-content ${isOpen ? '' : 'hidden'}`;

    for (const file of folder.files) {
      const card = document.createElement('div');
      card.className = "card bg-gray-50 p-4 rounded border shadow-sm file-card";
      card.setAttribute('data-filename', file.name.toLowerCase());

      const title = `<p class="font-medium">${file.name}</p>`;
      const time = `<p class="text-sm text-gray-500">${new Date(file.updated).toLocaleString()}</p>`;

      let preview = "";

      if (file.type === 'txt') {
        const contentText = await fetchText(file.url);
        const safeText = contentText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        preview = `
          <pre class="bg-white text-sm p-2 mt-2 rounded overflow-auto max-h-40 border cursor-pointer" 
               onclick="openModal('<pre class=\'whitespace-pre-wrap\'>${safeText}</pre>')">
            ${safeText}
          </pre>`;
      } else if (file.type === 'csv') {
        const contentText = await fetchText(file.url);
        const table = parseCSV(contentText);
        preview = `
          <div class="overflow-auto mt-2 max-h-48 border rounded cursor-pointer" 
               onclick="openModal(\`${table.outerHTML}\`)">
            ${table.outerHTML}
          </div>`;
      } else if (file.type.match(/(png|jpg|jpeg|gif)/)) {
        preview = `
          <img src="${file.url}" alt="${file.name}" 
               class="img-preview mt-2 rounded-lg max-h-32 cursor-pointer" 
               onclick="openModal('<img src=\'${file.url}\' class=\'rounded\' />')" />`;
      } else {
        preview = `<a href="${file.url}" download class="text-blue-600 text-sm underline mt-2 inline-block">⬇️ Download</a>`;
      }

      card.innerHTML = title + time + preview;
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

renderDashboard().then(enableSearch);

setInterval(() => {
  renderDashboard();
}, 60000);
