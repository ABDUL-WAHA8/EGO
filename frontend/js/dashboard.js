// ─── DASHBOARD ───────────────────────────────────────────────────────────────
let allDestinations = [];
let currentFilter = 'all';
let editingId = null;

async function initDashboard() {
  if (!requireAuth()) return;

  // Load user info
  const user = getCachedUser();
  if (user) {
    document.getElementById('dash-username').textContent = user.username;
    const greet = getGreeting();
    document.getElementById('dash-greeting').textContent = greet;
  }

  await loadDestinations();
  initAddModal();
  initFilters();
  initSearch();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

async function loadDestinations() {
  const grid = document.getElementById('dest-grid');
  if (!grid) return;

  grid.innerHTML = Array(6).fill(skeletonCardHTML()).join('');

  try {
    allDestinations = await Destinations.getMy();
    updateStats();
    renderGrid(allDestinations);
  } catch (err) {
    Toast.error('Failed to load destinations: ' + err.message);
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <span class="empty-state-icon">⚠️</span>
      <h3>Something went wrong</h3>
      <p>${err.message}</p>
    </div>`;
  }
}

function updateStats() {
  const total = allDestinations.length;
  const visited = allDestinations.filter(d => d.is_visited).length;
  const wishlist = total - visited;
  const countries = new Set(allDestinations.map(d => d.country)).size;

  document.getElementById('stat-total').textContent  = total;
  document.getElementById('stat-visited').textContent = visited;
  document.getElementById('stat-wishlist').textContent = wishlist;
  document.getElementById('stat-countries').textContent = countries;
}

function renderGrid(destinations) {
  const grid = document.getElementById('dest-grid');
  if (!grid) return;

  if (!destinations.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="empty-state-icon">🗺️</span>
        <h3>Your bucket list is empty</h3>
        <p>Start adding destinations you dream of visiting. The world is waiting.</p>
        <button class="btn btn-primary" onclick="openAddModal()">Add First Destination</button>
      </div>`;
    return;
  }

  grid.innerHTML = destinations.map(dest => dashCardHTML(dest)).join('');

  // Bind card click → detail page
  grid.querySelectorAll('.dest-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-menu-btn') || e.target.closest('.card-dropdown')) return;
      window.location.href = `destination.html?id=${card.dataset.id}`;
    });
  });

  // Bind menu buttons
  grid.querySelectorAll('.card-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = btn.nextElementSibling;
      document.querySelectorAll('.card-dropdown').forEach(d => {
        if (d !== dropdown) d.remove();
      });
      if (dropdown) {
        dropdown.remove();
      } else {
        const id = btn.dataset.id;
        const dest = allDestinations.find(d => d.id == id);
        const menu = document.createElement('div');
        menu.className = 'card-dropdown';
        menu.innerHTML = `
          <div class="card-dropdown-item" data-action="edit" data-id="${id}">✏️ Edit</div>
          <div class="card-dropdown-item" data-action="toggle" data-id="${id}">
            ${dest?.is_visited ? '📋 Mark as Unvisited' : '✅ Mark as Visited'}
          </div>
          <div class="card-dropdown-item danger" data-action="delete" data-id="${id}">🗑 Delete</div>
        `;
        btn.parentElement.appendChild(menu);

        menu.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const action = ev.target.dataset.action;
          const destId = ev.target.dataset.id;
          menu.remove();
          if (action === 'edit') openEditModal(destId);
          if (action === 'toggle') toggleVisited(destId);
          if (action === 'delete') confirmDelete(destId);
        });

        // Close on outside click
        setTimeout(() => {
          document.addEventListener('click', () => menu.remove(), { once: true });
        }, 10);
      }
    });
  });
}

function dashCardHTML(dest) {
  const imageBlock = dest.image_url
    ? `<div class="dest-card-image"><img src="${dest.image_url}" alt="${dest.place_name}" loading="lazy" onerror="this.parentElement.innerHTML='<div style=height:200px;display:flex;align-items:center;justify-content:center;font-size:48px>🌍</div>'"></div>`
    : `<div class="dest-card-placeholder" style="height:200px;display:flex;align-items:center;justify-content:center;font-size:48px;background:linear-gradient(135deg,var(--bg-elevated),var(--bg-hover))">🌍</div>`;

  return `
    <div class="dest-card" data-id="${dest.id}" style="position:relative">
      <button class="card-menu-btn" data-id="${dest.id}">⋯</button>
      ${dest.is_visited ? '<span class="visited-stamp">✓ Visited</span>' : ''}
      ${imageBlock}
      <div class="dest-card-body">
        <div class="dest-card-location">
          <span>📍</span>
          ${dest.city ? dest.city + ', ' : ''}${dest.country}
        </div>
        <h3 class="dest-card-title">${dest.place_name}</h3>
        ${dest.description ? `<p class="dest-card-desc">${dest.description}</p>` : ''}
        <div class="dest-card-footer">
          <span class="text-muted text-sm">${timeAgo(dest.created_at)}</span>
          <div style="display:flex;gap:8px">
            <span class="action-btn">♡ ${dest.likes_count}</span>
            <span class="action-btn">💬 ${dest.comments_count}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── FILTERS ──────────────────────────────────────────────────────────────────
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilters();
    });
  });
}

function initSearch() {
  const searchInput = document.getElementById('dest-search');
  if (!searchInput) return;
  searchInput.addEventListener('input', debounce(applyFilters, 250));
}

function applyFilters() {
  const searchVal = (document.getElementById('dest-search')?.value || '').toLowerCase();
  let filtered = [...allDestinations];

  if (currentFilter === 'visited') filtered = filtered.filter(d => d.is_visited);
  if (currentFilter === 'wishlist') filtered = filtered.filter(d => !d.is_visited);

  if (searchVal) {
    filtered = filtered.filter(d =>
      d.place_name.toLowerCase().includes(searchVal) ||
      d.country.toLowerCase().includes(searchVal) ||
      (d.city && d.city.toLowerCase().includes(searchVal))
    );
  }

  renderGrid(filtered);
}

// ─── ADD/EDIT MODAL ───────────────────────────────────────────────────────────
function initAddModal() {
  const form = document.getElementById('dest-form');
  const submitBtn = document.getElementById('dest-submit-btn');

  document.getElementById('add-dest-btn')?.addEventListener('click', openAddModal);
  document.getElementById('modal-close')?.addEventListener('click', () => closeModal('dest-modal'));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const place_name = document.getElementById('place_name').value.trim();
    const country = document.getElementById('country').value.trim();

    if (!place_name) { setFormError('place_name', 'Place name is required'); return; }
    if (!country) { setFormError('country', 'Country is required'); return; }

    const data = {
      place_name,
      country,
      city: document.getElementById('city').value.trim() || null,
      description: document.getElementById('description').value.trim() || null,
      notes: document.getElementById('notes').value.trim() || null,
      image_url: document.getElementById('image_url').value.trim() || null,
      is_visited: document.getElementById('is_visited').checked,
      is_public: document.getElementById('is_public').checked,
    };

    setLoading(submitBtn, true);

    try {
      if (editingId) {
        await Destinations.update(editingId, data);
        Toast.success('Destination updated!');
      } else {
        await Destinations.create(data);
        Toast.success('Destination added to your bucket list! ✈️');
      }
      closeModal('dest-modal');
      await loadDestinations();
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

function openAddModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Add Destination';
  document.getElementById('dest-submit-btn').textContent = 'Add to Bucket List';
  document.getElementById('dest-form')?.reset();
  // Default is_public to checked
  const pub = document.getElementById('is_public');
  if (pub) pub.checked = true;
  openModal('dest-modal');
}

async function openEditModal(id) {
  editingId = id;
  const dest = allDestinations.find(d => d.id == id);
  if (!dest) return;

  document.getElementById('modal-title').textContent = 'Edit Destination';
  document.getElementById('dest-submit-btn').textContent = 'Save Changes';

  document.getElementById('place_name').value = dest.place_name || '';
  document.getElementById('country').value = dest.country || '';
  document.getElementById('city').value = dest.city || '';
  document.getElementById('description').value = dest.description || '';
  document.getElementById('notes').value = dest.notes || '';
  document.getElementById('image_url').value = dest.image_url || '';
  document.getElementById('is_visited').checked = dest.is_visited;
  document.getElementById('is_public').checked = dest.is_public;

  openModal('dest-modal');
}

// ─── TOGGLE VISITED ───────────────────────────────────────────────────────────
async function toggleVisited(id) {
  const dest = allDestinations.find(d => d.id == id);
  if (!dest) return;
  try {
    await Destinations.update(id, { is_visited: !dest.is_visited });
    Toast.success(dest.is_visited ? 'Marked as not yet visited' : '✅ Marked as visited!');
    await loadDestinations();
  } catch (err) {
    Toast.error(err.message);
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
function confirmDelete(id) {
  const dest = allDestinations.find(d => d.id == id);
  if (!confirm(`Delete "${dest?.place_name}"? This cannot be undone.`)) return;
  deleteDestination(id);
}

async function deleteDestination(id) {
  try {
    await Destinations.delete(id);
    Toast.success('Destination removed');
    await loadDestinations();
  } catch (err) {
    Toast.error(err.message);
  }
}
