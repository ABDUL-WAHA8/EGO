// ─── LOGIN PAGE ──────────────────────────────────────────────────────────────
async function initLoginPage() {
  redirectIfLoggedIn();

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('login-btn');
  const errorBanner = document.getElementById('login-error');
  const togglePwd = document.getElementById('toggle-password');

  // Password visibility toggle
  togglePwd?.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePwd.textContent = type === 'password' ? '👁' : '🙈';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorBanner) errorBanner.style.display = 'none';
    clearFormErrors(form);

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) { setFormError('email', 'Email is required'); return; }
    if (!password) { setFormError('password', 'Password is required'); return; }

    setLoading(submitBtn, true);

    try {
      const { access_token } = await Auth.login(email, password);
      setToken(access_token);

      // Fetch and cache user info
      const user = await Auth.me();
      setCachedUser(user);

      Toast.success(`Welcome back, ${user.username}!`);
      setTimeout(() => window.location.href = '/dashboard.html', 500);
    } catch (err) {
      if (errorBanner) {
        errorBanner.style.display = 'flex';
        errorBanner.querySelector('span').textContent = err.message;
      }
      setLoading(submitBtn, false);
    }
  });
}

// ─── REGISTER PAGE ────────────────────────────────────────────────────────────
async function initRegisterPage() {
  redirectIfLoggedIn();

  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('register-btn');
  const errorBanner = document.getElementById('register-error');
  const togglePwd = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');

  togglePwd?.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePwd.textContent = type === 'password' ? '👁' : '🙈';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorBanner) errorBanner.style.display = 'none';
    clearFormErrors(form);

    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm-password').value;

    let valid = true;
    if (!email) { setFormError('email', 'Email is required'); valid = false; }
    if (!username) { setFormError('username', 'Username is required'); valid = false; }
    if (username.length < 3) { setFormError('username', 'At least 3 characters'); valid = false; }
    if (!password) { setFormError('password', 'Password is required'); valid = false; }
    if (password.length < 8) { setFormError('password', 'At least 8 characters'); valid = false; }
    if (password !== confirm) { setFormError('confirm-password', 'Passwords do not match'); valid = false; }
    if (!valid) return;

    setLoading(submitBtn, true);

    try {
      const { access_token } = await Auth.register(email, username, password);
      setToken(access_token);

      const user = await Auth.me();
      setCachedUser(user);

      Toast.success('Welcome to Travel Bucket List! 🌍');
      setTimeout(() => window.location.href = '/dashboard.html', 600);
    } catch (err) {
      if (errorBanner) {
        errorBanner.style.display = 'flex';
        errorBanner.querySelector('span').textContent = err.message;
      }
      setLoading(submitBtn, false);
    }
  });
}
