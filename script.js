fetch('files.json')
    .then(res => res.json())
    .then(data => {
        const grid = document.getElementById('files-grid');
        data.forEach(folder => {
            folder.files.forEach(file => {
                const card = document.createElement('div');
                card.className = "bg-white shadow rounded p-4 hover:shadow-lg transition";
                card.innerHTML = `
                    <div class="font-bold text-gray-800">${file.name}</div>
                    <div class="text-sm text-gray-500">${file.updated}</div>
                    <a href="${file.url}" target="_blank" class="text-blue-500 hover:underline text-sm">Open</a>
                `;
                grid.appendChild(card);
            });
        });
    })
    .catch(err => console.error("Failed to load files.json", err));
