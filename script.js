async function loadTextFiles(folder, containerId) {
  try {
    const res = await fetch(folder);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const files = [...doc.querySelectorAll('a')]
      .filter(a => a.href.endsWith('.txt'))
      .map(a => a.getAttribute('href'));

    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (const file of files) {
      const content = await fetch(file).then(r => r.text());
      const name = decodeURIComponent(file.split('/').pop().replace('.txt', ''));
      container.innerHTML += `
        <div class="card">
          <h3>${name.replace(/-/g, ' ')}</h3>
          <pre>${content}</pre>
        </div>
      `;
    }

    if (files.length === 0) {
      container.innerHTML = `<p>No content found in <code>${folder}</code>. Add some .txt files!</p>`;
    }
  } catch (error) {
    document.getElementById(containerId).innerHTML = "<p>Error loading content.</p>";
  }
}

loadTextFiles('projects/', 'projects');
loadTextFiles('command-guide/', 'commands');
loadTextFiles('articles/', 'articles');
