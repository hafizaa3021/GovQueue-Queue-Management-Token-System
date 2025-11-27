document.addEventListener('DOMContentLoaded', loadAllFeedback);

async function loadAllFeedback() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/feedback');
        const data = await res.json();
        const feedbackList = document.getElementById('feedbackList');
        feedbackList.innerHTML = '';

        if (data.success && data.feedback.length > 0) {
            data.feedback.forEach(fb => {
                const userName = fb.userId ? fb.userId.name : 'Anonymous';
                const div = document.createElement('div');
                div.className = 'feedback-item';
                div.innerHTML = `
                    <p><strong>Service:</strong> ${fb.service}</p>
                    <p><strong>Rating:</strong> ${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}</p>
                    <p><strong>Comment:</strong> ${fb.comment || 'N/A'}</p>
                    <small>By: ${userName} on ${new Date(fb.createdAt).toLocaleDateString()}</small>
                `;
                feedbackList.appendChild(div);
            });
        } else {
            feedbackList.innerHTML = '<p>No feedback submissions found.</p>';
        }
    } catch (err) {
        console.error('Error loading feedback:', err);
        feedbackList.innerHTML = '<p>An error occurred while loading feedback.</p>';
    }
}