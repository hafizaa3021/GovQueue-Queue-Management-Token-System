document.addEventListener('DOMContentLoaded', () => {
    // 1. Get the service name from the URL
    const params = new URLSearchParams(window.location.search);
    const serviceName = params.get('service');

    // Decode the service name and display it
    const serviceNameElement = document.getElementById('serviceName');
    if (serviceName) {
        serviceNameElement.textContent = decodeURIComponent(serviceName);
    } else {
        serviceNameElement.textContent = "No Service Selected";
    }

    // 2. Check for logged-in user and pre-fill details
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser || !loggedInUser._id) {
        alert('Please login first to book a token.');
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').value = loggedInUser.name;
    document.getElementById('userEmail').value = loggedInUser.email;

    // Set the minimum date for the date picker to today, not tomorrow.
    const datePicker = document.getElementById('bookingDate');
    const today = new Date();
    datePicker.min = today.toISOString().split('T')[0]; // This now correctly sets the minimum date to today.
});

// 3. Handle form submission
const bookingForm = document.getElementById('bookingForm');
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const service = document.getElementById('serviceName').textContent;
    const date = document.getElementById('bookingDate').value;

    if (service === "No Service Selected") {
        alert("Please select a service from the dashboard first.");
        return;
    }
    if (!date) {
        alert('Please select a date');
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/bookToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: loggedInUser._id,
                service,
                date
            })
        });

        const data = await res.json();

        if (data.success) {
            alert(`✅ Token booked successfully!\nYour Token Number: ${data.token.tokenNumber}\nEstimated wait time: ${data.waitTime} minutes.`);
            window.location.href = 'track_status.html';
        } else {
            alert(data.message || 'Token booking failed');
        }
    } catch (err) {
        console.error(err);
        alert('A server error occurred while booking the token.');
    }
});