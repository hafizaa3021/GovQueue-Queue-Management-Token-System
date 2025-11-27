
let currentUserTokens = [];
let loggedInUser = null;
const socket = io('http://localhost:3000');
// --- Main Function to Render All Tokens and Notices ---
function renderPage(tokens) {
    const tokensContainer = document.getElementById('tokenList');
    const noticeContainer = document.getElementById('noticeContainer');
    tokensContainer.innerHTML = '';
    noticeContainer.innerHTML = '';

    // --- 1. Handle Office Hours Notice ---
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // --- UPDATED TIME CHECK TO 8:00 AM - 11:30 PM ---
    if (hours < 8 || hours > 23 || (hours === 23 && minutes >= 30)) {
        noticeContainer.innerHTML = `
            <div class="notice-box">
                <i class="fas fa-exclamation-triangle"></i> 
                The office is currently closed. Hours are 8:00 AM to 11:30 PM.
            </div>
        `;
    }

    // --- 2. Render Tokens ---
    if (tokens && tokens.length > 0) {
        tokens.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        tokens.forEach(token => {
            const tokenDiv = document.createElement('div');
            tokenDiv.classList.add('token-card');

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [year, month, day] = token.date.split('T')[0].split('-').map(Number);
            const tokenDate = new Date(year, month - 1, day);

            let waitTimeMessage = '';

            if (token.status === 'On Hold' && token.holdExpiresAt) {
                const expiryTime = new Date(token.holdExpiresAt).getTime();
                const now = new Date().getTime();
                const distance = expiryTime - now;
                if (distance > 0) {
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    waitTimeMessage = `Your token is on hold. It will be re-queued in about ${minutes} minutes.`;
                } else {
                    waitTimeMessage = 'Your hold time has expired. You are being re-queued.';
                }
            } else if (['Completed', 'No Show', 'Cancelled by User', 'Expired'].includes(token.status)) {
                waitTimeMessage = `Service ${token.status}`;
            } else if (token.status === 'Moved to Next Day') {
                waitTimeMessage = 'Office hours are over. Your token is valid for tomorrow.';
            } else if (tokenDate > today) {
                const timeDiff = tokenDate.getTime() - today.getTime();
                const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));
                waitTimeMessage = daysUntil === 1 ? 'Your appointment is tomorrow.' : `Your appointment is in ${daysUntil} days.`;
            } else if (tokenDate.getTime() === today.getTime()) {
                switch (token.status) {
                    case 'Ready to Resume':
                        waitTimeMessage = 'Your hold time is over. Please return to the counter.';
                        break;
                    case 'Processing':
                        waitTimeMessage = 'It\'s your turn now! Please come to the counter.';
                        break;
                    case 'Awaiting Confirmation':
                        waitTimeMessage = 'You were marked as a "No Show". Please respond to the pop-up.';
                        break;
                    case 'Notified':
                        waitTimeMessage = 'Your turn is in about 15 minutes. Please be ready.';
                        break;
                    case 'booked':
                        if (token.remainingTime > 0) {
                            waitTimeMessage = `Estimated wait: ${token.remainingTime} minutes`;
                        } else {
                            waitTimeMessage = 'You are next in line! Please be ready.';
                        }
                        break;
                    default:
                        waitTimeMessage = 'Your status is being updated...';
                }
            } else {
                waitTimeMessage = `Service was ${token.status} on ${new Date(token.date).toLocaleDateString()}`;
            }

            const isCancellable = ['booked', 'Notified', 'Awaiting Confirmation', 'Moved to Next Day', 'On Hold', 'Ready to Resume'].includes(token.status);

            let feedbackButton = '';
            if (token.status === 'Completed' && !token.feedbackGiven) {
                feedbackButton = `<button class="feedback-btn" onclick="leaveFeedback('${token._id}', '${token.service}')">Leave Feedback</button>`;
            }

            tokenDiv.innerHTML = `
              <div class="token-card-content">
                <h3>${token.service}</h3>
                <p><i class="fas fa-ticket-alt"></i> Token Number: <strong>#${token.tokenNumber}</strong></p>
                <p><i class="fas fa-info-circle"></i> Status: <strong>${token.status}</strong></p>
                <p><i class="fas fa-calendar-alt"></i> Booked for: ${new Date(token.date).toLocaleDateString()}</p>
                <div class="status-message"><i class="fas fa-clock"></i> ${waitTimeMessage}</div>
              </div>
              ${isCancellable ? `<button class="cancel-btn" onclick="cancelToken('${token._id}')">Cancel Token</button>` : ''}
              ${feedbackButton}
            `;
            tokensContainer.appendChild(tokenDiv);
        });
    } else {
        tokensContainer.innerHTML = '<p style="color:white; text-align:center; font-size: 1.2rem;">No tokens booked yet.</p>';
    }
}

function leaveFeedback(tokenId, serviceName) {
    window.location.href = `feedback.html?tokenId=${tokenId}&service=${encodeURIComponent(serviceName)}`;
}

async function cancelToken(tokenId) {
    if (confirm('Are you sure you want to cancel this token? This action cannot be undone.')) {
        try {
            const res = await fetch('http://localhost:3000/api/user/cancel-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokenId })
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Failed to cancel token.');
            }
        } catch (err) {
            alert('An error occurred. Please try again.');
        }
    }
}

async function fetchUserTokensAndRender() {
    if (!loggedInUser) return;
    try {
        const res = await fetch(`http://localhost:3000/api/user/${loggedInUser._id}`);
        const data = await res.json();
        if (data.success) {
            currentUserTokens = data.tokens;
            renderPage(currentUserTokens);
        }
    } catch (err) {
        console.error("Error fetching user tokens:", err);
    }
}

socket.on('tokenUpdated', fetchUserTokensAndRender);
socket.on('newToken', fetchUserTokensAndRender);
socket.on('queueMoved', fetchUserTokensAndRender);
socket.on('holdExpired', (data) => { alert(data.message); });
socket.on('tokenRejoined', () => { alert('You have been successfully added to the end of the queue.'); fetchUserTokensAndRender(); });
socket.on('confirmNoShow', (data) => { if (loggedInUser && data.userId === loggedInUser._id) { const userResponse = confirm("You have been marked as a 'No Show'.\n\nDo you still want to be in the queue?\n\n- Click 'OK' for YES (you will be added to the end of the line).\n- Click 'Cancel' for NO (your token will be cancelled)."); const endpoint = userResponse ? 'rejoin-queue' : 'cancel-no-show'; fetch(`http://localhost:3000/api/user/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokenId: data.tokenId }) }); } });
socket.on('staffMessage', (data) => { alert(`Message from ${data.from}:\n\n${data.message}`); });

document.addEventListener('DOMContentLoaded', async () => {
    loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser || !loggedInUser._id) {
        alert('Please login first to track your tokens.');
        window.location.href = 'login.html';
        return;
    }
    socket.emit('joinRoom', loggedInUser._id);
    document.getElementById('userName').textContent = loggedInUser.name;
    await fetchUserTokensAndRender();
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }
});