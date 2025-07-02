async function loadTextByPrefix(prefix, containerId) {
  try {
    const res = await fetch(".");
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const links = [...doc.querySelectorAll('a')]
      .filter(a => a.href.endsWith('.txt') && a.textContent.startsWith(prefix));

    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (const link of links) {
      const name = link.textContent
        .replace(prefix, '')
        .replace('.txt', '')
        .replace(/-/g, ' ');

      const content = await fetch(link.getAttribute('href')).then(r => r.text());

      container.innerHTML += `
        <div class="card">
          <h3>${name}</h3>
          <pre>${content}</pre>
        </div>
      `;
    }

    if (links.length === 0) {
      container.innerHTML = "<p>No content found yet.</p>";
    }
  } catch (error) {
    document.getElementById(containerId).innerHTML = "<p>Error loading content.</p>";
  }
}

loadTextByPrefix('project-', 'projects');
loadTextByPrefix('command-', 'commands');
loadTextByPrefix('article-', 'articles');
