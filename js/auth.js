async function initLoginPage() {
  redirectIfAuth();
  const form = document.getElementById('login-form');
  const btn  = document.getElementById('login-btn');
  const err  = document.getElementById('login-err');
  const pwdInput = document.getElementById('password');

  document.getElementById('toggle-pwd')?.addEventListener('click', () => {
    pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(form);
    if (err) err.style.display = 'none';

    const email    = document.getElementById('email').value.trim();
    const password = pwdInput.value;

    if (!email)    { setFieldError('email', 'Required'); return; }
    if (!password) { setFieldError('password', 'Required'); return; }

    setLoading(btn, true);
    try {
      const { access_token } = await Auth.login(email, password);
      setToken(access_token);
      const user = await Auth.me();
      saveUser(user);
      Toast.success('Welcome back, ' + user.username + '!');
      setTimeout(() => location.href = '/dashboard.html', 500);
    } catch (e) {
      if (err) { err.style.display = 'flex'; err.querySelector('span').textContent = e.message; }
      setLoading(btn, false);
    }
  });
}

async function initRegisterPage() {
  redirectIfAuth();
  const form = document.getElementById('register-form');
  const btn  = document.getElementById('register-btn');
  const err  = document.getElementById('register-err');
  const pwdInput = document.getElementById('password');

  document.getElementById('toggle-pwd')?.addEventListener('click', () => {
    pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(form);
    if (err) err.style.display = 'none';

    const email    = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = pwdInput.value;
    const confirm  = document.getElementById('confirm-password').value;

    let ok = true;
    if (!email)              { setFieldError('email',    'Required'); ok = false; }
    if (!username)           { setFieldError('username', 'Required'); ok = false; }
    if (username.length < 3) { setFieldError('username', 'Min 3 characters'); ok = false; }
    if (password.length < 8) { setFieldError('password', 'Min 8 characters'); ok = false; }
    if (password !== confirm) { setFieldError('confirm-password', 'Passwords do not match'); ok = false; }
    if (!ok) return;

    setLoading(btn, true);
    try {
      const { access_token } = await Auth.register(email, username, password);
      setToken(access_token);
      const user = await Auth.me();
      saveUser(user);
      Toast.success('Welcome to Wanderlist! 🌍');
      setTimeout(() => location.href = '/dashboard.html', 600);
    } catch (e) {
      if (err) { err.style.display = 'flex'; err.querySelector('span').textContent = e.message; }
      setLoading(btn, false);
    }
  });
}
