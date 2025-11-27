const socket = io('http://localhost:3000');
document.addEventListener('DOMContentLoaded', () => {
    populateServiceBooking();
    loadUserData();
});

// --- REAL-TIME EVENT LISTENERS ---
socket.on('tokenUpdated', () => loadUserData());
socket.on('newToken', () => loadUserData());
socket.on('queueMoved', () => loadUserData());

socket.on('tokenDeleted', (data) => {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (loggedInUser && loggedInUser._id === data.userId.toString()) {
        alert(`Your token #${data.tokenNumber} for the service "${data.service}" has been canceled by the operator.`);
        loadUserData();
    }
});

function populateServiceBooking() {
    // UPDATED: Full list of 10 services with details
    const services = [
        { name: "Aadhar Card", icon: "fa-id-card", description: "The Aadhaar card is a 12-digit unique identity number issued to all Indian residents. It serves as a universal proof of identity and address." },
        { name: "Voter ID", icon: "fa-person-booth", description: "Also known as the Elector's Photo Identity Card (EPIC), this document allows eligible citizens to cast their vote in democratic elections." },
        { name: "Passport", icon: "fa-passport", description: "An essential travel document for those who are travelling abroad for education, tourism, pilgrimage, medical attendance, business purposes and family visits." },
        { name: "Driving License", icon: "fa-car", description: "This official document permits an individual to operate one or more types of motorized vehicles on a public road. It is a mandatory requirement for driving." },
        { name: "PAN Card", icon: "fa-credit-card", description: "The Permanent Account Number (PAN) is a ten-character alphanumeric identifier, essential for tracking financial transactions and for tax purposes." },
        { name: "Ration Card", icon: "fa-store", description: "Issued by state governments, this card enables households to purchase subsidized food grains and other essential commodities from the Public Distribution System." },
        { name: "Birth Certificate", icon: "fa-baby", description: "This is the first and foremost official record of a person's existence. It is crucial for establishing age, identity, and for availing various government services." },
        { name: "Marriage Certificate", icon: "fa-ring", description: "An official statement that two people are legally married. It is an important document for changing names, for bank accounts, and for insurance purposes." },
        { name: "Income Certificate", icon: "fa-file-invoice-dollar", description: "An official document that states the annual income of a person. It is used to avail benefits of various government schemes." },
        { name: "Caste Certificate", icon: "fa-users", description: "This certificate is the proof of one's belonging to a particular caste, especially in case one belongs to any of the 'Backward class' or 'Scheduled Castes'." }
    ];

    const servicesGrid = document.getElementById('servicesGrid');
    servicesGrid.innerHTML = '';

    services.forEach(s => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
        <i class="fas ${s.icon} service-icon"></i>
        <h3>${s.name}</h3>
        <p class="service-desc">${s.description}</p>
        <button onclick="bookService('${s.name}')">Book Now</button>
      `;
        servicesGrid.appendChild(card);
    });
}

function bookService(serviceName) {
    window.location.href = `book_token.html?service=${encodeURIComponent(serviceName)}`;
}

async function loadUserData() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser || !loggedInUser._id) {
        document.getElementById('userGreeting').innerText = 'Hi Guest, please log in.';
        return;
    };

    try {
        const res = await fetch(`http://localhost:3000/api/user/${loggedInUser._id}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('userGreeting').innerText = `Hi ${data.name}, welcome back!`;

            const activeTokens = data.tokens.filter(t => !['Completed', 'No Show', 'Cancelled by User'].includes(t.status));
            const completedTokens = data.tokens.filter(t => t.status === 'Completed').length;
            const cancelledTokens = data.tokens.filter(t => t.status === 'Cancelled by User').length;

            document.getElementById('totalTokens').innerText = activeTokens.length;
            document.getElementById('completedTokens').innerText = completedTokens;
            document.getElementById('cancelledTokens').innerText = cancelledTokens;

            const tokensContainer = document.getElementById('userTokens');
            tokensContainer.innerHTML = '';

            if (activeTokens.length > 0) {
                activeTokens.forEach(t => {
                    let waitTimeMessage = '';
                    if (t.status === 'booked' || t.status === 'Notified' || t.status === 'Moved to Next Day') {
                        if (t.remainingTime > 0) {
                            waitTimeMessage = `Estimated wait: ${t.remainingTime} minutes`;
                        } else {
                            waitTimeMessage = 'You are next in line!';
                        }
                    }

                    const div = document.createElement('div');
                    div.className = 'token-item';
                    div.innerHTML = `
                <div>
                    <strong>${t.service}</strong> - Token #${t.tokenNumber}
                    <br>
                    <small>Date: ${new Date(t.date).toLocaleDateString()}</small>
                    <br>
                    <small class="wait-time">${waitTimeMessage}</small>
                </div>
                <span class="token-status">${t.status}</span>
            `;
                    tokensContainer.appendChild(div);
                });
            } else {
                tokensContainer.innerHTML = '<p>You have no active tokens.</p>';
            }
        }
    } catch (err) { console.error(err); }
}