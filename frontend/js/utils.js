// ─── TOAST NOTIFICATIONS ────────────────────────────────────────────────────
function initToasts() {
  if (!document.getElementById('toast-container')) {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
}

function toast(message, type = 'info', duration = 3500) {
  initToasts();
  const container = document.getElementById('toast-container');

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('toast-hide');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

const Toast = {
  success: (msg) => toast(msg, 'success'),
  error:   (msg) => toast(msg, 'error', 4500),
  info:    (msg) => toast(msg, 'info'),
  warning: (msg) => toast(msg, 'warning'),
};

// ─── LOADING STATE ───────────────────────────────────────────────────────────
function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn._originalHTML = btn.innerHTML;
    btn.classList.add('btn-loading');
    btn.innerHTML = btn.getAttribute('data-loading-text') || btn.innerHTML;
  } else {
    btn.disabled = false;
    btn.classList.remove('btn-loading');
    if (btn._originalHTML) btn.innerHTML = btn._originalHTML;
  }
}

// ─── MODAL MANAGEMENT ────────────────────────────────────────────────────────
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modalId);
  });
  // Close on Escape
  document.addEventListener('keydown', function escClose(e) {
    if (e.key === 'Escape') {
      closeModal(modalId);
      document.removeEventListener('keydown', escClose);
    }
  });
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

// ─── FORM HELPERS ────────────────────────────────────────────────────────────
function getFormData(formEl) {
  const data = {};
  new FormData(formEl).forEach((v, k) => { data[k] = v.trim(); });
  return data;
}

function setFormError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add('error');
  let errEl = field.parentElement.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.className = 'form-error';
    field.parentElement.appendChild(errEl);
  }
  errEl.textContent = message;
}

function clearFormErrors(formEl) {
  formEl.querySelectorAll('.form-input.error, .form-textarea.error').forEach(el => {
    el.classList.remove('error');
  });
  formEl.querySelectorAll('.form-error').forEach(el => el.remove());
}

// ─── DATE FORMATTING ─────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ─── AVATAR HELPERS ───────────────────────────────────────────────────────────
function getInitials(username) {
  return username ? username.slice(0, 2).toUpperCase() : '??';
}

function avatarHTML(user, size = 'md') {
  if (user?.avatar_url) {
    return `<div class="avatar avatar-${size}"><img src="${user.avatar_url}" alt="${user.username}" onerror="this.parentElement.innerHTML='${getInitials(user?.username)}'"></div>`;
  }
  return `<div class="avatar avatar-${size}">${getInitials(user?.username)}</div>`;
}

// ─── DESTINATION CARD HTML ────────────────────────────────────────────────────
function destCardHTML(dest, showActions = true) {
  const imageBlock = dest.image_url
    ? `<div class="dest-card-image"><img src="${dest.image_url}" alt="${dest.place_name}" loading="lazy" onerror="this.parentElement.innerHTML='<div style=height:200px;display:flex;align-items:center;justify-content:center;font-size:48px>🌍</div>'"></div>`
    : `<div class="dest-card-placeholder">🌍</div>`;

  const visitedBadge = dest.is_visited
    ? `<span class="visited-stamp">✓ Visited</span>`
    : '';

  const actionsHTML = showActions ? `
    <div class="dest-card-actions">
      <button class="action-btn like-btn ${dest.is_liked_by_me ? 'liked' : ''}" data-id="${dest.id}" data-liked="${dest.is_liked_by_me}">
        ${dest.is_liked_by_me ? '♥' : '♡'} <span class="like-count">${dest.likes_count}</span>
      </button>
      <button class="action-btn" data-id="${dest.id}">
        💬 <span>${dest.comments_count}</span>
      </button>
    </div>` : '';

  return `
    <div class="dest-card" data-id="${dest.id}">
      <div style="position:relative">
        ${imageBlock}
        ${visitedBadge}
      </div>
      <div class="dest-card-body">
        <div class="dest-card-location">
          <span>📍</span>
          ${dest.city ? dest.city + ', ' : ''}${dest.country}
        </div>
        <h3 class="dest-card-title">${dest.place_name}</h3>
        ${dest.description ? `<p class="dest-card-desc">${dest.description}</p>` : ''}
        <div class="dest-card-footer">
          <div class="dest-card-author">
            ${avatarHTML(dest.owner, 'sm')}
            <span>${dest.owner?.username}</span>
          </div>
          ${actionsHTML}
        </div>
      </div>
    </div>
  `;
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function skeletonCardHTML() {
  return `
    <div class="dest-card">
      <div class="skeleton" style="height:200px;border-radius:0"></div>
      <div class="dest-card-body" style="display:flex;flex-direction:column;gap:12px">
        <div class="skeleton" style="height:12px;width:60%;border-radius:4px"></div>
        <div class="skeleton" style="height:22px;width:85%;border-radius:4px"></div>
        <div class="skeleton" style="height:14px;border-radius:4px"></div>
        <div class="skeleton" style="height:14px;width:75%;border-radius:4px"></div>
      </div>
    </div>
  `;
}

// ─── NAVBAR INIT ─────────────────────────────────────────────────────────────
async function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const user = getCachedUser();
  const loggedIn = isLoggedIn();

  // Highlight active link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes(currentPage)) link.classList.add('active');
  });

  // Auth buttons
  const authArea = nav.querySelector('[data-auth-area]');
  if (authArea) {
    if (loggedIn && user) {
      authArea.innerHTML = `
        <a href="profile.html" class="navbar-user">
          ${avatarHTML(user, 'sm')}
          <span class="navbar-username">${user.username}</span>
        </a>
        <button class="btn btn-ghost btn-sm" id="logoutBtn">Logout</button>
      `;
      document.getElementById('logoutBtn')?.addEventListener('click', () => {
        removeToken();
        window.location.href = '/index.html';
      });
    } else {
      authArea.innerHTML = `
        <a href="login.html" class="btn btn-ghost btn-sm">Sign In</a>
        <a href="register.html" class="btn btn-primary btn-sm">Get Started</a>
      `;
    }
  }

  // Mobile toggle
  const toggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  toggle?.addEventListener('click', () => {
    toggle.classList.toggle('open');
    mobileMenu?.classList.toggle('open');
  });
}

// ─── COUNTRY FLAGS (emoji) ────────────────────────────────────────────────────
const TRAVEL_EMOJIS = ['🌍','🌎','🌏','🗺️','✈️','🏔️','🏖️','🗼','🏛️','⛩️','🌅','🌄'];
function randomTravelEmoji() {
  return TRAVEL_EMOJIS[Math.floor(Math.random() * TRAVEL_EMOJIS.length)];
}

// ─── DEBOUNCE ─────────────────────────────────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
