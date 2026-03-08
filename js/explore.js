let expSkip = 0, expHasMore = true, expSearch = '', expCountry = '';
const EXP_LIMIT = 20;

async function initExplorePage() {
  await loadExplore(true);
  initExploreSearch();
  initExploreFilters();
  document.getElementById('load-more-btn')?.addEventListener('click', async (e) => {
    setLoading(e.currentTarget, true);
    await loadExplore(false);
    setLoading(e.currentTarget, false);
  });
}

async function loadExplore(reset) {
  if (reset) { expSkip = 0; expHasMore = true; }
  const grid    = document.getElementById('explore-grid');
  const countEl = document.getElementById('results-count');
  if (!grid) return;

  if (reset) grid.innerHTML = Array(6).fill(skeletonCard()).join('');

  try {
    const results = await Explore.browse({ search: expSearch, country: expCountry, skip: expSkip, limit: EXP_LIMIT });
    if (reset) grid.innerHTML = '';

    if (!results.length && reset) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>No destinations found</h3><p>Try a different search or filter</p></div>';
      if (countEl) countEl.textContent = '';
      return;
    }

    results.forEach(dest => {
      const el = document.createElement('div');
      el.innerHTML = destCardHTML(dest);
      const card = el.firstElementChild;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.like-btn')) return;
        location.href = 'destination.html?id=' + dest.id;
      });

      const likeBtn = card.querySelector('.like-btn');
      if (likeBtn) {
        likeBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!isLoggedIn()) { Toast.info('Sign in to like destinations'); return; }
          try {
            const r = await Likes.toggle(dest.id);
            dest.is_liked_by_me = r.liked;
            dest.likes_count    = r.likes_count;
            likeBtn.className   = 'like-btn' + (r.liked ? ' liked' : '');
            likeBtn.innerHTML   = (r.liked ? '♥' : '♡') + ' <span>' + r.likes_count + '</span>';
          } catch (err) { Toast.error(err.message); }
        });
      }

      grid.appendChild(card);
    });

    expSkip += results.length;
    expHasMore = results.length === EXP_LIMIT;
    const lmBtn = document.getElementById('load-more-btn');
    if (lmBtn) lmBtn.style.display = expHasMore ? 'inline-flex' : 'none';
    if (countEl && reset) countEl.innerHTML = '<strong>' + results.length + '</strong> destinations found';

  } catch (err) {
    if (reset) grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><p>' + err.message + '</p></div>';
    else Toast.error(err.message);
  }
}

function initExploreSearch() {
  const input = document.getElementById('explore-search');
  if (!input) return;
  input.addEventListener('input', debounce(() => {
    expSearch = input.value.trim();
    loadExplore(true);
  }, 400));
}

function initExploreFilters() {
  document.querySelectorAll('.exp-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.exp-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      expCountry = btn.dataset.country || '';
      loadExplore(true);
    });
  });
}
