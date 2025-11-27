document.addEventListener('DOMContentLoaded', () => {
    loadAnnouncements();

    document.getElementById('announcementForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('announcementMessage').value;
        const res = await fetch('http://localhost:3000/api/admin/announcements', { // Corrected URL
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        if (data.success) {
            loadAnnouncements();
            document.getElementById('announcementForm').reset();
        } else {
            alert(data.message);
        }
    });
});

async function loadAnnouncements() {
    const res = await fetch('http://localhost:3000/api/admin/announcements'); // Corrected URL
    const data = await res.json();
    const list = document.getElementById('announcementList');
    list.innerHTML = '';
    if (data.success) {
        data.announcements.forEach(ann => {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <div>
                    <p>${ann.message}</p>
                    <small>${new Date(ann.createdAt).toLocaleString()}</small>
                </div>
                <div>
                    ${ann.isActive ? '<span class="status-active">Active</span>' : ''}
                    ${ann.isActive ? `<button onclick="deactivate('${ann._id}')">Deactivate</button>` : ''}
                </div>
            `;
            list.appendChild(item);
        });
    }
}

async function deactivate(id) {
    if (!confirm('Are you sure you want to deactivate this announcement?')) return;
    const res = await fetch(`http://localhost:3000/api/admin/announcements/${id}/deactivate`, { method: 'PUT' }); // Corrected URL
    const data = await res.json();
    if (data.success) {
        loadAnnouncements();
    } else {
        alert(data.message);
    }
}