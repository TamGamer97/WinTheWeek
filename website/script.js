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

  /* ---------------- Demo video ---------------- */
  (function () {
    var frame = document.getElementById('watch-frame');
    var video = document.getElementById('promo-video');
    var playBtn = document.getElementById('watch-play');
    var muteBtn = document.getElementById('watch-mute');
    var seek = document.getElementById('watch-seek');
    var timeEl = document.getElementById('watch-time');
    if (!frame || !video || !playBtn || !muteBtn || !seek || !timeEl) return;

    function setPaused(paused) {
      frame.classList.toggle('is-paused', paused);
      playBtn.setAttribute('aria-label', paused ? 'Play video' : 'Pause video');
    }
    function setMuted(muted) {
      video.muted = muted;
      frame.classList.toggle('is-unmuted', !muted);
      muteBtn.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
    }
    function togglePlay() {
      if (video.paused) video.play().catch(function () {});
      else video.pause();
    }

    function formatTime(seconds) {
      if (!isFinite(seconds) || seconds < 0) seconds = 0;
      var total = Math.floor(seconds);
      var m = Math.floor(total / 60);
      var s = total % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // Dragging the slider fires 'input' continuously; that same drag also
    // moves currentTime, which would otherwise fire 'timeupdate' and fight
    // the user for control of the thumb mid-drag — this flag lets the seek
    // handler suppress timeupdate's slider/progress writes while a drag is
    // in flight, while still letting timeupdate keep the time text live.
    var scrubbing = false;

    function updateFromTime() {
      var duration = video.duration;
      var current = video.currentTime;
      var pct = duration > 0 && isFinite(duration) ? (current / duration) * 100 : 0;
      if (!scrubbing) {
        seek.value = String(Math.round(pct * 10));
        seek.style.setProperty('--watch-progress', pct + '%');
      }
      timeEl.textContent = formatTime(current) + ' / ' + formatTime(duration);
    }

    video.addEventListener('timeupdate', updateFromTime);
    video.addEventListener('loadedmetadata', updateFromTime);

    seek.addEventListener('input', function () {
      scrubbing = true;
      var pct = Number(seek.value) / 10;
      seek.style.setProperty('--watch-progress', pct + '%');
      if (isFinite(video.duration)) {
        video.currentTime = (pct / 100) * video.duration;
      }
    });
    seek.addEventListener('change', function () { scrubbing = false; });

    playBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);
    video.addEventListener('play', function () { setPaused(false); });
    video.addEventListener('pause', function () { setPaused(true); });
    muteBtn.addEventListener('click', function () { setMuted(!video.muted); });

    setMuted(true);
    setPaused(true);
    updateFromTime();

    // Autoplay (muted, so this is allowed everywhere) only once the video
    // actually scrolls into view, and pauses again once it scrolls back
    // out — a person who never reaches this section never silently
    // downloads/plays 2MB of video. Skipped entirely for reduced-motion,
    // which leaves the poster frame showing until someone presses play.
    if (reduceMotion) return;

    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) video.play().catch(function () {});
          else video.pause();
        });
      }, { threshold: 0.4 });
      vio.observe(frame);
    } else {
      video.play().catch(function () {});
    }
  })();

  /* ---------------- Footer year ---------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
