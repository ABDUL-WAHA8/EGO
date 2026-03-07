const API_BASE = window.API_BASE_URL || '';

async function request(method, endpoint, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.detail || data.message || `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  return data;
}

// AUTH
const Auth = {
  register: (email, username, password) =>
    request('POST', '/api/auth/register', { email, username, password }),

  login: (email, password) =>
    request('POST', '/api/auth/login', { email, password }),

  me: () =>
    request('GET', '/api/auth/me', null, true),
};

// DESTINATIONS
const Destinations = {
  create: (data) =>
    request('POST', '/api/destinations', data, true),

  getMy: () =>
    request('GET', '/api/destinations/my', null, true),

  getOne: (id) =>
    request('GET', `/api/destinations/${id}`, null, false),

  update: (id, data) =>
    request('PUT', `/api/destinations/${id}`, data, true),

  delete: (id) =>
    request('DELETE', `/api/destinations/${id}`, null, true),
};

// EXPLORE
const Explore = {
  browse: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search)  q.set('search', params.search);
    if (params.country) q.set('country', params.country);
    if (params.skip)    q.set('skip', params.skip);
    if (params.limit)   q.set('limit', params.limit);
    const qs = q.toString();
    return request('GET', `/api/explore${qs ? '?' + qs : ''}`);
  },

  featured: () =>
    request('GET', '/api/explore/featured'),

  getOne: (id) =>
    request('GET', `/api/destinations/${id}`, null, false),
};

// COMMENTS
const Comments = {
  add: (destId, content) =>
    request('POST', `/api/comments/${destId}`, { content }, true),

  get: (destId) =>
    request('GET', `/api/comments/${destId}`),

  delete: (commentId) =>
    request('DELETE', `/api/comments/${commentId}`, null, true),
};

// LIKES
const Likes = {
  toggle: (destId) =>
    request('POST', `/api/likes/${destId}`, null, true),
};

// PROFILE
const Profile = {
  getMe: () =>
    request('GET', '/api/profile/me', null, true),

  updateMe: (data) =>
    request('PUT', '/api/profile/me', data, true),

  getUser: (username) =>
    request('GET', `/api/profile/${username}`),
};

// TOKEN MANAGEMENT
function getToken()      { return localStorage.getItem('tbl_token'); }
function setToken(t)     { localStorage.setItem('tbl_token', t); }
function removeToken()   { localStorage.removeItem('tbl_token'); localStorage.removeItem('tbl_user'); }
function getCachedUser() { try { return JSON.parse(localStorage.getItem('tbl_user')); } catch { return null; } }
function setCachedUser(u){ localStorage.setItem('tbl_user', JSON.stringify(u)); }
function isLoggedIn()    { return !!getToken(); }

function requireAuth() {
  if (!isLoggedIn()) { window.location.href = '/login.html'; return false; }
  return true;
}

function redirectIfLoggedIn() {
  if (isLoggedIn()) window.location.href = '/dashboard.html';
}