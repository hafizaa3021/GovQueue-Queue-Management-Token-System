document.addEventListener('DOMContentLoaded', () => {
    const loggedInStaff = JSON.parse(localStorage.getItem('staff'));
    if (!loggedInStaff || !loggedInStaff._id) {
        window.location.href = 'staff_login.html';
        return;
    }

    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const inputs = profileForm.querySelectorAll('input');

    const populateForm = (staff) => {
        document.getElementById('fullName').value = staff.name || '';
        document.getElementById('email').value = staff.email || '';
        document.getElementById('assignedService').value = staff.assignedService || 'Not Assigned';
    };

    populateForm(loggedInStaff);

    editBtn.addEventListener('click', () => {
        // Only allow name and email to be edited
        document.getElementById('fullName').removeAttribute('readonly');
        document.getElementById('email').removeAttribute('readonly');
        editBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        inputs.forEach(input => input.setAttribute('readonly', true));
        editBtn.classList.remove('hidden');
        saveBtn.classList.add('hidden');
        cancelBtn.classList.add('hidden');
        populateForm(loggedInStaff);
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedDetails = {
            staffId: loggedInStaff._id,
            name: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
        };

        try {
            const res = await fetch('http://localhost:3000/api/staff/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedDetails)
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                localStorage.setItem('staff', JSON.stringify(data.staff));
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
            const res = await fetch('http://localhost:3000/api/staff/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffId: loggedInStaff._id, currentPassword, newPassword })
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
        window.location.href = 'staff_login.html';
    });
});