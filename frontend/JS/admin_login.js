const adminLoginForm = document.getElementById('adminLoginForm');

adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;

  try {
    const res = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.success) {
      alert('Login successful');
      // Save the admin object to use on the dashboard
      localStorage.setItem('admin', JSON.stringify(data.admin));
      window.location.href = 'dashboard.html';
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
    alert('Something went wrong!');
  }
});