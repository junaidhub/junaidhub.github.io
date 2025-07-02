// script.js

const folders = {
  about: "about",
  projects: "projects",
  commands: "command-guide",
  articles: "articles"
};

const fileCache = {}; // to track and avoid reloading unchanged content

const loadFolderFiles = async (folder, containerId) => {
  try {
    const res = await fetch(`${folder}/`);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const links = [...doc.querySelectorAll('a')].map(a => a.getAttribute('href')).filter(f => f.endsWith('.txt'));

    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (const file of links) {
      const url = `${folder}/${file}`;
      const name = file.replace('.txt', '').replace(/-/g, ' ');

      const content = await fetch(url).then(r => r.text());
      if (fileCache[url] !== content) {
        fileCache[url] = content;
        container.innerHTML += `
          <div class="card">
            <h3>${name}</h3>
            <pre>${content}</pre>
          </div>
        `;
      }
    }

    if (!links.length) {
      container.innerHTML = '<p>No content found.</p>';
    }
  } catch (err) {
    document.getElementById(containerId).innerHTML = '<p class="error">Failed to load from ' + folder + '</p>';
  }
};

function autoReloadAll() {
  loadFolderFiles(folders.about, 'about');
  loadFolderFiles(folders.projects, 'projects');
  loadFolderFiles(folders.commands, 'commands');
  loadFolderFiles(folders.articles, 'articles');
}

// initial load
autoReloadAll();

// auto reload every 30 seconds
setInterval(autoReloadAll, 30000);

// search functionality
const searchBox = document.getElementById('search-box');
searchBox.addEventListener('input', () => {
  const query = searchBox.value.toLowerCase();
  const cards = document.querySelectorAll('.card');

  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    if (text.includes(query)) {
      card.style.display = '';
      card.classList.add('highlight');
    } else {
      card.style.display = 'none';
      card.classList.remove('highlight');
    }
  });
});
