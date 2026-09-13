/* ==========================================================================
   LAPMS - application shell

   Renders the sidebar, top bar and role-appropriate navigation, then hands the
   page a content element to fill. Navigation is built from the session scope,
   so a role never sees a link to a module it cannot use - but note that the
   real protection is in store.js, not here.
   ========================================================================== */
(function (global) {
  'use strict';

  var el = U.el;

  var NAV = {
    admin: [
      { group: 'School' },
      { id: 'admin-dashboard', label: 'Dashboard', icon: '▤', href: 'admin-dashboard.html' },
      { id: 'admin-learners', label: 'Learners', icon: '☺', href: 'admin-learners.html' },
      { id: 'admin-classes', label: 'Classes & staff', icon: '⌗', href: 'admin-classes.html' },
      { group: 'Oversight' },
      { id: 'reports', label: 'Reports', icon: '↗', href: 'reports.html' },
      { id: 'report-general', label: 'General report', icon: '🖨', href: 'report-general.html' },
      { id: 'notifications', label: 'Notifications', icon: '◉', href: 'notifications.html', badge: true },
      { group: 'Administration' },
      { id: 'admin-people', label: 'People & access', icon: '⚿', href: 'admin-people.html' },
      { id: 'admin-settings', label: 'School settings', icon: '⚙', href: 'admin-settings.html' },
      { id: 'admin-audit', label: 'Audit log', icon: '≡', href: 'admin-audit.html' }
    ],
    teacher: [
      { group: 'Today' },
      { id: 'teacher-dashboard', label: 'Dashboard', icon: '▤', href: 'teacher-dashboard.html' },
      { id: 'teacher-attendance', label: 'Daily register', icon: '✓', href: 'teacher-attendance.html' },
      { id: 'teacher-lessons', label: 'Lesson attendance', icon: '⏱', href: 'teacher-lessons.html' },
      { group: 'My classes' },
      { id: 'teacher-learners', label: 'My learners', icon: '☺', href: 'teacher-learners.html' },
      { id: 'teacher-behaviour', label: 'Behaviour', icon: '★', href: 'teacher-behaviour.html' },
      { id: 'messages', label: 'Parent messages', icon: '✉', href: 'messages.html' },
      { id: 'reports', label: 'Class reports', icon: '↗', href: 'reports.html' },
      { id: 'report-general', label: 'General report', icon: '🖨', href: 'report-general.html' },
      { id: 'notifications', label: 'Notifications', icon: '◉', href: 'notifications.html', badge: true }
    ],
    parent: [
      { group: 'My children' },
      { id: 'parent-dashboard', label: 'Today', icon: '▤', href: 'parent-dashboard.html' },
      { id: 'parent-attendance', label: 'Attendance', icon: '✓', href: 'parent-attendance.html' },
      { id: 'parent-behaviour', label: 'Behaviour', icon: '★', href: 'parent-behaviour.html' },
      { group: 'School' },
      { id: 'messages', label: 'Messages', icon: '✉', href: 'messages.html' },
      { id: 'notifications', label: 'Notifications', icon: '◉', href: 'notifications.html', badge: true },
      { group: 'Account' },
      { id: 'parent-profile', label: 'My details', icon: '⚿', href: 'parent-profile.html' }
    ]
  };

  var ROLE_LABEL = { admin: 'Administrator', teacher: 'Teacher', parent: 'Parent / Guardian' };

  function setTheme(mode) {
    try { localStorage.setItem('lapms.theme', mode); } catch (e) {}
    if (mode === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
  }
  function currentTheme() {
    try { return localStorage.getItem('lapms.theme') || 'light'; } catch (e) { return 'light'; }
  }
  function themeButton() {
    var labels = { system: '◐ System', light: '☀ Light', dark: '☾ Dark' };
    var order = ['light', 'dark', 'system'];
    var btn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', title: 'Change colour theme' });
    function paint() { btn.textContent = labels[currentTheme()]; }
    btn.addEventListener('click', function () {
      var next = order[(order.indexOf(currentTheme()) + 1) % order.length];
      setTheme(next); paint();
    });
    paint();
    return btn;
  }

  /**
   * Mount the shell.
   * @returns {{scope:Object, content:HTMLElement}|null} null if the guard redirected.
   */
  function mount(opts) {
    opts = opts || {};
    var scope = Auth.require(opts.roles);
    if (!scope) return null;

    var d = Store.db();
    var unread = Store.unreadCount(Store.session());
    var items = NAV[scope.role] || [];

    // ---- Sidebar ----
    var nav = el('nav', { class: 'nav', 'aria-label': 'Main' });
    items.forEach(function (it) {
      if (it.group) { nav.appendChild(el('div', { class: 'nav-label', text: it.group })); return; }
      var link = el('a', {
        href: it.href,
        'aria-current': it.id === opts.page ? 'page' : null
      }, [
        el('span', { class: 'nav-icon', 'aria-hidden': 'true', text: it.icon }),
        el('span', { text: it.label }),
        it.badge && unread ? el('span', { class: 'nav-count', text: String(unread) }) : null
      ]);
      nav.appendChild(link);
    });

    var sidebar = el('aside', { class: 'sidebar' }, [
      el('div', { class: 'sidebar-head' }, [
        el('a', { class: 'brand', href: '../index.html' }, [
          el('span', { class: 'brand-mark', 'aria-hidden': 'true', text: 'LA' }),
          el('span', null, [
            el('span', { class: 'brand-name', text: 'LAPMS' }),
            el('span', { class: 'brand-sub', text: d.school.name })
          ])
        ]),
        el('div', { class: 'sidebar-role' }, [
          el('span', { class: 'avatar', 'aria-hidden': 'true', text: U.initials(scope.user.name) }),
          el('span', { class: 'grow' }, [
            el('span', { class: 'sidebar-role-name', text: scope.user.name }),
            el('span', { class: 'sidebar-role-kind', text: ROLE_LABEL[scope.role] })
          ])
        ])
      ]),
      nav,
      el('div', { class: 'sidebar-foot' }, [
        el('div', { class: 'row' }, [themeButton()]),
        el('button', {
          class: 'btn btn-sm btn-block', type: 'button',
          onclick: function () { Auth.logout(); }
        }, 'Sign out')
      ])
    ]);

    // ---- Top bar ----
    var app = el('div', { class: 'app' });
    var toggle = el('button', {
      class: 'btn btn-ghost btn-sm menu-toggle', type: 'button', 'aria-label': 'Open navigation',
      onclick: function () {
        app.classList.toggle('nav-open');
        if (app.classList.contains('nav-open')) {
          var scrim = el('div', { class: 'scrim', onclick: function () { app.classList.remove('nav-open'); scrim.remove(); } });
          app.appendChild(scrim);
        } else {
          var s = app.querySelector('.scrim'); if (s) s.remove();
        }
      }
    }, '☰');

    var topbar = el('header', { class: 'topbar' }, [
      toggle,
      el('div', { class: 'grow' }, [
        el('h1', { text: opts.title || '' }),
        opts.sub ? el('div', { class: 'topbar-sub', text: opts.sub }) : null
      ]),
      opts.actions || null
    ]);

    var content = el('main', { class: 'content', id: 'content' });

    app.appendChild(sidebar);
    app.appendChild(el('div', { class: 'main' }, [topbar, content]));

    document.body.appendChild(el('a', { class: 'skip-link', href: '#content' }, 'Skip to content'));
    document.body.appendChild(app);

    return { scope: scope, content: content, topbar: topbar, app: app };
  }

  /** Shown when a page is reached that the session may not use. */
  function denied(content, message) {
    U.clear(content).appendChild(el('div', { class: 'denied' }, [
      el('div', { class: 'denied-mark', 'aria-hidden': 'true', text: '⚿' }),
      el('h2', { text: 'Not authorised' }),
      el('p', { class: 'secondary', text: message || 'This account does not have access to that information.' }),
      // denied() is only ever reached from inside app/, so link to the sibling page.
      el('a', { class: 'btn', href: Auth.homeFor(Store.scope(Store.session()).role).split('/').pop() }, 'Back to dashboard')
    ]));
  }

  // ---------- Reusable pieces ----------
  function statusBadge(status) {
    if (!status) return el('span', { class: 'badge badge-unmarked' }, [el('span', { class: 'dot' }), 'Not marked']);
    var meta = SEED.STATUSES[status];
    if (!meta) return el('span', { class: 'badge badge-neutral', text: status });
    return el('span', { class: 'badge badge-' + meta.cls }, [
      el('span', { class: 'dot', 'aria-hidden': 'true' }),
      el('span', { 'aria-hidden': 'true', text: meta.icon }),
      el('span', { text: meta.label })
    ]);
  }

  function behaviourBadge(category) {
    var meta = SEED.BEHAVIOUR[category];
    if (!meta) return el('span', { class: 'badge badge-neutral', text: category });
    var cls = meta.rank >= 4 ? 'badge-present' : meta.rank === 3 ? 'badge-neutral'
      : meta.rank === 2 ? 'badge-excused' : 'badge-absent';
    return el('span', { class: 'badge ' + cls }, [
      el('span', { 'aria-hidden': 'true', text: meta.icon }),
      el('span', { text: meta.label })
    ]);
  }

  function learnerLink(learner, sub) {
    return el('a', {
      href: 'learner.html?id=' + encodeURIComponent(learner.id),
      class: 'register-learner', style: 'color:inherit'
    }, [
      el('span', { class: 'avatar', 'aria-hidden': 'true', text: U.initials(learner.name) }),
      el('span', { style: 'min-width:0' }, [
        el('div', { class: 'register-name', text: learner.name }),
        el('div', { class: 'register-meta', text: sub || (learner.admissionNo + ' · ' + Store.classLabel(learner.classId)) })
      ])
    ]);
  }

  function card(title, sub, body, headExtra) {
    return el('section', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h2', { style: 'font-size:1rem', text: title }), headExtra || null]),
      sub ? el('p', { class: 'card-sub', text: sub }) : el('div', { style: 'height:12px' }),
      body
    ]);
  }

  function emptyState(text) { return el('div', { class: 'empty', text: text }); }

  /** A banner explaining which school day the page is showing. */
  function dayBanner(date) {
    var isToday = date === U.today();
    if (isToday) return null;
    return el('div', { class: 'notice notice-accent' }, [
      el('span', { class: 'notice-icon', 'aria-hidden': 'true', text: 'ⓘ' }),
      el('span', { text: U.isWeekend(U.today())
        ? 'Today is not a school day. Showing the most recent school day, ' + U.longDate(date) + '.'
        : 'Showing ' + U.longDate(date) + '.' })
    ]);
  }

  global.Shell = {
    mount: mount, denied: denied,
    statusBadge: statusBadge, behaviourBadge: behaviourBadge,
    learnerLink: learnerLink, card: card, emptyState: emptyState,
    dayBanner: dayBanner, setTheme: setTheme, ROLE_LABEL: ROLE_LABEL
  };
})(window);
