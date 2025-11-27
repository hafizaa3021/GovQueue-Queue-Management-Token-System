document.addEventListener('DOMContentLoaded', loadMessages);

async function loadMessages() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/messages');
        const data = await res.json();
        const messageList = document.getElementById('messageList');
        messageList.innerHTML = '';

        if (data.success && data.messages.length > 0) {
            data.messages.forEach(msg => {
                const card = document.createElement('div');
                card.className = 'message-card';
                card.innerHTML = `
                    <div class="message-header">
                        <div>
                            <strong>From: ${msg.name}</strong><br>
                            <small>${msg.email}</small>
                        </div>
                        <small>${new Date(msg.createdAt).toLocaleString()}</small>
                    </div>
                    <p>${msg.message}</p>
                `;
                messageList.appendChild(card);
            });
        } else {
            messageList.innerHTML = '<p>No contact messages found.</p>';
        }
    } catch (err) {
        console.error('Error loading messages:', err);
    }
}