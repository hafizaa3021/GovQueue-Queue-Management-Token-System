document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const tokenId = params.get('tokenId');
    const serviceName = params.get('service');

    if (!tokenId || !serviceName) {
        alert('Invalid feedback link.');
        window.location.href = 'track_status.html';
        return;
    }

    document.getElementById('serviceName').textContent = serviceName;

    document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get the selected rating from the stars
        const rating = document.querySelector('input[name="rating"]:checked');
        if (!rating) {
            alert('Please select a star rating.');
            return;
        }

        const comment = document.getElementById('comment').value;
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

        const res = await fetch('http://localhost:3000/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokenId,
                userId: loggedInUser._id,
                service: serviceName,
                rating: rating.value,
                comment
            })
        });

        const data = await res.json();
        alert(data.message);
        if (data.success) {
            window.location.href = 'track_status.html';
        }
    });
});