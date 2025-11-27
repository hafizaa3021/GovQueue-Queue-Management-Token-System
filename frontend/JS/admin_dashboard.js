
const socket = io('http://localhost:3000');
document.addEventListener('DOMContentLoaded', () => {
    const admin = JSON.parse(localStorage.getItem('admin'));
    if (admin && admin.name) {
        document.getElementById('adminGreeting').textContent = `Welcome, ${admin.name}!`;
    }
    // Initial load
    loadAnalytics();
    loadStaff();
    loadUsers();
    loadPeakHoursChart(); // Naya function call kiya gaya hai

    // Download report button ke liye event listener
    document.getElementById('downloadReportBtn').addEventListener('click', () => {
        window.location.href = 'http://localhost:3000/api/admin/analytics/report';
    });
});

// --- REAL-TIME LISTENERS ---
socket.on('newToken', loadAnalytics);
socket.on('tokenUpdated', loadAnalytics);

async function loadAnalytics() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/analytics');
        const data = await res.json();
        if (data.success) {
            document.getElementById('totalTokens').textContent = data.analytics.totalTokens;
            document.getElementById('pendingTokens').textContent = data.analytics.pending;
            document.getElementById('completedTokens').textContent = data.analytics.completed;
            document.getElementById('activeStaff').textContent = data.analytics.activeStaff;
        }
    } catch (err) { console.error('Error loading analytics:', err); }
}

// Naya function chart load karne ke liye
async function loadPeakHoursChart() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/analytics/peak-hours');
        const data = await res.json();
        if (data.success) {
            const ctx = document.getElementById('peakHoursChart').getContext('2d');

            // 24 ghante ke liye labels (e.g., "0:00", "1:00", etc.)
            const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

            // Har ghante ke data ko map karna
            const chartData = labels.map(label => {
                const hour = parseInt(label.split(':')[0]);
                const match = data.peakHours.find(d => d._id === hour);
                return match ? match.count : 0;
            });

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tokens per Hour',
                        data: chartData,
                        backgroundColor: '#1D2D44',
                        borderColor: '#748CAB',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1 // Y-axis par 1, 2, 3 jaisa count dikhega
                            }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error loading peak hours chart:', err);
    }
}

async function loadStaff() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/staff');
        const data = await res.json();
        const staffGrid = document.getElementById('staffGrid');
        staffGrid.innerHTML = '';
        if (data.success && data.staff.length > 0) {
            data.staff.forEach(s => {
                const item = document.createElement('div');
                item.className = 'item';
                item.innerHTML = `<p><strong>${s.name}</strong> (${s.assignedService || 'N/A'})</p>`;
                staffGrid.appendChild(item);
            });
        } else {
            staffGrid.innerHTML = '<p>No staff members found.</p>';
        }
    } catch (err) { console.error('Error loading staff:', err); }
}

async function loadUsers() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/users');
        const data = await res.json();
        const userGrid = document.getElementById('userGrid');
        userGrid.innerHTML = '';
        if (data.success && data.users.length > 0) {
            // Sirf 5 users dikhane ke liye
            data.users.slice(0, 5).forEach(user => {
                const item = document.createElement('div');
                item.className = 'item';
                item.innerHTML = `<p><strong>${user.name}</strong> (${user.email})</p>`;
                userGrid.appendChild(item);
            });
        } else {
            userGrid.innerHTML = '<p>No registered users yet.</p>';
        }
    } catch (err) { console.error('Error loading users:', err); }
}