document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        alert('No reset token found in URL.');
        return;
    }

    try {
        // CORRECTED URL HERE
        const res = await fetch(`http://localhost:3000/api/reset-password/${token}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            window.location.href = 'login.html';
        }
    } catch (err) {
        alert('An error occurred.');
    }
});