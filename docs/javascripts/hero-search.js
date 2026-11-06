
/* Borealis Guides: shared scoped search */

(() => {
  const source = document.currentScript?.src;
  if (!source) return;

  const base = new URL('../', source);
  const indexURL = new URL('search.json', base);

  const names = {
    'user-guide': ['User Guide', "Guide d’utilisation"],
    'admin-guide': ['Admin Guide', "Guide d’administration"],
    'api-guide': ['API Guide', 'Guide API']
  };

  const scopes = new Set(Object.keys(names));
  const fr = () =>
    document.documentElement.lang.toLowerCase().startsWith('fr');

  const tr = (en, french) => fr() ? french : en;

  const tidy = (s) =>
    String(s || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const norm = (s) =>
    tidy(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  let query = '';
  let indexCache;
  let timer;
  let revision = 0;
  let backdrop;
  let previousFocus;

  function index() {
    return indexCache ||= fetch(indexURL)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Search index HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((r) => r.items || [])
      .catch((e) => {
        indexCache = null;
        throw e;
      });
  }

  function pathFor(item) {
    if (!item.location) return null;

    try {
      const u = new URL(item.location, base);

      if (
        u.origin !== base.origin ||
        !u.pathname.startsWith(base.pathname)
      ) return null;

      const guide = u.pathname
        .slice(base.pathname.length)
        .split('/')[0];

      return names[guide]
        ? { url: u.href, guide }
        : null;

    } catch {
      return null;
    }
  }

  function matches(items) {
    const words = norm(query).split(/\s+/).filter(Boolean);

    if (!words.length || !scopes.size) return [];

    return items.flatMap((item) => {
      const route = pathFor(item);

      if (!route || !scopes.has(route.guide)) return [];

      const title = norm(item.title);
      const path = norm((item.path || []).join(' '));
      const content = norm(item.text);

      if (!words.every((w) =>
        title.includes(w) ||
        path.includes(w) ||
        content.includes(w)
      )) return [];

      const score = words.reduce((s, w) => s +
        (title.startsWith(w) ? 12 : title.includes(w) ? 8 : 0) +
        (path.includes(w) ? 3 : 0) +
        (content.includes(w) ? 1 : 0), 0);

      return [{ item, ...route, score }];

    }).sort((a, b) => b.score - a.score).slice(0, 8);
  }

  function widgets() {
    return [...document.querySelectorAll(
      '[data-borealis-search]'
    )];
  }

  function setup(host) {
    if (host.dataset.searchReady) return;

    const input = host.querySelector('.scope-search-input');
    if (!input) return;

    host.dataset.searchReady = '1';
    input.value = query;

    input.placeholder = tr(
      'Search documentation...',
      'Rechercher dans les guides...'
    );

    const filters = document.createElement('div');
    filters.className = 'scope-search-filters';
    filters.setAttribute('role', 'group');

    const heading = document.createElement('strong');
    heading.textContent = tr(
      'Search within:',
      'Rechercher dans :'
    );
    filters.append(heading);

    for (const [key, labels] of Object.entries(names)) {
      const label = document.createElement('label');
      label.className = 'scope-search-choice';

      const box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'scope-search-checkbox';
      box.value = key;
      box.checked = scopes.has(key);

      const span = document.createElement('span');
      span.textContent = labels[fr() ? 1 : 0];

      label.append(box, span);
      filters.append(label);
    }

    const results = document.createElement('div');
    results.className = 'scope-search-results';
    results.hidden = true;

    host.append(filters, results);
  }

  function paint(host, items, error) {
    const panel = host.querySelector('.scope-search-results');
    if (!panel) return;

    panel.replaceChildren();

    if (!query.trim()) {
      panel.hidden = true;
      return;
    }

    const message = error || (!scopes.size
      ? tr(
          'Select at least one guide.',
          'Sélectionnez au moins un guide.'
        )
      : !items.length
        ? tr('No results found.', 'Aucun résultat.')
        : ''
    );

    if (message) {
      const p = document.createElement('p');
      p.className = 'scope-search-empty';
      p.textContent = message;
      panel.append(p);

    } else {
      for (const { item, url, guide } of items) {
        const a = document.createElement('a');
        a.className = 'scope-search-result';
        a.href = url;

        const title = document.createElement('strong');
        title.textContent = item.title;

        const location = document.createElement('small');
        location.textContent =
          names[guide][fr() ? 1 : 0] +
          ' · ' +
          (item.path || []).join(' › ');

        const summary = document.createElement('span');
        summary.textContent = tidy(item.text).slice(0, 140);

        a.append(title, location, summary);
        panel.append(a);
      }
    }

    panel.hidden = false;
  }

  async function refresh() {
    const id = ++revision;

    if (!query.trim() || !scopes.size) {
      widgets().forEach((w) => paint(w, []));
      return;
    }

    try {
      const items = await index();

      if (id === revision) {
        widgets().forEach((w) =>
          paint(w, matches(items))
        );
      }

    } catch (e) {
      console.error('Borealis search:', e);

      if (id === revision) {
        widgets().forEach((w) => paint(
          w, [],
          tr('Search unavailable.', 'Recherche indisponible.')
        ));
      }
    }
  }

  function dialog() {
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.className = 'scope-search-backdrop';
    backdrop.hidden = true;

    backdrop.innerHTML = `
      <div class="scope-search-dialog"
           data-borealis-search="dialog"
           role="dialog"
           aria-modal="true">
        <div class="scope-search-dialog-top">
          <span aria-hidden="true">⌕</span>
          <input class="scope-search-input"
                 type="search"
                 autocomplete="off">
          <button class="scope-search-close"
        type="button"
        aria-label="${tr('Close', 'Fermer')}">
  ${tr('Close', 'Fermer')}
</button>
        </div>
      </div>`;

    document.body.append(backdrop);

    setup(backdrop.querySelector(
      '[data-borealis-search="dialog"]'
    ));

backdrop.addEventListener('click', (e) => {
  if (e.target.closest('.scope-search-result')) {
    close(false, true);
    return;
  }

  if (
    e.target === backdrop ||
    e.target.closest('.scope-search-close')
  ) close();
});

    return backdrop;
  }

 function resetSearch() {
  clearTimeout(timer);
  ++revision;
  query = '';

  document.querySelectorAll('.scope-search-input')
    .forEach((input) => {
      input.value = '';
    });

  widgets().forEach((host) => {
    const panel = host.querySelector('.scope-search-results');

    if (panel) {
      panel.hidden = true;
      panel.replaceChildren();
    }
  });
}

function open() {
  const element = dialog();

  if (element.hidden) {
    previousFocus = document.activeElement;
  }

  resetSearch();

  element.hidden = false;
  document.body.classList.add('scope-search-open');
  element.querySelector('.scope-search-input').focus();
}

function close(restoreFocus = true, deferReset = false) {
  if (!backdrop) return;

  backdrop.hidden = true;
  document.body.classList.remove('scope-search-open');

  if (deferReset) {
    setTimeout(resetSearch, 0);
  } else {
    resetSearch();
  }

  if (restoreFocus && previousFocus?.isConnected) {
    previousFocus.focus();
  }

  previousFocus = null;
}

  function setupHome() {
    document.querySelectorAll(
      '[data-borealis-search="hero"]'
    ).forEach(setup);
  }

  /* Share search text between homepage and header */

  document.addEventListener('input', (e) => {
    if (!e.target.matches?.('.scope-search-input')) return;

    query = e.target.value;

    document.querySelectorAll('.scope-search-input')
      .forEach((input) => {
        if (input !== e.target) input.value = query;
      });

    clearTimeout(timer);
    timer = setTimeout(refresh, 120);
  });

  /* Share selected guide scopes */

  document.addEventListener('change', (e) => {
    if (!e.target.matches?.('.scope-search-checkbox')) return;

    if (e.target.checked) scopes.add(e.target.value);
    else scopes.delete(e.target.value);

    document.querySelectorAll('.scope-search-checkbox')
      .forEach((box) => {
        box.checked = scopes.has(box.value);
      });

    refresh();
  });

  /* Replace native header search with scoped search */

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest?.(
      '.md-header .md-search__button, ' +
      '.md-header label[for="__search"]'
    );

    if (!trigger) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    open();
  }, true);

  document.addEventListener('keydown', (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === 'k'
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      open();
      return;
    }

    if (e.key === 'Escape') {
      if (backdrop && !backdrop.hidden) {
        close();
      } else {
        document.querySelectorAll(
          '[data-borealis-search="hero"] .scope-search-results'
        ).forEach((panel) => {
          panel.hidden = true;
        });
      }
    }

    if (!e.target.matches?.('.scope-search-input')) return;

    const first = e.target
      .closest('[data-borealis-search]')
      ?.querySelector('.scope-search-result');

    if (
      first &&
      (e.key === 'Enter' || e.key === 'ArrowDown')
    ) {
      e.preventDefault();

      if (e.key === 'Enter') {
        window.location.assign(first.href);
      } else {
        first.focus();
      }
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupHome);
  } else {
    setupHome();
  }

  if (window.document$?.subscribe) {
    window.document$.subscribe(setupHome);
  }
})();
