async function updateAccountNav() {
  const link = document.querySelector('[data-account-link]');
  if (!link) return;
  try {
    const res = await fetch('/api/auth/me');
    const { user } = await res.json();
    if (user) {
      link.textContent = user.name.split(' ')[0];
      link.href = 'account.html';
    } else {
      link.textContent = 'Log in';
      link.href = 'login.html';
    }
  } catch (e) {
    // Leave the default "Log in" state if the check fails
  }
}

document.addEventListener('DOMContentLoaded', updateAccountNav);
