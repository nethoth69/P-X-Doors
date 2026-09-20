function showError(message) {
  const box = document.getElementById('form-error');
  if (!box) return;
  box.textContent = message;
  box.classList.add('visible');
}

function hideError() {
  const box = document.getElementById('form-error');
  if (box) box.classList.remove('visible');
}

function redirectAfterAuth() {
  const params = new URLSearchParams(window.location.search);
  window.location.href = params.get('next') || 'account.html';
}

async function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          password: form.password.value
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Could not create your account.');
        submitBtn.disabled = false;
        return;
      }
      redirectAfterAuth();
    } catch (err) {
      showError('Could not reach the server. Check your connection and try again.');
      submitBtn.disabled = false;
    }
  });
}

async function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'google') {
    showError('Google sign-in did not complete. Please try again.');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.value.trim(), password: form.password.value })
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Could not log you in.');
        submitBtn.disabled = false;
        return;
      }
      redirectAfterAuth();
    } catch (err) {
      showError('Could not reach the server. Check your connection and try again.');
      submitBtn.disabled = false;
    }
  });
}

// Hide the Google button on either page if Google sign-in isn't configured yet
async function initGoogleButton() {
  const btn = document.getElementById('google-btn');
  if (!btn) return;
  try {
    const res = await fetch('/api/auth/config');
    const { googleEnabled } = await res.json();
    if (!googleEnabled) {
      btn.style.display = 'none';
      const note = document.getElementById('google-note');
      if (note) note.style.display = 'block';
    }
  } catch (e) {
    btn.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSignupForm();
  initLoginForm();
  initGoogleButton();
});
