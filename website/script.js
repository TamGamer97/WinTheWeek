(function () {
  'use strict';

  var root = document.documentElement;
  var STORAGE_KEY = 'wtw-theme';

  /* ---------------- Device chrome ----------------
     Screenshots have no status bar / home indicator baked in, so each
     phone image gets wrapped with a reserved-space frame: a notch pill,
     a home-indicator bar, and letterboxed padding that matches the
     screenshot's own background (never cropping or covering real content). */
  (function wrapPhoneImages() {
    var selectors = '.phone > img, .phone-frame > img, .showcase-phone > img';
    document.querySelectorAll(selectors).forEach(function (img) {
      var screen = document.createElement('div');
      screen.className = 'phone-screen';
      var notch = document.createElement('span');
      notch.className = 'phone-notch';
      var home = document.createElement('span');
      home.className = 'phone-home';
      img.parentNode.insertBefore(screen, img);
      screen.appendChild(notch);
      screen.appendChild(img);
      screen.appendChild(home);
    });
  })();

  /* ---------------- Theme ---------------- */
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    document.querySelectorAll('img[data-light]').forEach(function (img) {
      var src = theme === 'dark' ? img.dataset.dark : img.dataset.light;
      if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
    });
    var switchEl = document.getElementById('theme-switch');
    if (switchEl) switchEl.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
  }

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
  }

  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    var preferred = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(preferred);
  })();

  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

  var themeSwitch = document.getElementById('theme-switch');
  if (themeSwitch) themeSwitch.addEventListener('click', toggleTheme);

  /* ---------------- Sticky header shadow ---------------- */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (window.scrollY > 8) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- Mobile nav ---------------- */
  var hamburger = document.getElementById('hamburger');
  var mobileNav = document.getElementById('mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Scroll reveal ---------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------------- Hero parallax ---------------- */
  var heroVisual = document.getElementById('hero-visual');
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (heroVisual && canHover && !reduceMotion) {
    var rect = null;
    heroVisual.addEventListener('mouseenter', function () {
      rect = heroVisual.getBoundingClientRect();
    });
    heroVisual.addEventListener('mousemove', function (e) {
      if (!rect) rect = heroVisual.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      var back = heroVisual.querySelector('.phone-back');
      var front = heroVisual.querySelector('.phone-front');
      if (back) back.style.transform = 'translate(calc(-64px + ' + (px * -14) + 'px), calc(-18px + ' + (py * -10) + 'px)) rotate(-7deg)';
      if (front) front.style.transform = 'translate(calc(58px + ' + (px * 18) + 'px), calc(34px + ' + (py * 12) + 'px)) rotate(6deg)';
    });
    heroVisual.addEventListener('mouseleave', function () {
      var back = heroVisual.querySelector('.phone-back');
      var front = heroVisual.querySelector('.phone-front');
      if (back) back.style.transform = '';
      if (front) front.style.transform = '';
    });
  }

  /* ---------------- Footer year ---------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
