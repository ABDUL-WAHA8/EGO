const API = '';

async function req(method, url, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('wl_token');
    if (!token) throw new Error('Not logged in');
    headers['Authorization'] = 'Bearer ' + token;
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail || data.message || 'HTTP ' + res.status;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

const Auth = {
  register: (email, username, password) => req('POST', '/api/auth/register', { email, username, password }),
  login:    (email, password)           => req('POST', '/api/auth/login',    { email, password }),
  me:       ()                          => req('GET',  '/api/auth/me', null, true),
};

const Destinations = {
  create:  (data) => req('POST',   '/api/destinations',       data, true),
  getMy:   ()     => req('GET',    '/api/destinations/my',    null, true),
  getOne:  (id)   => req('GET',    '/api/destinations/' + id, null, false),
  update:  (id, data) => req('PUT',    '/api/destinations/' + id, data, true),
  remove:  (id)   => req('DELETE', '/api/destinations/' + id, null, true),
};

const Explore = {
  browse: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search)  q.set('search',  params.search);
    if (params.country) q.set('country', params.country);
    if (params.skip)    q.set('skip',    params.skip);
    if (params.limit)   q.set('limit',   params.limit);
    const qs = q.toString();
    return req('GET', '/api/explore' + (qs ? '?' + qs : ''));
  },
  featured: () => req('GET', '/api/explore/featured'),
  getOne:   (id) => req('GET', '/api/destinations/' + id, null, false),
};

const Comments = {
  get:    (destId)    => req('GET',    '/api/comments/' + destId, null, false),
  add:    (destId, content) => req('POST',   '/api/comments/' + destId, { content }, true),
  remove: (commentId) => req('DELETE', '/api/comments/' + commentId, null, true),
};

const Likes = {
  toggle: (destId) => req('POST', '/api/likes/' + destId, null, true),
};

const Profile = {
  getMe:    ()     => req('GET', '/api/profile/me',       null, true),
  updateMe: (data) => req('PUT', '/api/profile/me',       data, true),
  getUser:  (u)    => req('GET', '/api/profile/' + u,     null, false),
};

// Token helpers
function getToken()       { return localStorage.getItem('wl_token'); }
function setToken(t)      { localStorage.setItem('wl_token', t); }
function removeToken()    { localStorage.removeItem('wl_token'); localStorage.removeItem('wl_user'); }
function getUser()        { try { return JSON.parse(localStorage.getItem('wl_user')); } catch { return null; } }
function saveUser(u)      { localStorage.setItem('wl_user', JSON.stringify(u)); }
function isLoggedIn()     { return !!getToken(); }
function requireAuth()    { if (!isLoggedIn()) { location.href = '/login.html'; return false; } return true; }
function redirectIfAuth() { if (isLoggedIn()) location.href = '/dashboard.html'; }
