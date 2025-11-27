document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;

    try {
        // CORRECTED URL HERE
        const res = await fetch('http://localhost:3000/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            const token = prompt("A reset token was logged to the server console. Please copy it and go to the reset page. (This is for testing only)");
            if (token) {
                window.location.href = `reset_password.html?token=${token}`;
            }
        }
    } catch (err) {
        alert('An error occurred.');
    }
});