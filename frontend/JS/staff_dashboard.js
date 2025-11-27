let staffInfo = {};
let serviceTimer = null; // Variable to hold our timer
const socket = io('http://localhost:3000');
document.addEventListener('DOMContentLoaded', () => {
    staffInfo = JSON.parse(localStorage.getItem('staff'));
    if (!staffInfo || !staffInfo.assignedService) {
        alert('Login failed or no service assigned. Please contact an admin.');
        window.location.href = 'staff_login.html';
        return;
    }
    document.getElementById('staffGreeting').textContent = `Welcome, ${staffInfo.name}! You are managing: ${staffInfo.assignedService}.`;
    const datePicker = document.getElementById('queueDate');
    datePicker.value = new Date().toISOString().split('T')[0];
    updateStatusButtons(staffInfo.status || 'Active');
    loadTokens();
    loadAllCounters();
    datePicker.addEventListener('change', () => {
        loadTokens();
        loadAllCounters();
    });
});

// --- REAL-TIME LISTENERS ---
socket.on('tokenUpdated', () => { loadTokens(); loadAllCounters(); });
socket.on('newToken', () => { loadTokens(); loadAllCounters(); });
socket.on('queueMoved', () => { loadTokens(); loadAllCounters(); });

function updateStatusButtons(currentStatus) {
    document.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
    if (currentStatus === 'Active') {
        document.getElementById('statusActiveBtn').classList.add('active');
    } else if (currentStatus === 'Break') {
        document.getElementById('statusBreakBtn').classList.add('active');
    } else if (currentStatus === 'Closed') {
        document.getElementById('statusClosedBtn').classList.add('active');
    }
}

async function updateStatus(status) {
    try {
        const res = await fetch('http://localhost:3000/api/staff/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId: staffInfo._id, status })
        });
        const data = await res.json();
        if (data.success) {
            staffInfo.status = data.staff.status;
            localStorage.setItem('staff', JSON.stringify(staffInfo));
            updateStatusButtons(staffInfo.status);
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('An error occurred while updating status.');
    }
}

async function loadTokens() {
    if (serviceTimer) {
        clearInterval(serviceTimer);
        serviceTimer = null;
    }

    const selectedDate = document.getElementById('queueDate').value;
    if (!selectedDate) return;

    const res = await fetch(`http://localhost:3000/api/staff/tokens?service=${staffInfo.assignedService}&date=${selectedDate}`);
    const data = await res.json();
    const servicesGrid = document.getElementById('servicesGrid');
    servicesGrid.innerHTML = '';

    document.getElementById('queueCount').textContent = data.totalInQueue || 0;

    if (data.success && data.tokens) {
        const currentlyProcessing = data.tokens.find(t => t.status === 'Processing');
        const onHoldTokens = data.tokens.filter(t => t.status === 'On Hold');
        const movedFromYesterday = data.tokens.filter(t => t.status === 'Moved to Next Day');
        const nextInQueue = data.tokens.find(t => ['booked', 'Notified', 'Ready to Resume'].includes(t.status));

        // --- Currently Serving Card ---
        const servingDiv = document.createElement('div');
        servingDiv.className = 'service-card';
        if (currentlyProcessing) {
            servingDiv.innerHTML = `
                <h3>Currently Serving</h3>
                <p style="font-size: 2rem; font-weight: bold;">#${currentlyProcessing.tokenNumber}</p>
                <p>Time: <span id="serviceTimerDisplay">00:00</span></p>
                <button class="completed" onclick="updateToken('${currentlyProcessing._id}', 'Completed')">Mark Completed</button>
                <button class="no-show" onclick="updateToken('${currentlyProcessing._id}', 'No Show')">Mark as No-Show</button>
                <button class="on-hold-btn" onclick="putTokenOnHold('${currentlyProcessing._id}')">Put On Hold</button>
                <button class="message-btn" onclick="sendMessageToUser('${currentlyProcessing.userId}')">Send Message</button> 
            `;
            startServiceTimer(currentlyProcessing.processingStartedAt);
        } else {
            servingDiv.innerHTML = `<h3>Currently Serving</h3><p style="font-size: 2rem; font-weight: bold;">--</p><p>No token is being processed.</p>`;
        }
        servicesGrid.appendChild(servingDiv);

        // --- Next in Queue Card ---
        const nextDiv = document.createElement('div');
        nextDiv.className = 'service-card';
        if (nextInQueue && !currentlyProcessing) {
            nextDiv.innerHTML = `
                <h3>Next in Queue</h3>
                <p style="font-size: 2rem; font-weight: bold;">#${nextInQueue.tokenNumber}</p>
                <button class="call-next" onclick="callNext()">Call Next Token</button>
            `;
        } else {
            nextDiv.innerHTML = `<h3>Next in Queue</h3><p>${!nextInQueue ? 'The queue is empty.' : 'A token is currently being served.'}</p>`;
        }
        servicesGrid.appendChild(nextDiv);

        // --- On Hold Tokens Card ---
        if (onHoldTokens.length > 0) {
            const onHoldDiv = document.createElement('div');
            onHoldDiv.className = 'service-card';
            let onHoldListHTML = onHoldTokens.map(token => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0;">
                    <span>#${token.tokenNumber} (On Hold)</span>
                    <button class="resume-btn" style="padding: 5px 10px;" onclick="updateToken('${token._id}', 'Resume')">Resume</button>
                </div>
            `).join('');
            onHoldDiv.innerHTML = `<h3>Tokens On Hold</h3>${onHoldListHTML}`;
            servicesGrid.appendChild(onHoldDiv);
        }

        // --- Moved From Yesterday Card ---
        if (movedFromYesterday.length > 0) {
            const yesterdayDiv = document.createElement('div');
            yesterdayDiv.className = 'service-card';
            let userListHTML = movedFromYesterday.map(token => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0;">
                    <span>#${token.tokenNumber} - ${token.name}</span>
                    <button style="padding: 5px 10px;" onclick="sendReminder('${token._id}')">Remind</button>
                </div>
            `).join('');
            yesterdayDiv.innerHTML = `
                <h3>Moved From Yesterday</h3>
                ${userListHTML}
            `;
            servicesGrid.appendChild(yesterdayDiv);
        }

        // --- End of Day Card ---
        const now = new Date();
        const endOfDayDiv = document.createElement('div');
        endOfDayDiv.className = 'service-card';
        if (now.getHours() > 23 || (now.getHours() === 23 && now.getMinutes() >= 30)) {
            endOfDayDiv.innerHTML = `
                <h3>End of Day</h3>
                <p>Office entry is closed. Move remaining users to tomorrow's queue.</p>
                <button class="come-tomorrow" onclick="moveQueueToTomorrow()">Notify All to Come Tomorrow</button>
            `;
            servicesGrid.appendChild(endOfDayDiv);
        }
    }
}

async function putTokenOnHold(tokenId) {
    const holdMinutes = prompt("For how many minutes do you want to put this token on hold?", "15");
    if (holdMinutes && !isNaN(holdMinutes)) {
        await fetch('http://localhost:3000/api/staff/update-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenId, status: 'On Hold', holdMinutes: parseInt(holdMinutes) })
        });
    }
}

async function sendReminder(tokenId) {
    if (!confirm('Send a reminder to this user? This will start a 24-hour expiration timer.')) return;
    try {
        await fetch('http://localhost:3000/api/staff/remind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenId, staffName: staffInfo.name })
        });
        alert('Reminder sent!');
    } catch (err) {
        alert('Failed to send reminder.');
    }
}

function startServiceTimer(startTime) {
    const timerDisplay = document.getElementById('serviceTimerDisplay');
    if (!timerDisplay || !startTime) return;

    const startTimestamp = new Date(startTime).getTime();

    serviceTimer = setInterval(() => {
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

async function sendMessageToUser(userId) {
    const messages = [
        "Please bring your Aadhar card to the counter.",
        "Please bring a valid photo ID to the counter.",
        "Your document is missing a signature. Please come to the counter.",
        "Please come to the counter for a query."
    ];
    const choice = prompt("Select a message to send:\n\n1: Aadhar Card Request\n2: Photo ID Request\n3: Missing Signature\n4: General Query");
    if (choice && choice > 0 && choice <= messages.length) {
        const message = messages[choice - 1];
        try {
            const res = await fetch('http://localhost:3000/api/staff/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, message, staffName: staffInfo.name })
            });
            const data = await res.json();
            alert(data.message);
        } catch (err) {
            alert('Failed to send message.');
        }
    }
}

async function loadAllCounters() {
    try {
        const res = await fetch('http://localhost:3000/api/tokens/public');
        const data = await res.json();
        const countersGrid = document.getElementById('allCountersGrid');
        countersGrid.innerHTML = '';
        if (data.success) {
            for (const serviceName in data.publicData) {
                const serviceInfo = data.publicData[serviceName];
                const counterCard = document.createElement('div');
                counterCard.className = 'counter-card';
                counterCard.innerHTML = `
                    <h4>${serviceName}</h4>
                    <p>Now Serving: <strong>#${serviceInfo.currentlyServing}</strong></p>
                    <p>Queue Length: ${serviceInfo.totalInQueue}</p>
                `;
                countersGrid.appendChild(counterCard);
            }
        }
    } catch (err) {
        console.error("Could not fetch live counter data:", err);
    }
}

function moveQueueToTomorrow() {
    if (!confirm('Are you sure you want to move all remaining users to tomorrow? This cannot be undone.')) return;
    const selectedDate = document.getElementById('queueDate').value;
    fetch('http://localhost:3000/api/staff/move-queue-to-tomorrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: staffInfo.assignedService, date: selectedDate })
    }).then(res => res.json()).then(data => alert(data.message));
}

async function callNext() {
    const selectedDate = document.getElementById('queueDate').value;
    await fetch('http://localhost:3000/api/staff/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: staffInfo.assignedService, date: selectedDate })
    });
}

async function updateToken(tokenId, status) {
    await fetch('http://localhost:3000/api/staff/update-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, status })
    });
}