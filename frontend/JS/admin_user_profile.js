document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    if (userId) {
        fetchUserProfile(userId);
    } else {
        // Handle case where no user ID is provided
        document.getElementById('userNameHeader').textContent = 'User Not Found';
    }
});

async function fetchUserProfile(userId) {
    try {
        const res = await fetch(`http://localhost:3000/api/admin/user/${userId}`);
        const data = await res.json();

        if (data.success) {
            const user = data.user;
            document.getElementById('userNameHeader').textContent = `${user.name}'s Profile`;
            document.getElementById('fullName').textContent = user.name || 'N/A';
            document.getElementById('email').textContent = user.email || 'N/A';
            document.getElementById('phone').textContent = user.phone || 'Not provided';
            document.getElementById('address').textContent = user.address || 'Not provided';
        } else {
            document.getElementById('userNameHeader').textContent = 'User Not Found';
            alert(data.message);
        }
    } catch (err) {
        console.error('Error fetching user profile:', err);
        alert('An error occurred while fetching the user profile.');
    }
}