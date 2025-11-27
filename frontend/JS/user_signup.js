const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!name || !email || !password) {
        alert('Please fill all fields');
        return;
    }

    // --- NEW: Email Validation ---
    // This regular expression checks for a basic email structure ending in a common domain.
    const emailRegex = /^[^\s@]+@[^\s@]+\.(com|net|org|in|co|yahoo\.com)$/i;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address (e.g., example@gmail.com or example@yahoo.com).');
        return; // Stop the form submission if the email is invalid
    }
    // --- End of New Validation ---

    try {
        const res = await fetch('http://localhost:3000/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (data.success) {
            alert('Signup successful! You can now log in.');
            window.location.href = 'login.html';
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('Server error.');
    }
});