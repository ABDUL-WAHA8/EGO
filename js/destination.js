async function initDestinationPage() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = '/explore.html'; return; }
  await loadDest(id);
  await loadComments(id);
  initCommentForm(id);
}

async function loadDest(id) {
  try {
    const dest = await Explore.getOne(id);
    renderDest(dest);
  } catch (e) {
    document.getElementById('dest-main').innerHTML = `
      <div class="empty-state"><div class="empty-icon">🚫</div>
      <h3>Destination not found</h3><p>${e.message}</p>
      <a href="explore.html" class="btn-accent">← Back to Explore</a></div>`;
  }
}

function renderDest(dest) {
  document.title = dest.place_name + ' — Wanderlist';

  // Hero image
  const hero = document.getElementById('dest-hero-media');
  if (hero) {
    const url = dest.image_url || getPlaceholderImg(dest.place_name, dest.country);
    hero.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover" alt="' + dest.place_name + '" onerror="this.src=\'https://source.unsplash.com/1600x900/?travel\'">';
  }

  // Meta badges
  const meta = document.getElementById('dest-meta');
  if (meta) meta.innerHTML = `
    <span class="loc-tag">📍 ${dest.city ? dest.city + ', ' : ''}${dest.country}</span>
    ${dest.is_visited ? '<span class="badge badge-green">✓ Visited</span>' : '<span class="badge badge-gold">✈ Bucket List</span>'}`;

  setText('dest-title',       dest.place_name);
  setText('dest-description', dest.description || 'No description yet.');

  const notesBlock = document.getElementById('dest-notes-block');
  if (notesBlock) {
    notesBlock.style.display = dest.notes ? 'block' : 'none';
    setText('dest-notes-text', dest.notes || '');
  }

  // Sidebar
  const av = document.getElementById('author-avatar');
  if (av) av.innerHTML = avatarHTML(dest.owner, 'lg');
  setText('author-name',   dest.owner ? dest.owner.username : '');
  setText('author-joined', dest.owner ? 'Joined ' + fmtDate(dest.owner.created_at) : '');
  setText('stat-likes',    dest.likes_count);
  setText('stat-comments', dest.comments_count);
  setText('stat-added',    fmtDate(dest.created_at));

  // Like button
  const likeBtn = document.getElementById('like-btn');
  if (likeBtn) {
    setLikeBtn(likeBtn, dest.is_liked_by_me, dest.likes_count);
    likeBtn.onclick = async () => {
      if (!isLoggedIn()) { Toast.info('Sign in to like'); return; }
      try {
        const r = await Likes.toggle(dest.id);
        setLikeBtn(likeBtn, r.liked, r.likes_count);
        setText('stat-likes', r.likes_count);
      } catch (e) { Toast.error(e.message); }
    };
  }

  // Share
  document.getElementById('share-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(location.href).then(() => Toast.success('Link copied!')).catch(() => Toast.info(location.href));
  });
}

function setLikeBtn(btn, liked, count) {
  btn.className = 'btn-like' + (liked ? ' liked' : '');
  btn.innerHTML = (liked ? '♥' : '♡') + ' ' + (liked ? 'Liked' : 'Like') + ' (' + count + ')';
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── COMMENTS ─────────────────────────────────────────────────────────────────
async function loadComments(destId) {
  const list    = document.getElementById('comments-list');
  const countEl = document.getElementById('comments-count');
  if (!list) return;

  try {
    const comments = await Comments.get(destId);
    if (countEl) countEl.textContent = comments.length;
    setText('stat-comments', comments.length);

    if (!comments.length) {
      list.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;text-align:center">No comments yet. Be the first!</p>';
      return;
    }

    const me = getUser();
    list.innerHTML = comments.map(c => `
      <div class="comment-item">
        ${avatarHTML(c.author, 'md')}
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-user">${c.author ? c.author.username : 'Unknown'}</span>
            <span class="comment-time">${timeAgo(c.created_at)}</span>
            ${me && me.id === c.user_id ? '<button class="btn-del-comment" onclick="delComment(' + c.id + ',' + destId + ')">Delete</button>' : ''}
          </div>
          <p class="comment-text">${escHtml(c.content)}</p>
        </div>
      </div>`).join('');
  } catch (e) {
    list.innerHTML = '<p style="color:var(--text-muted)">Failed to load comments</p>';
  }
}

function initCommentForm(destId) {
  const form    = document.getElementById('comment-form');
  const prompt  = document.getElementById('comment-login-prompt');
  const textarea= document.getElementById('comment-input');
  const btn     = document.getElementById('comment-submit');

  if (!isLoggedIn()) {
    if (form)   form.style.display   = 'none';
    if (prompt) prompt.style.display = 'block';
    return;
  }
  if (prompt) prompt.style.display = 'none';

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = textarea?.value.trim();
    if (!content) return;
    setLoading(btn, true);
    try {
      await Comments.add(destId, content);
      textarea.value = '';
      Toast.success('Comment posted!');
      await loadComments(destId);
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(btn, false);
    }
  });
}

async function delComment(commentId, destId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await Comments.remove(commentId);
    await loadComments(destId);
    Toast.success('Comment deleted');
  } catch (e) { Toast.error(e.message); }
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
