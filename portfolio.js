/* ==========================================================================
   TechNhieSean Portfolio — Lightweight Vanilla JS Interactivity
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Dark / Light Theme Toggle (localStorage + system preference + sync)
     ------------------------------------------------------------------------ */
  var themeToggle = document.getElementById('theme-toggle');
  var themeLabel = document.getElementById('theme-label');
  var colorSchemeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function applyTheme(theme, persist) {
    var normalized = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', normalized);

    if (themeToggle) {
      var isDark = normalized === 'dark';
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      if (themeLabel) {
        themeLabel.textContent = isDark ? 'Light' : 'Dark';
      }
    }

    if (persist) {
      try {
        localStorage.setItem('portfolio-theme', normalized);
        // Keep Task Parser V3-V5 darkMode preference synchronized
        localStorage.setItem('darkMode', normalized === 'dark' ? '1' : '0');
      } catch (e) {
        // Ignore storage errors in restricted browsing modes
      }
    }
  }

  var initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(initialTheme, false);

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark', true);
    });
  }

  if (colorSchemeQuery && typeof colorSchemeQuery.addEventListener === 'function') {
    colorSchemeQuery.addEventListener('change', function (event) {
      var hasExplicitPref = false;
      try {
        hasExplicitPref = Boolean(localStorage.getItem('portfolio-theme'));
      } catch (e) {
        hasExplicitPref = false;
      }
      if (!hasExplicitPref) {
        applyTheme(event.matches ? 'dark' : 'light', false);
      }
    });
  }

  /* ------------------------------------------------------------------------
     2. Interactive Category Filter Bar
     ------------------------------------------------------------------------ */
  var filterPills = Array.prototype.slice.call(document.querySelectorAll('.filter-pill'));
  var workGroups = Array.prototype.slice.call(document.querySelectorAll('.work-group'));
  var filterItems = Array.prototype.slice.call(document.querySelectorAll('[data-category]'));
  var filterStatus = document.getElementById('filter-status');

  var filterLabels = {
    all: 'all',
    analytics: 'Data Analytics & BI',
    apps: 'Interactive Apps',
    reports: 'Business & Ops Reports'
  };

  function setCategoryFilter(filter) {
    var visibleCount = 0;

    filterPills.forEach(function (pill) {
      var active = pill.getAttribute('data-filter') === filter;
      pill.classList.toggle('is-active', active);
      pill.setAttribute('aria-selected', String(active));
    });

    filterItems.forEach(function (item) {
      var match = filter === 'all' || item.getAttribute('data-category') === filter;
      item.classList.toggle('is-hidden', !match);
      if (match) visibleCount += 1;
    });

    workGroups.forEach(function (group) {
      var groupCat = group.getAttribute('data-group');
      var showGroup = filter === 'all' || groupCat === filter;
      group.classList.toggle('is-hidden', !showGroup);
    });

    if (filterStatus) {
      if (filter === 'all') {
        filterStatus.textContent = 'Showing all ' + visibleCount + ' items';
      } else {
        var label = filterLabels[filter] || filter;
        filterStatus.textContent = 'Showing ' + visibleCount + ' ' + label + (visibleCount === 1 ? ' item' : ' items');
      }
    }
  }

  filterPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var targetFilter = pill.getAttribute('data-filter') || 'all';
      setCategoryFilter(targetFilter);
    });
  });

  /* ------------------------------------------------------------------------
     3. Toast Feedback & Copy-Email Action
     ------------------------------------------------------------------------ */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2600);
  }

  function fallbackCopyText(text) {
    var temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(temp);
    return ok;
  }

  var copyButtons = Array.prototype.slice.call(document.querySelectorAll('.copy-email-trigger'));

  copyButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var email = btn.getAttribute('data-email') || 'technhiesean@gmail.com';
      var labelSpan = btn.querySelector('.copy-btn-text');

      function onCopied() {
        btn.classList.add('is-copied');
        if (labelSpan) labelSpan.textContent = 'Copied!';
        showToast('Email copied to clipboard: ' + email);
        setTimeout(function () {
          btn.classList.remove('is-copied');
          if (labelSpan) labelSpan.textContent = 'Copy Email';
        }, 2000);
      }

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(email).then(onCopied).catch(function () {
          if (fallbackCopyText(email)) onCopied();
          else showToast('Email: ' + email);
        });
      } else if (fallbackCopyText(email)) {
        onCopied();
      } else {
        showToast('Email: ' + email);
      }
    });
  });

  /* ------------------------------------------------------------------------
     4. Mobile Navigation Drawer & Anchor Filter Restoration
     ------------------------------------------------------------------------ */
  var navToggle = document.getElementById('nav-toggle');
  var siteNav = document.getElementById('site-nav');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.site-nav .nav-link'));

  function setMenuOpen(open) {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute('aria-expanded', String(open));
    siteNav.classList.toggle('is-open', open);
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var expanded = navToggle.getAttribute('aria-expanded') === 'true';
      setMenuOpen(!expanded);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && siteNav.classList.contains('is-open')) {
        setMenuOpen(false);
        navToggle.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (!siteNav.classList.contains('is-open')) return;
      if (!siteNav.contains(event.target) && !navToggle.contains(event.target)) {
        setMenuOpen(false);
      }
    });
  }

  // If the user clicks a navbar or footer section link whose group is currently
  // filtered out, automatically restore "All" so the target section is visible.
  var allAnchorLinks = Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]'));
  allAnchorLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      var targetId = (link.getAttribute('href') || '').slice(1);
      if (targetId) {
        var targetEl = document.getElementById(targetId);
        if (targetEl && targetEl.classList.contains('is-hidden')) {
          setCategoryFilter('all');
        }
      }
      setMenuOpen(false);
    });
  });

  /* ------------------------------------------------------------------------
     5. Active Section Scrollspy
     ------------------------------------------------------------------------ */
  if ('IntersectionObserver' in window && navLinks.length > 0) {
    var observedIds = ['projects', 'tools-apps', 'reports-data', 'experience', 'contact'];
    var observedSections = observedIds
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var activeId = entry.target.id;
          navLinks.forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('data-nav-target') === activeId);
          });
        });
      },
      {
        rootMargin: '-25% 0px -60% 0px',
        threshold: 0.05
      }
    );

    observedSections.forEach(function (sec) {
      observer.observe(sec);
    });
  }
})();
