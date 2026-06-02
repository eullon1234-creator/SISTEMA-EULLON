(function () {
  const MANIFEST_URL = 'apps.json';
  const GITHUB_API = 'https://api.github.com';

  let apps = [];
  let filteredApps = [];
  let listView = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const el = {
    appGrid: $('#appGrid'),
    loading: $('#loading'),
    error: $('#error'),
    empty: $('#empty'),
    searchInput: $('#searchInput'),
    categoryFilter: $('#categoryFilter'),
    toggleLayout: $('#toggleLayout'),
  };

  async function loadManifest() {
    const res = await fetch(MANIFEST_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error(`Erro ao carregar manifest (${res.status})`);
    return res.json();
  }

  async function fetchLatestRelease(repo) {
    try {
      const res = await fetch(`${GITHUB_API}/repos/${repo}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  function getCategories(apps) {
    const cats = [...new Set(apps.map(a => a.category).filter(Boolean))];
    cats.sort();
    return cats;
  }

  function populateCategories(categories) {
    el.categoryFilter.innerHTML = '<option value="all">Todas as categorias</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      el.categoryFilter.appendChild(opt);
    });
  }

  function filterApps() {
    const query = el.searchInput.value.toLowerCase().trim();
    const category = el.categoryFilter.value;

    filteredApps = apps.filter(app => {
      if (category !== 'all' && app.category !== category) return false;
      if (query) {
        const searchText = `${app.name} ${app.description} ${app.category}`.toLowerCase();
        if (!searchText.includes(query)) return false;
      }
      return true;
    });

    render();
  }

  function render() {
    if (filteredApps.length === 0) {
      el.empty.classList.remove('hidden');
      el.appGrid.classList.add('hidden');
      return;
    }

    el.empty.classList.add('hidden');
    el.appGrid.classList.remove('hidden');

    el.appGrid.className = `app-grid${listView ? ' list-view' : ''}`;
    el.appGrid.innerHTML = filteredApps.map(app => {
      const releaseUrl = app.release_tag
        ? `https://github.com/eullon1234-creator/SISTEMA-EULLON/releases/tag/${app.release_tag}`
        : null;

      return `
        <div class="app-card" data-id="${app.id}">
          <div class="app-card-icon">${app.icon || '📱'}</div>
          <div class="app-card-body">
            <div class="app-card-title" title="${app.name}">${app.name}</div>
            <div class="app-card-desc">${app.description || ''}</div>
            ${app.category ? `<div class="app-card-category">📂 ${app.category}</div>` : ''}
          </div>
          <div class="app-card-actions">
            <a href="${app.url}" target="_blank" rel="noopener" class="btn btn-primary">Abrir</a>
            ${releaseUrl ? `<a href="${releaseUrl}" target="_blank" rel="noopener" class="btn btn-release">⬇ Release</a>` : ''}
            <button class="btn btn-copy" data-url="${app.url}" title="Copiar link">🔗</button>
          </div>
        </div>
      `;
    }).join('');

    el.appGrid.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(btn.dataset.url);
          const orig = btn.textContent;
          btn.textContent = '✅';
          setTimeout(() => btn.textContent = orig, 1500);
        } catch {
          // Fallback
          const ta = document.createElement('textarea');
          ta.value = btn.dataset.url;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          const orig = btn.textContent;
          btn.textContent = '✅';
          setTimeout(() => btn.textContent = orig, 1500);
        }
      });
    });

    el.appGrid.querySelectorAll('.app-card').forEach(card => {
      const link = card.querySelector('.btn-primary');
      if (link) {
        card.addEventListener('click', (e) => {
          if (e.target.closest('a, button')) return;
          link.click();
        });
      }
    });
  }

  function showError(msg) {
    el.loading.classList.add('hidden');
    el.error.textContent = msg;
    el.error.classList.remove('hidden');
    el.appGrid.classList.add('hidden');
    el.empty.classList.add('hidden');
  }

  async function init() {
    try {
      el.loading.classList.remove('hidden');
      el.error.classList.add('hidden');
      el.appGrid.classList.add('hidden');
      el.empty.classList.add('hidden');

      const manifest = await loadManifest();
      apps = manifest.apps || [];

      if (apps.length === 0) {
        showError('Nenhum app cadastrado no manifesto.');
        return;
      }

      const categories = getCategories(apps);
      populateCategories(categories);

      filteredApps = [...apps];
      render();

      el.loading.classList.add('hidden');

      // Fetch latest release info
      fetchLatestRelease(manifest.github_repo).then(release => {
        if (release) {
          const badge = document.createElement('div');
          badge.className = 'release-badge';
          badge.innerHTML = `📦 Último release: <a href="${release.html_url}" target="_blank" rel="noopener">${release.tag_name}</a>`;
          const headerActions = document.querySelector('.header-content');
          if (headerActions) {
            headerActions.appendChild(badge);
          }
        }
      }).catch(() => {});

    } catch (err) {
      showError(err.message || 'Erro ao carregar os apps.');
    }
  }

  // Events
  el.searchInput.addEventListener('input', filterApps);
  el.categoryFilter.addEventListener('change', filterApps);

  el.toggleLayout.addEventListener('click', (e) => {
    e.preventDefault();
    listView = !listView;
    el.toggleLayout.textContent = listView ? 'Visualizar em grade' : 'Alternar visualização';
    render();
  });

  init();
})();
