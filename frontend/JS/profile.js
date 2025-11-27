document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser || !loggedInUser._id) {
        window.location.href = 'login.html';
        return;
    }

    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const inputs = profileForm.querySelectorAll('input');

    const populateForm = (user) => {
        document.getElementById('fullName').value = user.name || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('address').value = user.address || '';
    };

    populateForm(loggedInUser);

    editBtn.addEventListener('click', () => {
        inputs.forEach(input => input.removeAttribute('readonly'));
        editBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        inputs.forEach(input => input.setAttribute('readonly', true));
        editBtn.classList.remove('hidden');
        saveBtn.classList.add('hidden');
        cancelBtn.classList.add('hidden');
        populateForm(loggedInUser);
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedDetails = {
            userId: loggedInUser._id,
            name: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
        };

        try {
            // CORRECTED: Using full URL to backend
            const res = await fetch('http://localhost:3000/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedDetails)
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                localStorage.setItem('loggedInUser', JSON.stringify(data.user));
                cancelBtn.click();
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert('An error occurred. Please try again.');
        }
    });

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;

        try {
            // CORRECTED: Using full URL to backend
            const res = await fetch('http://localhost:3000/api/user/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: loggedInUser._id, currentPassword, newPassword })
            });
            const data = await res.json();
            alert(data.message);
            if (data.success) {
                passwordForm.reset();
            }
        } catch (err) {
            alert('An error occurred. Please try again.');
        }
    });

    document.getElementById('logoutLink').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    });
});