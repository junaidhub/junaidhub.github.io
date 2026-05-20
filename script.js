/* ============================================================
   JunaidHub — UI logic
   ============================================================ */

// ----------------- Utils -----------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFileIcon(type) {
  const map = {
    txt: 'fa-file-lines',
    md: 'fa-file-lines',
    csv: 'fa-file-csv',
    json: 'fa-file-code',
    pdf: 'fa-file-pdf',
    png: 'fa-file-image',
    jpg: 'fa-file-image',
    jpeg: 'fa-file-image',
    gif: 'fa-file-image',
    webp: 'fa-file-image',
    svg: 'fa-file-image',
    zip: 'fa-file-zipper',
    mp4: 'fa-file-video',
    mp3: 'fa-file-audio',
    folder: 'fa-folder',
  };
  return map[(type || '').toLowerCase()] || 'fa-file';
}

// Parse a date that may be ISO, or DD-MM-YYYY, or DD/MM/YYYY
function parseFlexibleDate(input) {
  if (!input) return null;
  const native = new Date(input);
  if (!isNaN(native.getTime())) return native;

  const m = String(input).match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const parsed = new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function relativeTime(date) {
  if (!date) return '';
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return date.toLocaleDateString();
}

function isRecent(date, days = 7) {
  if (!date) return false;
  return (Date.now() - date.getTime()) < days * 86400 * 1000;
}

// Robust CSV parser (handles quoted fields with commas / quotes / newlines)
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function csvToTable(rows) {
  if (!rows.length) return '<div class="empty-state"><i class="fas fa-file-csv"></i><p>Empty file</p></div>';
  const [headers, ...body] = rows;
  const thead = `<thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${body
    .filter(r => r.some(c => c && c.trim() !== ''))
    .map(r => `<tr>${headers.map((_, i) => `<td>${escapeHtml(r[i] ?? '')}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;
  return `<div class="table-wrap"><table class="data-table">${thead}${tbody}</table></div>`;
}

async function fetchText(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    return await res.text();
  } catch (e) {
    return null;
  }
}

function toast(msg, kind = '') {
  const c = $('#toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  const icon = kind === 'success' ? 'fa-circle-check' : kind === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  t.innerHTML = `<i class="fas ${icon}"></i><span>${escapeHtml(msg)}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 2900);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 'success');
  } catch {
    toast('Copy failed', 'error');
  }
}

// ----------------- State -----------------
const state = {
  data: [],          // array of folder objects
  meta: null,        // { generated_at, total_folders, total_files, total_size_human }
  currentFolder: null,
  currentFile: null,
  sortMode: 'recent',
  theme: localStorage.getItem('jh-theme') || 'light',
};

// Resolve the most recent updated date in a folder
function folderLatest(folder) {
  let max = 0;
  for (const f of folder.files) {
    const d = parseFlexibleDate(f.updated);
    if (d && d.getTime() > max) max = d.getTime();
  }
  return max;
}

// ----------------- Theme -----------------
function applyTheme() {
  document.body.classList.toggle('dark', state.theme === 'dark');
  const icon = $('#themeToggle i');
  if (icon) icon.className = `fas ${state.theme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
}
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('jh-theme', state.theme);
  applyTheme();
}

// ----------------- Rendering -----------------
function sortFolders(folders) {
  const copy = [...folders];
  if (state.sortMode === 'name') {
    copy.sort((a, b) => a.folder.localeCompare(b.folder));
  } else if (state.sortMode === 'count') {
    copy.sort((a, b) => b.files.length - a.files.length);
  } else {
    copy.sort((a, b) => folderLatest(b) - folderLatest(a));
  }
  return copy;
}

function renderSidebar() {
  const list = $('#folderList');
  list.innerHTML = '';
  const sorted = sortFolders(state.data);
  for (const folder of sorted) {
    const hasRecent = folder.files.some(f => isRecent(parseFlexibleDate(f.updated), 7));
    const item = document.createElement('div');
    item.className = 'folder-item' + (state.currentFolder === folder.folder ? ' active' : '');
    item.tabIndex = 0;
    item.innerHTML = `
      <i class="fas ${getFileIcon('folder')} folder-icon"></i>
      <span class="folder-name">${escapeHtml(folder.folder)}</span>
      ${hasRecent ? '<span class="badge-new">new</span>' : ''}
      <span class="folder-count">${folder.files.length}</span>
    `;
    item.addEventListener('click', () => openFolder(folder.folder));
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter') openFolder(folder.folder); });
    list.appendChild(item);
  }
}

function renderHome() {
  // Stats
  const totalFiles = state.data.reduce((s, f) => s + f.files.length, 0);
  const recentCount = state.data.reduce((s, f) =>
    s + f.files.filter(x => isRecent(parseFlexibleDate(x.updated), 7)).length, 0);
  $('#statFolders').textContent = state.data.length;
  $('#statFiles').textContent = totalFiles;
  $('#statRecent').textContent = recentCount;

  // Recent files (top 6 across all folders by updated desc)
  const allFiles = [];
  for (const folder of state.data) {
    for (const f of folder.files) {
      allFiles.push({ ...f, folder: folder.folder, dateObj: parseFlexibleDate(f.updated) });
    }
  }
  allFiles.sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));
  const recent = allFiles.slice(0, 6);
  const recentEl = $('#recentList');
  if (recent.length === 0) {
    recentEl.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No files yet</p></div>';
  } else {
    recentEl.innerHTML = recent.map(f => `
      <div class="recent-card" data-folder="${escapeHtml(f.folder)}" data-file="${escapeHtml(f.name)}">
        <div class="rc-icon"><i class="fas ${getFileIcon(f.type)}"></i></div>
        <div class="rc-body">
          <div class="rc-name">${escapeHtml(f.name)}</div>
          <div class="rc-meta">${escapeHtml(f.folder)} · ${escapeHtml(relativeTime(f.dateObj))}</div>
        </div>
      </div>
    `).join('');
    recentEl.querySelectorAll('.recent-card').forEach(card => {
      card.addEventListener('click', () => {
        openFolder(card.dataset.folder, card.dataset.file);
      });
    });
  }

  // Folder grid
  const grid = $('#folderGrid');
  const sorted = sortFolders(state.data);
  grid.innerHTML = sorted.map(folder => {
    const latest = folderLatest(folder);
    const hasRecent = folder.files.some(f => isRecent(parseFlexibleDate(f.updated), 7));
    return `
      <div class="folder-card" data-folder="${escapeHtml(folder.folder)}">
        ${hasRecent ? '<span class="badge-new">new</span>' : ''}
        <div class="fc-icon"><i class="fas ${getFileIcon('folder')}"></i></div>
        <div class="fc-name">${escapeHtml(folder.folder)}</div>
        <div class="fc-meta">${folder.files.length} file${folder.files.length === 1 ? '' : 's'} · ${latest ? escapeHtml(relativeTime(new Date(latest))) : '—'}</div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.folder-card').forEach(card => {
    card.addEventListener('click', () => openFolder(card.dataset.folder));
  });
}

function openFolder(folderName, autoFileName = null) {
  const folder = state.data.find(f => f.folder === folderName);
  if (!folder) return;
  state.currentFolder = folderName;
  state.currentFile = null;

  $('#homeView').classList.add('hidden');
  $('#folderView').classList.remove('hidden');
  $('#folderTitle').textContent = folderName;
  $('#crumbFolder').textContent = folderName;

  const tabHeader = $('#tabHeader');
  tabHeader.innerHTML = '';
  folder.files.forEach((file, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.setAttribute('role', 'tab');
    btn.dataset.fileName = file.name;
    btn.innerHTML = `<i class="fas ${getFileIcon(file.type)}"></i><span>${escapeHtml(file.name)}</span>`;
    btn.addEventListener('click', () => showFile(file, btn));
    tabHeader.appendChild(btn);
  });

  // pick initial file
  const initialFile = autoFileName
    ? folder.files.find(f => f.name === autoFileName) || folder.files[0]
    : folder.files[0];
  if (initialFile) {
    const initialBtn = [...tabHeader.children].find(b => b.dataset.fileName === initialFile.name);
    showFile(initialFile, initialBtn);
  }

  renderSidebar(); // re-render to mark active folder
  closeSidebarOnMobile();
  $('#fileFilter').value = '';
  applyFileFilter('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyFileFilter(query) {
  const q = (query || '').toLowerCase().trim();
  $$('#tabHeader .tab-btn').forEach(btn => {
    const match = !q || btn.dataset.fileName.toLowerCase().includes(q);
    btn.classList.toggle('hidden-by-filter', !match);
  });
}

async function showFile(file, tabBtn) {
  if (!file) return;
  state.currentFile = file.name;

  // tab active state
  $$('#tabHeader .tab-btn').forEach(b => b.classList.remove('active'));
  tabBtn?.classList.add('active');
  tabBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

  const tc = $('#tabContent');
  tc.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></div>';

  const dateObj = parseFlexibleDate(file.updated);
  const parts = [];
  if (file.size_human) parts.push(escapeHtml(file.size_human));
  if (dateObj) parts.push(`updated ${escapeHtml(relativeTime(dateObj))}`);
  const meta = parts.length ? ` · <span class="meta">${parts.join(' · ')}</span>` : '';

  const toolbar = `
    <div class="file-toolbar">
      <div class="file-title">
        <i class="fas ${getFileIcon(file.type)}"></i>
        <span>${escapeHtml(file.name)}</span>
        ${meta}
      </div>
      <button class="tool-btn" data-action="copy-url"><i class="fas fa-link"></i> Copy link</button>
      <button class="tool-btn" data-action="open-new"><i class="fas fa-arrow-up-right-from-square"></i> Open</button>
      <button class="tool-btn" data-action="download"><i class="fas fa-download"></i> Download</button>
    </div>
  `;

  let body = '';
  const type = (file.type || '').toLowerCase();

  if (type === 'txt' || type === 'md') {
    const text = await fetchText(file.url);
    if (text === null) {
      body = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><p>Failed to load file.</p></div>';
    } else {
      body = `
        <button class="tool-btn" data-action="copy-text" style="margin-bottom:8px"><i class="fas fa-copy"></i> Copy text</button>
        <pre class="code-block" id="contentPre">${escapeHtml(text)}</pre>
      `;
    }
  } else if (type === 'csv') {
    const text = await fetchText(file.url);
    if (text === null) {
      body = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><p>Failed to load file.</p></div>';
    } else {
      body = csvToTable(parseCSV(text));
    }
  } else if (type === 'json') {
    const text = await fetchText(file.url);
    if (text === null) {
      body = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><p>Failed to load file.</p></div>';
    } else {
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch {}
      body = `<pre class="code-block" id="contentPre">${escapeHtml(pretty)}</pre>`;
    }
  } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(type)) {
    body = `<img class="preview-img" src="${encodeURI(file.url)}" alt="${escapeHtml(file.name)}" />`;
  } else if (type === 'pdf') {
    body = `<iframe src="${encodeURI(file.url)}" style="width:100%; height:75vh; border:1px solid var(--border); border-radius:8px;"></iframe>`;
  } else {
    body = `<div class="empty-state"><i class="fas ${getFileIcon(type)}"></i><p>Preview not available for this file type.</p></div>`;
  }

  tc.innerHTML = toolbar + body;

  // Wire toolbar actions
  tc.querySelector('[data-action="copy-url"]')?.addEventListener('click', () => {
    const absUrl = new URL(file.url, window.location.href).toString();
    copyText(absUrl);
  });
  tc.querySelector('[data-action="open-new"]')?.addEventListener('click', () => {
    window.open(file.url, '_blank', 'noopener');
  });
  tc.querySelector('[data-action="download"]')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  tc.querySelector('[data-action="copy-text"]')?.addEventListener('click', () => {
    const pre = tc.querySelector('#contentPre');
    if (pre) copyText(pre.textContent);
  });
}

function goHome() {
  state.currentFolder = null;
  state.currentFile = null;
  $('#folderView').classList.add('hidden');
  $('#homeView').classList.remove('hidden');
  renderSidebar();
}

// ----------------- Notifications -----------------
async function loadNotifications() {
  const container = $('#notificationList');
  try {
    const res = await fetch('notification.json');
    const notes = await res.json();
    if (!Array.isArray(notes) || notes.length === 0) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">No notifications.</p>';
      return;
    }
    container.innerHTML = notes.map(n => {
      const date = parseFlexibleDate(n.date);
      const dateStr = date ? date.toLocaleDateString() : escapeHtml(n.date || '');
      const typeClass = ['info', 'success', 'warning', 'error'].includes(n.type) ? ` note-${n.type}` : '';
      const link = n.link ? ` <a href="${encodeURI(n.link)}" target="_blank" rel="noopener">Open ↗</a>` : '';
      return `
        <div class="note${typeClass}">
          <div class="note-title">${escapeHtml(n.title || 'Update')}</div>
          <div class="note-msg">${escapeHtml(n.message || '')}${link}</div>
          <div class="note-date">${dateStr}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = '<p style="font-size:13px;color:var(--danger);">Failed to load notifications.</p>';
  }
}

// ----------------- Global search -----------------
function buildSearchIndex() {
  const items = [];
  for (const folder of state.data) {
    items.push({ kind: 'folder', name: folder.folder, folder: folder.folder });
    for (const file of folder.files) {
      items.push({
        kind: 'file',
        name: file.name,
        folder: folder.folder,
        type: file.type,
        url: file.url,
      });
    }
  }
  return items;
}

function runSearch(query) {
  const q = query.toLowerCase().trim();
  const box = $('#searchResults');
  if (!q) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  const index = buildSearchIndex();
  const matches = index
    .filter(it => it.name.toLowerCase().includes(q) || it.folder.toLowerCase().includes(q))
    .slice(0, 12);
  if (matches.length === 0) {
    box.innerHTML = '<div class="search-empty">No matches</div>';
  } else {
    box.innerHTML = matches.map((it, i) => `
      <div class="search-result-item${i === 0 ? ' active' : ''}"
           data-kind="${it.kind}"
           data-folder="${escapeHtml(it.folder)}"
           data-file="${escapeHtml(it.name)}">
        <span class="sr-icon"><i class="fas ${getFileIcon(it.kind === 'folder' ? 'folder' : it.type)}"></i></span>
        <span class="sr-name">${escapeHtml(it.name)}</span>
        <span class="sr-meta">${it.kind === 'folder' ? 'folder' : escapeHtml(it.folder)}</span>
      </div>
    `).join('');
    box.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const folder = el.dataset.folder;
        const file = el.dataset.file;
        const kind = el.dataset.kind;
        $('#globalSearch').value = '';
        box.classList.add('hidden');
        if (kind === 'folder') openFolder(folder);
        else openFolder(folder, file);
      });
    });
  }
  box.classList.remove('hidden');
}

function moveSearchActive(direction) {
  const items = [...$$('#searchResults .search-result-item')];
  if (!items.length) return;
  const cur = items.findIndex(el => el.classList.contains('active'));
  let next = cur + direction;
  if (next < 0) next = items.length - 1;
  if (next >= items.length) next = 0;
  items.forEach(el => el.classList.remove('active'));
  items[next].classList.add('active');
  items[next].scrollIntoView({ block: 'nearest' });
}

// ----------------- Sidebar (mobile) -----------------
function toggleSidebar() {
  const sb = $('#sidebar');
  const bd = $('#sidebarBackdrop');
  const open = sb.classList.toggle('open');
  bd.classList.toggle('open', open);
}
function closeSidebarOnMobile() {
  if (window.innerWidth < 1024) {
    $('#sidebar').classList.remove('open');
    $('#sidebarBackdrop').classList.remove('open');
  }
}

// ----------------- Boot -----------------
async function loadData() {
  try {
    const res = await fetch('files.json', { cache: 'no-store' });
    const json = await res.json();
    // Support both shapes: plain array (legacy) and { folders, ... } (current)
    if (Array.isArray(json)) {
      state.data = json;
      state.meta = null;
    } else {
      state.data = json.folders || [];
      state.meta = {
        generated_at: json.generated_at,
        total_folders: json.total_folders,
        total_files: json.total_files,
        total_size_human: json.total_size_human,
      };
    }
    renderSidebar();
    renderHome();
    renderFooterMeta();
  } catch (e) {
    console.error(e);
    $('#folderList').innerHTML = '<p style="font-size:13px;color:var(--danger);padding:8px;">Failed to load files.json</p>';
    toast('Failed to load file index', 'error');
  }
}

function renderFooterMeta() {
  const el = document.getElementById('footerMeta');
  if (!el) return;
  if (!state.meta || !state.meta.generated_at) { el.textContent = ''; return; }
  const d = parseFlexibleDate(state.meta.generated_at);
  const when = d ? relativeTime(d) : state.meta.generated_at;
  el.textContent = `Index updated ${when} · ${state.meta.total_size_human || ''}`;
}

function bindEvents() {
  $('#sidebarToggle').addEventListener('click', toggleSidebar);
  $('#sidebarBackdrop').addEventListener('click', closeSidebarOnMobile);
  $('#refreshBtn').addEventListener('click', () => {
    loadData();
    loadNotifications();
    toast('Refreshed');
  });
  $('#themeToggle').addEventListener('click', toggleTheme);
  $('#sortSelect').addEventListener('change', (e) => {
    state.sortMode = e.target.value;
    renderSidebar();
    renderHome();
  });
  $('#crumbHome').addEventListener('click', goHome);
  $('#fileFilter').addEventListener('input', (e) => applyFileFilter(e.target.value));

  const search = $('#globalSearch');
  search.addEventListener('input', (e) => runSearch(e.target.value));
  search.addEventListener('focus', () => { if (search.value) runSearch(search.value); });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSearchActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearchActive(-1); }
    else if (e.key === 'Enter') {
      const active = $('#searchResults .search-result-item.active');
      active?.click();
    } else if (e.key === 'Escape') {
      search.value = '';
      $('#searchResults').classList.add('hidden');
      search.blur();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) {
      $('#searchResults').classList.add('hidden');
    }
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (e.key === '/' && !inField) {
      e.preventDefault();
      search.focus();
      search.select();
    } else if (e.key === 'Escape' && !inField) {
      if (!$('#folderView').classList.contains('hidden')) goHome();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      toggleTheme();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  bindEvents();
  loadData();
  loadNotifications();
});
