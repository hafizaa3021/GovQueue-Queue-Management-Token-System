const socket = io('http://localhost:3000');
let timers = {}; // Object to hold all active timers

document.addEventListener('DOMContentLoaded', loadAllTokens);

// Listen for real-time updates from the server
socket.on('tokenUpdated', loadAllTokens);

async function loadAllTokens() {
    // Clear all existing timers before reloading
    Object.values(timers).forEach(clearInterval);
    timers = {};

    try {
        const res = await fetch('http://localhost:3000/api/admin/tokens');
        const data = await res.json();
        const tokenTableBody = document.getElementById('tokenTableBody');
        tokenTableBody.innerHTML = '';

        if (data.success && data.tokens.length > 0) {
            data.tokens.forEach(token => {
                const userName = token.userId ? token.userId.name : 'N/A';
                
                const statusClass = `status-${token.status.replace(/\s+/g, '-')}`;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>#${token.tokenNumber}</td>
                    <td>${token.service}</td>
                    <td>${userName}</td>
                    <td><span class="status-badge ${statusClass}">${token.status}</span></td>
                    <td id="timer-${token._id}">-</td>
                `;
                tokenTableBody.appendChild(row);

                // If the token is being processed, start a timer for it
                if (token.status === 'Processing' && token.processingStartedAt) {
                    startServiceTimer(token._id, token.processingStartedAt);
                }
            });
        } else {
            tokenTableBody.innerHTML = '<tr><td colspan="5">No tokens found.</td></tr>';
        }
    } catch (err) {
        console.error('Error loading tokens:', err);
        tokenTableBody.innerHTML = '<tr><td colspan="5">Error loading tokens.</td></tr>';
    }
}

function startServiceTimer(tokenId, startTime) {
    const timerDisplay = document.getElementById(`timer-${tokenId}`);
    if (!timerDisplay || !startTime) return;

    const startTimestamp = new Date(startTime).getTime();

    timers[tokenId] = setInterval(() => {
        const now = new Date().getTime();
        const distance = now - startTimestamp;

        if (distance < 0) {
            timerDisplay.textContent = "00:00";
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        timerDisplay.textContent = 
            (minutes < 10 ? "0" : "") + minutes + ":" + 
            (seconds < 10 ? "0" : "") + seconds;
    }, 1000);
}