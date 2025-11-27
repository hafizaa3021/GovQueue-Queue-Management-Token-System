const staffLoginForm = document.getElementById('staffLoginForm');

staffLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Corrected IDs to match the login form HTML
  const email = document.getElementById('staffEmail').value;
  const password = document.getElementById('staffPassword').value;

  try {
    const res = await fetch('http://localhost:3000/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (data.success) {
      alert('Login successful');
      // Save the entire staff object to localStorage
      localStorage.setItem('staff', JSON.stringify(data.staff));
      window.location.href = 'staff_dashboard.html';
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
    alert('Something went wrong!');
  }
});