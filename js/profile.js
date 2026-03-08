async function initProfilePage() {
  if (!requireAuth()) return;
  await loadProfile();
  initProfileForm();
}

async function loadProfile() {
  try {
    const user = await Profile.getMe();
    saveUser(user);
    renderProfile(user);
  } catch (e) { Toast.error('Failed to load profile: ' + e.message); }
}

function renderProfile(user) {
  const av = document.getElementById('profile-avatar');
  if (av) av.innerHTML = avatarHTML(user, 'xl');
  setText('profile-username', user.username);
  setText('profile-email',    user.email);
  setText('profile-joined',   'Member since ' + fmtDate(user.created_at));
  setText('profile-bio',      user.bio || 'No bio yet.');
  setVal('form-username',     user.username || '');
  setVal('form-bio',          user.bio      || '');
  setVal('form-avatar',       user.avatar_url || '');
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setVal(id, val)  { const el = document.getElementById(id); if (el) el.value = val; }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }); }

function initProfileForm() {
  const form = document.getElementById('profile-form');
  const btn  = document.getElementById('profile-save-btn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(form);
    const username   = document.getElementById('form-username').value.trim();
    const bio        = document.getElementById('form-bio').value.trim();
    const avatar_url = document.getElementById('form-avatar').value.trim();

    if (!username)           { setFieldError('form-username', 'Required'); return; }
    if (username.length < 3) { setFieldError('form-username', 'Min 3 chars'); return; }

    setLoading(btn, true);
    try {
      const updated = await Profile.updateMe({ username, bio: bio || null, avatar_url: avatar_url || null });
      saveUser(updated);
      renderProfile(updated);
      Toast.success('Profile updated!');
    } catch (e) { Toast.error(e.message); }
    finally { setLoading(btn, false); }
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('Log out?')) { removeToken(); location.href = '/index.html'; }
  });
}
