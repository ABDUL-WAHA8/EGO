// ─── EXPLORE PAGE ─────────────────────────────────────────────────────────────
let exploreSkip = 0;
const EXPLORE_LIMIT = 20;
let hasMore = true;
let currentSearch = '';
let currentCountry = '';

async function initExplorePage() {
  await loadDestinations_explore();
  initSearch_explore();
  initFilters_explore();
  initLoadMore();
}

async function loadDestinations_explore(reset = true) {
  if (reset) {
    exploreSkip = 0;
    hasMore = true;
  }

  const grid = document.getElementById('explore-grid');
  const countEl = document.getElementById('results-count');

  if (reset) {
    grid.innerHTML = Array(6).fill(skeletonCardHTML()).join('');
  }

  try {
    const results = await Explore.browse({
      search: currentSearch,
      country: currentCountry,
      skip: exploreSkip,
      limit: EXPLORE_LIMIT,
    });

    if (reset) grid.innerHTML = '';

    if (!results.length && reset) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <span class="empty-state-icon">🔍</span>
          <h3>No destinations found</h3>
          <p>Try a different search term or country filter.</p>
        </div>`;
      if (countEl) countEl.innerHTML = '';
      return;
    }

    results.forEach(dest => {
      const el = document.createElement('div');
      el.innerHTML = destCardHTML(dest);
      const card = el.firstElementChild;

      // Navigate to detail
      card.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return;
        window.location.href = `destination.html?id=${dest.id}`;
      });

      // Like button
      const likeBtn = card.querySelector('.like-btn');
      likeBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!isLoggedIn()) { Toast.info('Sign in to like destinations'); return; }
        try {
          const result = await Likes.toggle(dest.id);
          dest.is_liked_by_me = result.liked;
          dest.likes_count = result.likes_count;
          likeBtn.classList.toggle('liked', result.liked);
          likeBtn.innerHTML = `${result.liked ? '♥' : '♡'} <span class="like-count">${result.likes_count}</span>`;
        } catch (err) {
          Toast.error(err.message);
        }
      });

      grid.appendChild(card);
    });

    exploreSkip += results.length;
    hasMore = results.length === EXPLORE_LIMIT;

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';

    if (countEl && reset) {
      countEl.innerHTML = `Showing <strong>${results.length}</strong> destinations`;
    }
  } catch (err) {
    if (reset) grid.innerHTML = '';
    Toast.error('Failed to load destinations: ' + err.message);
  }
}

function initSearch_explore() {
  const input = document.getElementById('explore-search');
  if (!input) return;
  input.addEventListener('input', debounce(async () => {
    currentSearch = input.value.trim();
    await loadDestinations_explore(true);
  }, 400));
}

function initFilters_explore() {
  document.querySelectorAll('.explore-filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.explore-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCountry = btn.dataset.country || '';
      await loadDestinations_explore(true);
    });
  });
}

function initLoadMore() {
  const btn = document.getElementById('load-more-btn');
  btn?.addEventListener('click', async () => {
    setLoading(btn, true);
    await loadDestinations_explore(false);
    setLoading(btn, false);
  });
}
