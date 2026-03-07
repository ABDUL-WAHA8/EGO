// ─── DESTINATION DETAIL PAGE ──────────────────────────────────────────────────
async function initDestinationPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { window.location.href = '/explore.html'; return; }

  await loadDestination(id);
  await loadComments(id);
  initCommentForm(id);
}

async function loadDestination(id) {
  try {
    const dest = await Explore.getOne(id);
    renderDestination(dest);
  } catch (err) {
    document.getElementById('dest-main').innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🚫</span>
        <h3>Destination not found</h3>
        <p>${err.message}</p>
        <a href="explore.html" class="btn btn-primary">Back to Explore</a>
      </div>`;
  }
}

function renderDestination(dest) {
  document.title = `${dest.place_name} — Travel Bucket List`;

  // Hero
  const heroEl = document.getElementById('dest-hero-media');
  if (heroEl) {
    if (dest.image_url) {
      heroEl.innerHTML = `<img class="dest-hero-image" src="${dest.image_url}" alt="${dest.place_name}" onerror="this.style.display='none'">`;
    } else {
      heroEl.innerHTML = `<div class="dest-hero-placeholder">🌍</div>`;
    }
  }

  // Meta
  const metaEl = document.getElementById('dest-meta');
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="dest-location-tag">📍 ${dest.city ? dest.city + ', ' : ''}${dest.country}</span>
      ${dest.is_visited ? '<span class="badge badge-green">✓ Visited</span>' : '<span class="badge badge-gold">✈ On Bucket List</span>'}
    `;
  }

  document.getElementById('dest-title').textContent = dest.place_name;

  const descEl = document.getElementById('dest-description');
  if (descEl) {
    descEl.textContent = dest.description || 'No description provided.';
  }

  const notesEl = document.getElementById('dest-notes-block');
  if (notesEl) {
    if (dest.notes) {
      notesEl.style.display = 'block';
      document.getElementById('dest-notes-text').textContent = dest.notes;
    } else {
      notesEl.style.display = 'none';
    }
  }

  // Sidebar author
  document.getElementById('author-avatar').innerHTML = avatarHTML(dest.owner, 'lg');
  document.getElementById('author-name').textContent = dest.owner?.username;
  document.getElementById('author-joined').textContent = 'Joined ' + formatDate(dest.owner?.created_at);

  // Sidebar stats
  document.getElementById('stat-likes').textContent = dest.likes_count;
  document.getElementById('stat-comments').textContent = dest.comments_count;
  document.getElementById('stat-added').textContent = formatDate(dest.created_at);

  // Like button
  const likeBtn = document.getElementById('like-btn');
  if (likeBtn) {
    updateLikeBtn(likeBtn, dest.is_liked_by_me, dest.likes_count);
    likeBtn.addEventListener('click', async () => {
      if (!isLoggedIn()) { Toast.info('Sign in to like destinations'); return; }
      try {
        const result = await Likes.toggle(dest.id);
        updateLikeBtn(likeBtn, result.liked, result.likes_count);
        document.getElementById('stat-likes').textContent = result.likes_count;
      } catch (err) {
        Toast.error(err.message);
      }
    });
  }

  // Share button
  document.getElementById('share-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href);
    Toast.success('Link copied to clipboard!');
  });
}

function updateLikeBtn(btn, liked, count) {
  btn.classList.toggle('btn-primary', liked);
  btn.classList.toggle('btn-secondary', !liked);
  btn.innerHTML = `${liked ? '♥' : '♡'} ${liked ? 'Liked' : 'Like'} (${count})`;
}

// ─── COMMENTS ─────────────────────────────────────────────────────────────────
async function loadComments(destId) {
  const list = document.getElementById('comments-list');
  const countEl = document.getElementById('comments-count');
  if (!list) return;

  try {
    const comments = await Comments.get(destId);
    if (countEl) countEl.textContent = comments.length;
    document.getElementById('stat-comments').textContent = comments.length;

    if (!comments.length) {
      list.innerHTML = `
        <div style="padding:var(--space-8) 0;text-align:center;color:var(--text-muted)">
          <p>No comments yet. Be the first to share a tip!</p>
        </div>`;
      return;
    }

    list.innerHTML = comments.map(c => `
      <div class="comment-item" data-comment-id="${c.id}">
        ${avatarHTML(c.author, 'md')}
        <div class="comment-content-block">
          <div class="comment-header">
            <span class="comment-username">${c.author?.username}</span>
            <span class="comment-date">${timeAgo(c.created_at)}</span>
            ${isLoggedIn() && getCachedUser()?.id === c.user_id
              ? `<button class="btn btn-ghost btn-sm" style="margin-left:auto;font-size:11px;color:var(--red)" onclick="deleteComment(${c.id}, ${destId})">Delete</button>`
              : ''}
          </div>
          <p class="comment-text">${escapeHTML(c.content)}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p style="color:var(--text-muted);font-size:14px">Failed to load comments</p>`;
  }
}

function initCommentForm(destId) {
  const form = document.getElementById('comment-form');
  const textarea = document.getElementById('comment-input');
  const submitBtn = document.getElementById('comment-submit');
  const loginPrompt = document.getElementById('comment-login-prompt');

  if (!isLoggedIn()) {
    if (form) form.style.display = 'none';
    if (loginPrompt) loginPrompt.style.display = 'block';
    return;
  }

  if (loginPrompt) loginPrompt.style.display = 'none';

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = textarea?.value.trim();
    if (!content) return;

    setLoading(submitBtn, true);
    try {
      await Comments.add(destId, content);
      textarea.value = '';
      Toast.success('Comment posted!');
      await loadComments(destId);
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

async function deleteComment(commentId, destId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await Comments.delete(commentId);
    await loadComments(destId);
    Toast.success('Comment deleted');
  } catch (err) {
    Toast.error(err.message);
  }
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
