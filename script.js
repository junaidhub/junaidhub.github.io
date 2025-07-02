const folders = {
  projects: "projects",
  commands: "command-guide",
  articles: "articles"
};

// List of files manually added (GitHub Pages can't auto-detect)
const files = {
  projects: ['gpio.txt', 'rvm.txt',"info.txt"],
  commands: ['networking.txt', 'wifi-tools.txt'],
  articles: ['esp8266.txt', 'powershell.txt']
};

for (const section in files) {
  for (const filename of files[section]) {
    const path = `${folders[section]}/${filename}`;
    loadFile(path, section);
  }
}

async function loadFile(filePath, sectionId) {
  const container = document.getElementById(sectionId);
  const title = filePath.split('/').pop().replace('.txt', '').replace(/-/g, ' ');

  try {
    const content = await fetch(filePath).then(r => r.text());
    container.innerHTML += `
      <div class="card">
        <h3>${title}</h3>
        <pre>${content}</pre>
      </div>
    `;
  } catch {
    container.innerHTML += `<p class="error">⚠️ Failed to load ${filePath}</p>`;
  }
}
