
const socket = io('http://localhost:3000');
document.addEventListener('DOMContentLoaded', () => {
    loadStaff();
    loadUsers();

    document.getElementById('addStaffForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('staffName').value;
        const email = document.getElementById('staffEmail').value;
        const password = document.getElementById('staffPassword').value;
        const assignedService = document.getElementById('assignedService').value;

        const res = await fetch('http://localhost:3000/api/admin/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, assignedService })
        });
        const data = await res.json();
        if (data.success) {
            alert('Staff added successfully!');
            loadStaff();
            e.target.reset();
        } else {
            alert(data.message);
        }
    });
});

socket.on('staffStatusUpdated', (data) => {
    // Find the staff member in the list and update their status
    const staffItem = document.querySelector(`[data-staff-id="${data.staffId}"] .status`);
    if (staffItem) {
        staffItem.textContent = data.status;
        staffItem.className = `status status-${data.status}`;
    }
});


async function loadStaff() {
    const res = await fetch('http://localhost:3000/api/admin/staff');
    const data = await res.json();
    const staffList = document.getElementById('staffList');
    staffList.innerHTML = '';
    if (data.success) {
        data.staff.forEach(s => {
            const item = document.createElement('div');
            item.className = 'item';
            item.setAttribute('data-staff-id', s._id);
            item.innerHTML = `
                <div>
                    <p><strong>${s.name}</strong> (${s.email})</p>
                    <small>Assigned: ${s.assignedService || 'N/A'}</small>
                </div>
                <div>
                    <span class="status status-${s.status || 'Active'}">${s.status || 'Active'}</span>
                </div>
                <div class="actions">
                    <button class="btn-reset" onclick="resetStaffPassword('${s._id}', '${s.name}')">Reset Password</button>
                    <button class="btn-delete" onclick="deleteStaff('${s._id}')">Delete</button>
                </div>`;
            staffList.appendChild(item);
        });
    }
}

async function loadUsers() {
    const res = await fetch('http://localhost:3000/api/admin/users');
    const data = await res.json();
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    if (data.success) {
        data.users.forEach(u => {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <div>
                    <p>
                        <strong><a href="user_profile.html?id=${u._id}">${u.name}</a></strong> 
                        (${u.email})
                    </p>
                </div>
                <div class="actions">
                    <button class="btn-reset" onclick="resetUserPassword('${u._id}', '${u.name}')">Reset Password</button>
                    <button class="btn-delete" onclick="deleteUser('${u._id}')">Delete</button>
                </div>`;
            userList.appendChild(item);
        });
    }
}

async function deleteStaff(staffId) {
    if (!confirm('Are you sure?')) return;
    const res = await fetch(`http://localhost:3000/api/admin/staff/${staffId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
        loadStaff();
    } else {
        alert(data.message);
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their tokens.')) return;
    const res = await fetch(`http://localhost:3000/api/admin/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
        loadUsers(); // Reload the user list
    } else {
        alert(data.message);
    }
}

async function resetStaffPassword(staffId, staffName) {
    const newPassword = prompt(`Enter new password for ${staffName}:`);
    if (!newPassword) return;
    const res = await fetch('http://localhost:3000/api/admin/reset-staff-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, newPassword })
    });
    const data = await res.json();
    alert(data.message);
}

async function resetUserPassword(userId, userName) {
    const newPassword = prompt(`Enter new password for ${userName}:`);
    if (!newPassword) return;
    const res = await fetch('http://localhost:3000/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword })
    });
    const data = await res.json();
    alert(data.message);
}