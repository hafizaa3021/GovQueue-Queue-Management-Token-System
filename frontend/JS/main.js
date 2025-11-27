const socket = io('http://localhost:3000');

function startLiveClock() {
    const clockElement = document.getElementById('live-clock');
    if (!clockElement) return;

    function updateClock() {
        const now = new Date();
        clockElement.textContent = now.toLocaleString();
    }
    updateClock();
    setInterval(updateClock, 1000);
}

async function fetchAndDisplayAnnouncement() {
    try {
        const res = await fetch('http://localhost:3000/api/announcements/active');
        const data = await res.json();

        const existingBanner = document.getElementById('announcement-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        if (data.success && data.announcement) {
            const banner = document.createElement('div');
            banner.id = 'announcement-banner';
            banner.innerHTML = `<i class="fas fa-bullhorn"></i> ${data.announcement.message}`;

            // This selector is more robust and will find the main content area on user, admin, and staff pages.
            const mainContainer = document.querySelector('.main-content') || document.querySelector('.container') || document.querySelector('.dashboard-container');
            if (mainContainer) {
                mainContainer.prepend(banner);
            }
        }
    } catch (err) {
        console.error('Could not fetch announcement:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    startLiveClock();
    fetchAndDisplayAnnouncement();
});

socket.on('announcementUpdated', () => {
    fetchAndDisplayAnnouncement();
});