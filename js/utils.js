// ── TOAST ────────────────────────────────────────────────────────────────────
const Toast = {
  _show(msg, type, dur = 3500) {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:360px';
      document.body.appendChild(c);
    }
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const colors = { success: '#4caf78', error: '#e05c5c', info: '#5b8ee6', warning: '#e0a84a' };
    const el = document.createElement('div');
    el.style.cssText = `display:flex;align-items:center;gap:10px;padding:12px 16px;background:#16161f;border:1px solid ${colors[type]}33;border-left:3px solid ${colors[type]};border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-size:14px;color:#f0ede8;animation:slideIn .25s ease`;
    el.innerHTML = '<span style="font-size:16px;color:' + colors[type] + '">' + icons[type] + '</span><span>' + msg + '</span>';
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, dur);
  },
  success: (m) => Toast._show(m, 'success'),
  error:   (m) => Toast._show(m, 'error', 5000),
  info:    (m) => Toast._show(m, 'info'),
  warning: (m) => Toast._show(m, 'warning'),
};

// ── LOADING ───────────────────────────────────────────────────────────────────
function setLoading(btn, on) {
  if (!btn) return;
  if (on) {
    btn.disabled = true;
    btn._txt = btn.innerHTML;
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span>';
  } else {
    btn.disabled = false;
    if (btn._txt) btn.innerHTML = btn._txt;
  }
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  const close = () => closeModal(id);
  m._backdrop = (e) => { if (e.target === m) close(); };
  m._esc = (e) => { if (e.key === 'Escape') close(); };
  m.addEventListener('click', m._backdrop);
  document.addEventListener('keydown', m._esc);
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.style.display = 'none';
  document.body.style.overflow = '';
  if (m._backdrop) m.removeEventListener('click', m._backdrop);
  if (m._esc) document.removeEventListener('keydown', m._esc);
}

// ── FORM HELPERS ──────────────────────────────────────────────────────────────
function setFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--red)';
  let err = el.parentElement.querySelector('.ferr');
  if (!err) { err = document.createElement('span'); err.className = 'ferr'; err.style.cssText = 'font-size:12px;color:var(--red);display:block;margin-top:4px'; el.parentElement.appendChild(err); }
  err.textContent = msg;
}

function clearErrors(form) {
  form.querySelectorAll('.ferr').forEach(e => e.remove());
  form.querySelectorAll('input,textarea').forEach(e => e.style.borderColor = '');
}

// ── TIME ──────────────────────────────────────────────────────────────────────
function timeAgo(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  if (h < 24) return h + 'h ago';
  if (day < 30) return day + 'd ago';
  return Math.floor(day / 30) + 'mo ago';
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── AVATAR ────────────────────────────────────────────────────────────────────
function initials(u) { return u ? u.slice(0, 2).toUpperCase() : '??'; }

function avatarHTML(user, size) {
  const sz = { sm: '32px', md: '40px', lg: '52px', xl: '80px' }[size] || '40px';
  const fs = { sm: '11px', md: '13px', lg: '16px', xl: '24px' }[size] || '13px';
  const base = 'border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-family:var(--font-body);flex-shrink:0;';
  if (user && user.avatar_url) {
    return '<div style="width:' + sz + ';height:' + sz + ';' + base + 'overflow:hidden"><img src="' + user.avatar_url + '" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.textContent=\'' + initials(user.username) + '\'"></div>';
  }
  const hue = user ? (user.username.charCodeAt(0) * 37) % 360 : 200;
  return '<div style="width:' + sz + ';height:' + sz + ';' + base + 'background:hsl(' + hue + ',40%,25%);color:hsl(' + hue + ',60%,70%);font-size:' + fs + '">' + initials(user && user.username) + '</div>';
}

// ── IMAGE HELPERS ─────────────────────────────────────────────────────────────
// Use Unsplash source for auto-images based on place name
function getPlaceholderImg(placeName, country) {
  const query = encodeURIComponent((placeName + ' ' + (country || '') + ' travel').trim());
  return 'https://source.unsplash.com/800x500/?' + query;
}

function imgHTML(dest, cls, style) {
  const url = dest.image_url || getPlaceholderImg(dest.place_name, dest.country);
  return '<img src="' + url + '" class="' + (cls || '') + '" style="' + (style || '') + '" loading="lazy" alt="' + dest.place_name + '" onerror="this.src=\'https://source.unsplash.com/800x500/?travel,landscape\'">';
}

// ── DESTINATION CARD ──────────────────────────────────────────────────────────
function destCardHTML(dest) {
  const img = dest.image_url || getPlaceholderImg(dest.place_name, dest.country);
  const liked = dest.is_liked_by_me;
  return `
    <div class="dest-card" data-id="${dest.id}">
      <div class="dest-card-img-wrap">
        <img src="${img}" alt="${dest.place_name}" loading="lazy" onerror="this.src='https://source.unsplash.com/800x500/?travel'">
        ${dest.is_visited ? '<span class="visited-badge">✓ Visited</span>' : ''}
      </div>
      <div class="dest-card-body">
        <div class="dest-card-loc">📍 ${dest.city ? dest.city + ', ' : ''}${dest.country}</div>
        <h3 class="dest-card-title">${dest.place_name}</h3>
        ${dest.description ? '<p class="dest-card-desc">' + dest.description.slice(0, 100) + (dest.description.length > 100 ? '…' : '') + '</p>' : ''}
        <div class="dest-card-footer">
          <div class="dest-card-author">${avatarHTML(dest.owner, 'sm')}<span>${dest.owner ? dest.owner.username : ''}</span></div>
          <div class="dest-card-actions">
            <button class="like-btn ${liked ? 'liked' : ''}" data-id="${dest.id}">${liked ? '♥' : '♡'} <span>${dest.likes_count}</span></button>
            <span class="cmt-count">💬 ${dest.comments_count}</span>
          </div>
        </div>
      </div>
    </div>`;
}

// ── SKELETON ──────────────────────────────────────────────────────────────────
function skeletonCard() {
  return '<div class="dest-card"><div class="skel" style="height:220px"></div><div class="dest-card-body" style="display:flex;flex-direction:column;gap:12px"><div class="skel" style="height:12px;width:50%"></div><div class="skel" style="height:20px;width:80%"></div><div class="skel" style="height:12px"></div></div></div>';
}

// ── NAVBAR ────────────────────────────────────────────────────────────────────
async function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  // Active link
  const page = location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('a[href]').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });

  // Auth area
  const area = nav.querySelector('[data-auth]');
  if (area) {
    const user = getUser();
    if (isLoggedIn() && user) {
      area.innerHTML = `
        <a href="profile.html" class="nav-user">${avatarHTML(user, 'sm')}<span>${user.username}</span></a>
        <button class="btn-ghost btn-sm" id="logoutBtn">Logout</button>`;
      document.getElementById('logoutBtn').onclick = () => { removeToken(); location.href = '/index.html'; };
    } else {
      area.innerHTML = '<a href="login.html" class="btn-ghost btn-sm">Sign In</a><a href="register.html" class="btn-accent btn-sm">Get Started</a>';
    }
  }

  // Mobile menu toggle
  const toggle = document.getElementById('nav-toggle');
  const menu   = document.getElementById('mobile-menu');
  if (toggle && menu) toggle.onclick = () => menu.classList.toggle('open');
}

// ── DEBOUNCE ──────────────────────────────────────────────────────────────────
function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// inject spin keyframe
const _s = document.createElement('style');
_s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}';
document.head.appendChild(_s);
