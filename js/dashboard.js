let allDests = [];
let editId   = null;
let filter   = 'all';

async function initDashboard() {
  if (!requireAuth()) return;

  const user = getUser();
  if (user) {
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const el = document.getElementById('dash-greeting');
    if (el) el.textContent = greet + ', ' + user.username + ' ✈';
  }

  await loadMyDests();
  initAddModal();
  initFilters();
  initSearch();
}

async function loadMyDests() {
  const grid = document.getElementById('dest-grid');
  if (!grid) return;
  grid.innerHTML = Array(4).fill(skeletonCard()).join('');

  try {
    allDests = await Destinations.getMy();
    updateStats();
    renderGrid(filter);
  } catch (e) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><p>' + e.message + '</p></div>';
  }
}

function updateStats() {
  const visited   = allDests.filter(d => d.is_visited).length;
  const countries = new Set(allDests.map(d => d.country)).size;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-total',     allDests.length);
  set('stat-visited',   visited);
  set('stat-wishlist',  allDests.length - visited);
  set('stat-countries', countries);
}

function renderGrid(f) {
  const grid = document.getElementById('dest-grid');
  if (!grid) return;
  const search = (document.getElementById('dest-search')?.value || '').toLowerCase();

  let list = [...allDests];
  if (f === 'visited')  list = list.filter(d => d.is_visited);
  if (f === 'wishlist') list = list.filter(d => !d.is_visited);
  if (search) list = list.filter(d =>
    d.place_name.toLowerCase().includes(search) ||
    d.country.toLowerCase().includes(search) ||
    (d.city && d.city.toLowerCase().includes(search))
  );

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🗺️</div><h3>Nothing here yet</h3><p>Add your first destination!</p><button class="btn-accent" onclick="openAddModal()">+ Add Destination</button></div>';
    return;
  }

  grid.innerHTML = list.map(dest => {
    const img = dest.image_url || getPlaceholderImg(dest.place_name, dest.country);
    return `
      <div class="dest-card" data-id="${dest.id}" onclick="goToDetail(event, ${dest.id})">
        <div class="dest-card-img-wrap">
          <img src="${img}" loading="lazy" alt="${dest.place_name}" onerror="this.src='https://source.unsplash.com/800x500/?travel'">
          ${dest.is_visited ? '<span class="visited-badge">✓ Visited</span>' : ''}
          <div class="card-menu-wrap">
            <button class="card-menu-btn" onclick="toggleMenu(event, ${dest.id})">⋯</button>
          </div>
        </div>
        <div class="dest-card-body">
          <div class="dest-card-loc">📍 ${dest.city ? dest.city + ', ' : ''}${dest.country}</div>
          <h3 class="dest-card-title">${dest.place_name}</h3>
          ${dest.description ? '<p class="dest-card-desc">' + dest.description.slice(0, 90) + (dest.description.length > 90 ? '…' : '') + '</p>' : ''}
          <div class="dest-card-footer">
            <span class="text-muted">${timeAgo(dest.created_at)}</span>
            <div style="display:flex;gap:8px">
              <span class="pill">♡ ${dest.likes_count}</span>
              <span class="pill">💬 ${dest.comments_count}</span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function goToDetail(e, id) {
  if (e.target.closest('.card-menu-btn') || e.target.closest('.card-dropdown')) return;
  location.href = 'destination.html?id=' + id;
}

function toggleMenu(e, id) {
  e.stopPropagation();
  document.querySelectorAll('.card-dropdown').forEach(d => d.remove());
  const btn  = e.currentTarget;
  const dest = allDests.find(d => d.id == id);
  const menu = document.createElement('div');
  menu.className = 'card-dropdown';
  menu.innerHTML = `
    <div class="cd-item" onclick="openEditModal(${id})">✏️ Edit</div>
    <div class="cd-item" onclick="toggleVisited(${id})">${dest.is_visited ? '📋 Mark unvisited' : '✅ Mark visited'}</div>
    <div class="cd-item cd-danger" onclick="doDelete(${id})">🗑 Delete</div>`;
  btn.parentElement.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 10);
}

function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      renderGrid(filter);
    });
  });
}

function initSearch() {
  document.getElementById('dest-search')?.addEventListener('input', debounce(() => renderGrid(filter), 250));
}

// ── ADD / EDIT MODAL ─────────────────────────────────────────────────────────
function initAddModal() {
  document.getElementById('add-dest-btn')?.addEventListener('click', openAddModal);
  document.getElementById('modal-close')?.addEventListener('click', () => closeModal('dest-modal'));

  document.getElementById('dest-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('dest-submit-btn');
    const data = {
      place_name:  document.getElementById('place_name').value.trim(),
      country:     document.getElementById('country').value.trim(),
      city:        document.getElementById('city').value.trim() || null,
      description: document.getElementById('description').value.trim() || null,
      notes:       document.getElementById('notes').value.trim() || null,
      image_url:   document.getElementById('image_url').value.trim() || null,
      is_visited:  document.getElementById('is_visited').checked,
      is_public:   document.getElementById('is_public').checked,
    };
    if (!data.place_name) { setFieldError('place_name', 'Required'); return; }
    if (!data.country)    { setFieldError('country',    'Required'); return; }

    setLoading(btn, true);
    try {
      if (editId) {
        await Destinations.update(editId, data);
        Toast.success('Destination updated!');
      } else {
        await Destinations.create(data);
        Toast.success('Added to your bucket list! ✈️');
      }
      closeModal('dest-modal');
      await loadMyDests();
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(btn, false);
    }
  });
}

function openAddModal() {
  editId = null;
  document.getElementById('modal-title').textContent = 'Add Destination';
  document.getElementById('dest-submit-btn').textContent = 'Add to Bucket List';
  document.getElementById('dest-form').reset();
  const pub = document.getElementById('is_public');
  if (pub) pub.checked = true;
  openModal('dest-modal');
}

function openEditModal(id) {
  editId = id;
  const dest = allDests.find(d => d.id == id);
  if (!dest) return;
  document.getElementById('modal-title').textContent = 'Edit Destination';
  document.getElementById('dest-submit-btn').textContent = 'Save Changes';
  document.getElementById('place_name').value  = dest.place_name || '';
  document.getElementById('country').value     = dest.country    || '';
  document.getElementById('city').value        = dest.city       || '';
  document.getElementById('description').value = dest.description|| '';
  document.getElementById('notes').value       = dest.notes      || '';
  document.getElementById('image_url').value   = dest.image_url  || '';
  document.getElementById('is_visited').checked= dest.is_visited;
  document.getElementById('is_public').checked = dest.is_public;
  openModal('dest-modal');
}

async function toggleVisited(id) {
  const dest = allDests.find(d => d.id == id);
  if (!dest) return;
  try {
    await Destinations.update(id, { is_visited: !dest.is_visited });
    Toast.success(dest.is_visited ? 'Marked as not yet visited' : '✅ Marked as visited!');
    await loadMyDests();
  } catch (e) { Toast.error(e.message); }
}

async function doDelete(id) {
  const dest = allDests.find(d => d.id == id);
  if (!confirm('Delete "' + (dest ? dest.place_name : 'this destination') + '"?')) return;
  try {
    await Destinations.remove(id);
    Toast.success('Destination removed');
    await loadMyDests();
  } catch (e) { Toast.error(e.message); }
}
