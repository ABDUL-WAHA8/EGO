// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
async function initProfilePage() {
  if (!requireAuth()) return;

  await loadProfile();
  initProfileForm();
}

async function loadProfile() {
  try {
    const user = await Profile.getMe();
    setCachedUser(user);
    renderProfile(user);
  } catch (err) {
    Toast.error('Failed to load profile: ' + err.message);
  }
}

function renderProfile(user) {
  document.getElementById('profile-avatar').innerHTML = avatarHTML(user, 'xl');
  document.getElementById('profile-username').textContent = user.username;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('profile-joined').textContent = 'Member since ' + formatDate(user.created_at);
  document.getElementById('profile-bio-display').textContent = user.bio || 'No bio yet.';

  // Pre-fill form
  document.getElementById('form-username').value = user.username || '';
  document.getElementById('form-bio').value = user.bio || '';
  document.getElementById('form-avatar-url').value = user.avatar_url || '';
}

function initProfileForm() {
  const form = document.getElementById('profile-form');
  const saveBtn = document.getElementById('profile-save-btn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const username = document.getElementById('form-username').value.trim();
    const bio = document.getElementById('form-bio').value.trim();
    const avatar_url = document.getElementById('form-avatar-url').value.trim();

    if (!username) { setFormError('form-username', 'Username is required'); return; }
    if (username.length < 3) { setFormError('form-username', 'At least 3 characters'); return; }

    setLoading(saveBtn, true);
    try {
      const updated = await Profile.updateMe({
        username: username || undefined,
        bio: bio || null,
        avatar_url: avatar_url || null,
      });
      setCachedUser(updated);
      renderProfile(updated);
      Toast.success('Profile updated!');
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(saveBtn, false);
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to log out?')) {
      removeToken();
      window.location.href = '/index.html';
    }
  });
}
