/*
 * John Joseph Decierdo — Portfolio V2.1
 * No runtime dependencies. All portfolio content is available without this file.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const themeKey = 'jjd-theme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let savedTheme = null;

  try {
    const value = localStorage.getItem(themeKey);
    if (value === 'light' || value === 'dark') savedTheme = value;
  } catch (_) {
    // Private browsing and restricted storage still get a working theme toggle.
  }

  // This script runs in the head, so the first paint already has the right theme.
  root.dataset.theme = savedTheme || (systemTheme.matches ? 'dark' : 'light');

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const watchMedia = (query, callback) => {
    if (query.addEventListener) query.addEventListener('change', callback);
    else query.addListener(callback);
  };

  function observeViewportBand(targets, callback, top, bottom, threshold = 0) {
    let observer;
    let observedHeight = 0;
    let resizeFrame = 0;

    function connect() {
      resizeFrame = 0;
      const height = window.innerHeight;
      if (observer && height === observedHeight) return;
      observedHeight = height;
      if (observer) observer.disconnect();
      // Percentage root margins resolve against width; pixel margins preserve
      // a vertical reading band on wide desktops and landscape mobile screens.
      observer = new IntersectionObserver(callback, {
        rootMargin: `${-height * top}px 0px ${-height * bottom}px 0px`,
        threshold
      });
      targets.forEach((target) => observer.observe(target));
    }

    window.addEventListener('resize', () => {
      if (!resizeFrame) resizeFrame = requestAnimationFrame(connect);
    }, { passive: true });
    connect();
  }

  function initTheme() {
    const button = $('#theme-toggle');
    const label = $('#theme-label');
    if (!button) return;
    let transitionTimer;

    function updateControl() {
      const dark = root.dataset.theme === 'dark';
      button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
      if (label) label.textContent = dark ? 'Light mode' : 'Dark mode';
      button.dataset.theme = root.dataset.theme;
    }

    function applyTheme(theme, animate = false) {
      clearTimeout(transitionTimer);
      const transition = animate && !reducedMotion.matches;
      root.classList.toggle('theme-transition', transition);
      if (transition) {
        transitionTimer = window.setTimeout(() => root.classList.remove('theme-transition'), 450);
      }
      root.dataset.theme = theme;
      updateControl();
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    button.hidden = false;
    updateControl();
    button.addEventListener('click', () => {
      savedTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(themeKey, savedTheme); } catch (_) { /* In-memory override works. */ }
      applyTheme(savedTheme, true);
    });
    watchMedia(systemTheme, () => {
      if (!savedTheme) applyTheme(systemTheme.matches ? 'dark' : 'light', true);
    });
    window.addEventListener('storage', (event) => {
      if (event.key !== themeKey && event.key !== null) return;
      savedTheme = event.newValue === 'dark' || event.newValue === 'light' ? event.newValue : null;
      applyTheme(savedTheme || (systemTheme.matches ? 'dark' : 'light'));
    });
  }

  function initNavigation() {
    const header = $('#site-header');
    const nav = $('#site-nav');
    const toggle = $('#menu-toggle');
    if (!header || !nav || !toggle) return;
    const mobile = window.matchMedia('(max-width: 820px)');
    let previousMobile = mobile.matches;
    let lastNavFocus = null;
    let keyboardNavigation = true;

    function closeMenu(restoreFocus = false) {
      header.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      if (restoreFocus) toggle.focus();
    }

    function updateLayout() {
      const active = document.activeElement;
      // Some browsers blur a control as CSS hides it, before the media event.
      const focused = active === document.body && mobile.matches !== previousMobile
        ? lastNavFocus : active;
      const focusWasInNav = nav.contains(focused);
      const focusWasOnToggle = focused === toggle;
      const desktopTarget = focusWasInNav ? focused
        : $('a[aria-current="location"]', nav) || $('a[href]', nav);
      closeMenu();
      toggle.hidden = !mobile.matches;
      previousMobile = mobile.matches;
      if (keyboardNavigation) {
        if (mobile.matches && focusWasInNav) toggle.focus({ preventScroll: true });
        else if (!mobile.matches && (focusWasOnToggle || focusWasInNav)
          && desktopTarget && document.activeElement !== desktopTarget) {
          desktopTarget.focus({ preventScroll: true });
        }
      }
    }

    toggle.addEventListener('click', () => {
      const open = !header.classList.contains('menu-open');
      header.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      // The compact menu precedes its toggle in the desktop DOM order.
      if (open) {
        const firstLink = $('a[href]', nav);
        if (firstLink) firstLink.focus();
      }
    });
    nav.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;
      const wasOpen = header.classList.contains('menu-open');
      closeMenu();
      if (mobile.matches && wasOpen) {
        const href = link.getAttribute('href');
        const destination = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
        if (destination) {
          const temporaryFocus = !destination.hasAttribute('tabindex');
          if (temporaryFocus) destination.setAttribute('tabindex', '-1');
          destination.focus({ preventScroll: true });
          if (temporaryFocus) destination.addEventListener('blur', () => destination.removeAttribute('tabindex'), { once: true });
        }
      }
    });
    document.addEventListener('keydown', (event) => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey) keyboardNavigation = true;
      if (event.key === 'Escape' && header.classList.contains('menu-open')) closeMenu(true);
    });
    document.addEventListener('pointerdown', () => {
      keyboardNavigation = false;
      lastNavFocus = null;
    }, { passive: true });
    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) closeMenu();
    });
    document.addEventListener('focusin', (event) => {
      if (event.target !== document.body || mobile.matches === previousMobile) {
        lastNavFocus = nav.contains(event.target) || event.target === toggle ? event.target : null;
      }
      if (!header.contains(event.target)) closeMenu();
    });
    watchMedia(mobile, updateLayout);
    updateLayout();
    root.classList.add('nav-ready');

    if (!('IntersectionObserver' in window)) return;
    const links = $$('a[href^="#"]', nav);
    const visibleSections = new Map();
    observeViewportBand($$('section[data-nav]'), (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSections.set(entry.target.id, entry);
        else visibleSections.delete(entry.target.id);
      });
      const current = [...visibleSections.values()].sort((a, b) =>
        Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top)
      )[0];
      if (!current) return;
      links.forEach((link) => {
        if (link.getAttribute('href') === `#${current.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, 0.15, 0.55);
  }

  function initScrollStory() {
    const progress = $('#page-progress');
    const header = $('#site-header');
    const journey = $('#journey-line');
    let frame = 0;
    let maxScroll = 1;
    let journeyTop = 0;
    let journeyHeight = 1;

    function measure() {
      maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
      if (journey) {
        const box = journey.getBoundingClientRect();
        journeyTop = box.top + window.scrollY;
        journeyHeight = Math.max(1, box.height);
      }
      schedule();
    }

    function paint() {
      frame = 0;
      const scroll = window.scrollY;
      if (progress) progress.style.transform = `scaleX(${clamp(scroll / maxScroll, 0, 1)})`;
      if (header) header.classList.toggle('is-scrolled', scroll > 24);
      if (journey) {
        const position = reducedMotion.matches ? 1 : clamp((scroll + window.innerHeight * 0.68 - journeyTop) / journeyHeight, 0, 1);
        journey.style.setProperty('--journey-progress', position.toFixed(4));
      }
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(paint);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('load', measure, { once: true });
    watchMedia(reducedMotion, schedule);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
    measure();

    const steps = $$('.journey-step');
    if (!('IntersectionObserver' in window)) return;
    observeViewportBand(steps, (entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-current', entry.isIntersecting));
    }, 0.1, 0.25, 0.35);
  }

  function initReveals() {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    const animations = new Set();
    if (!reducedMotion.matches) {
      $$('.name-line > span').forEach((line, index) => {
        const animation = line.animate([
          { transform: 'translateY(105%)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 }
        ], { duration: 1050, delay: index * 110, easing: 'cubic-bezier(.18,.8,.2,1)', fill: 'backwards' });
        animations.add(animation);
        animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
      });
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (reducedMotion.matches) return;
        const media = entry.target.dataset.reveal === 'media';
        const delay = clamp(Number(entry.target.dataset.revealDelay) || 0, 0, 300);
        const frames = media
          ? [{ opacity: 0.25, clipPath: 'inset(8% 0 0 0)', transform: 'translateY(18px)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' }]
          : [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }];
        const animation = entry.target.animate(frames, {
          duration: media ? 900 : 750,
          delay,
          easing: 'cubic-bezier(.2,.75,.2,1)',
          fill: 'backwards'
        });
        animations.add(animation);
        animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    $$('[data-reveal]').forEach((element) => observer.observe(element));
    watchMedia(reducedMotion, () => {
      if (!reducedMotion.matches) return;
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    });
  }

  function initSystemVisual() {
    const stage = $('#system-stage');
    const canvas = $('#system-canvas');
    if (!stage || !canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const modeButtons = $$('[data-system-mode]', stage.closest('.hero-lab') || document);
    const modeLabel = $('#system-mode-label');
    const motionButton = $('#visual-motion-toggle');
    const motionLabel = $('#visual-motion-label');
    const modeNames = { flow: 'Flow', structure: 'Structure', connections: 'Connections' };
    let mode = 'flow';
    let previousMode = mode;
    let modeMix = 1;
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = 0;
    let time = 0;
    let visible = true;
    let userPaused = false;
    let lineColor = '#97a58f';
    let accentColor = '#c4ed85';
    let pointerX = 0;
    let pointerY = 0;
    let rotationX = 0;
    let rotationY = 0;
    const columns = 72;
    const rows = 26;

    function readColors() {
      const style = getComputedStyle(stage);
      lineColor = style.getPropertyValue('--diagram-line').trim() || '#97a58f';
      accentColor = style.getPropertyValue('--accent').trim() || '#c4ed85';
    }

    // Three related surfaces share one lattice, making the mode changes continuous.
    function surface(u, v, type, phase) {
      const x = u * 2 - 1;
      const y = v * 2 - 1;
      if (type === 'structure') {
        const angle = x * 1.45;
        return [Math.sin(angle) * 1.55, y * 0.86, Math.cos(angle) * 0.9 - 0.4 + Math.sin(y * 3 + phase * 0.35) * 0.045];
      }
      if (type === 'connections') {
        const fold = Math.sin(x * 3.1 + phase * 0.25) * Math.cos(y * 2.2);
        return [x * 1.7, y * 0.85, fold * 0.63];
      }
      const twist = x * 1.85 + Math.sin(phase * 0.22) * 0.18;
      return [x * 1.8, y * 0.77 * Math.cos(twist), y * 0.77 * Math.sin(twist) + Math.sin(x * 3 + phase * 0.5) * 0.12];
    }

    function project(point) {
      const yaw = -0.26 + rotationX * 0.15;
      const pitch = 0.62 + rotationY * 0.11;
      const x = point[0] * Math.cos(yaw) + point[2] * Math.sin(yaw);
      const z = -point[0] * Math.sin(yaw) + point[2] * Math.cos(yaw);
      const y = point[1] * Math.cos(pitch) - z * Math.sin(pitch);
      const depth = point[1] * Math.sin(pitch) + z * Math.cos(pitch);
      const perspective = 4.8 / (4.8 + depth);
      const scale = Math.min(width / 4.1, height / 2.8);
      const roll = -0.19;
      return [
        width * 0.5 + (x * Math.cos(roll) - y * Math.sin(roll)) * scale * perspective,
        height * 0.5 + (x * Math.sin(roll) + y * Math.cos(roll)) * scale * perspective,
        depth
      ];
    }

    function draw() {
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);
      const points = [];
      const blend = modeMix * modeMix * (3 - 2 * modeMix);
      for (let row = 0; row <= rows; row += 1) {
        const line = [];
        for (let column = 0; column <= columns; column += 1) {
          const u = column / columns;
          const v = row / rows;
          const target = surface(u, v, mode, time);
          if (modeMix < 1) {
            const previous = surface(u, v, previousMode, time);
            for (let axis = 0; axis < 3; axis += 1) target[axis] = previous[axis] + (target[axis] - previous[axis]) * blend;
          }
          line.push(project(target));
        }
        points.push(line);
      }

      context.lineWidth = 0.7;
      context.strokeStyle = lineColor;
      for (let row = 0; row <= rows; row += 1) {
        context.globalAlpha = row === 0 || row === rows ? 0.75 : 0.28 + row / rows * 0.2;
        context.beginPath();
        points[row].forEach((point, index) => {
          if (index === 0) context.moveTo(point[0], point[1]);
          else context.lineTo(point[0], point[1]);
        });
        context.stroke();
      }
      context.globalAlpha = 0.26;
      for (let column = 0; column <= columns; column += 1) {
        context.beginPath();
        for (let row = 0; row <= rows; row += 1) {
          const point = points[row][column];
          if (row === 0) context.moveTo(point[0], point[1]);
          else context.lineTo(point[0], point[1]);
        }
        context.stroke();
      }

      // A single travelling seam makes the underlying structure legible.
      const seam = Math.floor((Math.sin(time * 0.28) * 0.5 + 0.5) * (rows - 4)) + 2;
      context.globalAlpha = 0.92;
      context.strokeStyle = accentColor;
      context.lineWidth = 1.2;
      context.beginPath();
      points[seam].forEach((point, index) => {
        if (index === 0) context.moveTo(point[0], point[1]);
        else context.lineTo(point[0], point[1]);
      });
      context.stroke();

      if (mode === 'connections') {
        context.fillStyle = accentColor;
        context.globalAlpha = 0.86;
        for (let row = 2; row <= rows - 2; row += 6) {
          for (let column = 6; column <= columns - 6; column += 12) {
            const point = points[row][column];
            context.beginPath();
            context.arc(point[0], point[1], 2.25, 0, Math.PI * 2);
            context.fill();
          }
        }
      } else {
        context.fillStyle = accentColor;
        [8, 32, 57].forEach((column) => {
          const point = points[seam][column];
          context.beginPath();
          context.arc(point[0], point[1], 2.5, 0, Math.PI * 2);
          context.fill();
        });
      }
      context.globalAlpha = 1;
      if (!stage.classList.contains('canvas-ready')) {
        stage.classList.add('canvas-ready');
        modeButtons.forEach((button) => { button.disabled = false; });
      }
    }

    function shouldAnimate() {
      return visible && !document.hidden && !reducedMotion.matches && !userPaused;
    }

    function tick(timestamp) {
      frame = 0;
      if (!shouldAnimate()) return;
      if (!lastFrame) lastFrame = timestamp;
      const elapsed = timestamp - lastFrame;
      // Thirty frames per second keeps the wireframe calm and bounds GPU/CPU work.
      if (elapsed >= 1000 / 30) {
        const seconds = Math.min(elapsed / 1000, 0.06);
        lastFrame = timestamp;
        time += seconds;
        modeMix = Math.min(1, modeMix + seconds * 1.6);
        rotationX += (pointerX - rotationX) * 0.07;
        rotationY += (pointerY - rotationY) * 0.07;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }

    function syncMotion() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      if (motionButton) {
        motionButton.hidden = false;
        motionButton.disabled = reducedMotion.matches;
        motionButton.setAttribute('aria-pressed', String(!userPaused && !reducedMotion.matches));
        motionButton.setAttribute('aria-label', reducedMotion.matches ? 'Motion reduced; following your reduced motion preference' : userPaused ? 'Motion paused; enable diagram motion' : 'Motion on; pause diagram motion');
      }
      if (motionLabel) motionLabel.textContent = reducedMotion.matches ? 'Motion reduced' : userPaused ? 'Motion paused' : 'Motion on';
      if (reducedMotion.matches) {
        modeMix = 1;
        pointerX = pointerY = rotationX = rotationY = 0;
      }
      draw();
      if (shouldAnimate()) frame = requestAnimationFrame(tick);
    }

    function resize() {
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const next = button.dataset.systemMode;
        if (!modeNames[next] || next === mode) return;
        previousMode = mode;
        mode = next;
        modeMix = shouldAnimate() ? 0 : 1;
        modeButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        if (modeLabel) modeLabel.textContent = modeNames[mode];
        stage.dataset.mode = mode;
        draw();
      });
    });
    if (motionButton) motionButton.addEventListener('click', () => {
      userPaused = !userPaused;
      syncMotion();
    });

    // Event-local geometry reads happen only while interacting with the hero.
    stage.addEventListener('pointermove', (event) => {
      if (!finePointer.matches || reducedMotion.matches || userPaused) return;
      const box = stage.getBoundingClientRect();
      pointerX = clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1);
      pointerY = clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1);
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; }, { passive: true });
    watchMedia(finePointer, () => { pointerX = 0; pointerY = 0; });
    watchMedia(reducedMotion, syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    document.addEventListener('themechange', () => { readColors(); draw(); });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        syncMotion();
      }, { threshold: 0 }).observe(stage);
    }
    readColors();
    resize();
    syncMotion();
  }

  function initCaptionDemo() {
    const demo = $('#caption-demo');
    const controls = $('#caption-controls');
    const play = $('#caption-play');
    const playLabel = $('#caption-play-label');
    const scrubber = $('#caption-scrubber');
    const language = $('#caption-language');
    const output = $('#caption-output');
    const timeLabel = $('#caption-time');
    if (!demo || !controls || !play || !scrubber || !language || !output) return;
    const cues = $$('[data-cue]', demo);
    const styles = $$('[data-caption-style]', demo);
    const samples = {
      en: ['A small idea.', 'A little curiosity.', 'Something useful.'],
      fil: ['Isang maliit na ideya.', 'Kaunting pag-uusisa.', 'Isang bagay na kapaki-pakinabang.'],
      es: ['Una pequeña idea.', 'Un poco de curiosidad.', 'Algo útil.']
    };
    const htmlLanguages = { en: 'en', fil: 'fil', es: 'es' };
    let currentTime = 0;
    let currentCue = -1;
    let currentLanguage = '';
    let playing = false;
    let frame = 0;
    let lastTimestamp = 0;
    let lastSecond = -1;
    const duration = 12;

    function update() {
      const selectedLanguage = samples[language.value] ? language.value : 'en';
      const index = Math.min(2, Math.floor(currentTime / 4));
      if (index !== currentCue || selectedLanguage !== currentLanguage) {
        output.textContent = samples[selectedLanguage][index];
        output.lang = htmlLanguages[selectedLanguage];
        demo.dataset.scene = String(index);
        cues.forEach((button) => {
          const cue = Number(button.dataset.cue);
          const text = $('.cue-text', button);
          if (text && samples[selectedLanguage][cue]) {
            text.textContent = samples[selectedLanguage][cue];
            text.lang = htmlLanguages[selectedLanguage];
          }
          button.setAttribute('aria-pressed', String(cue === index));
        });
        currentCue = index;
        currentLanguage = selectedLanguage;
      }
      const second = Math.floor(currentTime);
      if (second !== lastSecond) {
        if (timeLabel) timeLabel.textContent = `00:${String(second).padStart(2, '0')} / 00:12`;
        scrubber.setAttribute('aria-valuetext', `${second} of ${duration} seconds`);
        lastSecond = second;
      }
      scrubber.value = String(currentTime);
      demo.style.setProperty('--caption-progress', (currentTime / duration).toFixed(4));
    }

    function setPlaying(value) {
      playing = value;
      demo.classList.toggle('is-playing', playing);
      play.setAttribute('aria-pressed', String(playing));
      play.setAttribute('aria-label', playing ? 'Pause sample preview' : 'Play preview');
      if (playLabel) playLabel.textContent = playing ? 'Pause' : 'Play preview';
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTimestamp = 0;
      if (playing) frame = requestAnimationFrame(tick);
    }

    function tick(timestamp) {
      frame = 0;
      if (!playing) return;
      if (lastTimestamp) currentTime = Math.min(duration, currentTime + (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      update();
      if (currentTime >= duration) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    }

    play.addEventListener('click', () => {
      if (currentTime >= duration && !playing) currentTime = 0;
      setPlaying(!playing);
      update();
    });
    function seek(time) {
      currentTime = clamp(time, 0, duration);
      lastTimestamp = 0;
      if (currentTime >= duration) setPlaying(false);
      update();
    }
    scrubber.addEventListener('input', () => seek(Number(scrubber.value) || 0));
    scrubber.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      // Keep the fine native range step for pointer scrubbing.
      seek(currentTime + (event.key === 'ArrowRight' ? 1 : -1));
    });
    language.addEventListener('change', update);
    cues.forEach((button) => button.addEventListener('click', () => {
      currentTime = clamp(Number(button.dataset.cue) * 4, 0, duration);
      lastTimestamp = 0;
      update();
    }));
    styles.forEach((button) => button.addEventListener('click', () => {
      demo.dataset.captionStyle = button.dataset.captionStyle;
      styles.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) setPlaying(false);
      }, { threshold: 0 }).observe(demo);
    }
    controls.disabled = false;
    setPlaying(false);
    update();
  }

  function initKioskDemo() {
    const demo = $('#kiosk-demo');
    const controls = $('#kiosk-controls');
    const list = $('#order-items');
    const count = $('#order-count');
    const status = $('#order-status');
    const clear = $('#clear-order');
    if (!demo || !controls || !list || !count || !clear) return;
    const products = {
      burger: 'Classic burger',
      fries: 'Golden fries',
      drink: 'Cold drink'
    };
    const order = new Map();
    const categories = $$('[data-category]', demo);
    const items = $$('[data-item]', demo);

    function announce(message) { if (status) status.textContent = message; }

    function makeButton(text, action, item, label) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.className = action === 'remove' ? 'order-remove' : 'order-adjust';
      button.dataset.orderAction = action;
      button.dataset.orderItem = item;
      button.setAttribute('aria-label', label);
      return button;
    }

    function renderOrder(focus = null) {
      const fragment = document.createDocumentFragment();
      let total = 0;
      order.forEach((quantity, item) => {
        total += quantity;
        const row = document.createElement('li');
        row.className = 'order-row';
        const name = document.createElement('span');
        name.className = 'order-item-name';
        name.textContent = products[item];
        const actions = document.createElement('div');
        actions.className = 'order-item-controls';
        const amount = document.createElement('span');
        amount.className = 'order-quantity';
        amount.textContent = String(quantity);
        amount.setAttribute('aria-label', `Quantity: ${quantity}`);
        const increase = makeButton('+', 'increase', item, `Add one ${products[item]}`);
        increase.disabled = quantity >= 9;
        actions.append(
          makeButton('−', 'decrease', item, `Remove one ${products[item]}`),
          amount,
          increase,
          makeButton('×', 'remove', item, `Remove ${products[item]} from sample order`)
        );
        row.append(name, actions);
        fragment.append(row);
      });
      if (!order.size) {
        const empty = document.createElement('li');
        empty.className = 'order-empty';
        empty.textContent = 'Your tray is empty. Choose an item to begin.';
        fragment.append(empty);
      }
      list.replaceChildren(fragment);
      count.textContent = `${total} ${total === 1 ? 'item' : 'items'}`;
      clear.disabled = total === 0;
      demo.dataset.orderState = total ? 'filled' : 'empty';
      // Re-rendering must not strand keyboard focus on the document body.
      if (focus) {
        const replacement = $(`[data-order-item="${focus.item}"][data-order-action="${focus.action}"]`, list);
        const sameProduct = $(`[data-order-item="${focus.item}"]:not(:disabled)`, list);
        const menuProduct = items.find((item) => item.dataset.item === focus.item && !item.hidden);
        // At the limit, stay in this row. After removal, return to this product
        // or the selected category, never a different product's quantity button.
        const next = replacement && !replacement.disabled ? replacement
          : sameProduct || menuProduct || categories.find((item) => item.getAttribute('aria-pressed') === 'true');
        if (next) next.focus({ preventScroll: true });
      }
    }

    categories.forEach((button) => button.addEventListener('click', () => {
      const category = button.dataset.category;
      categories.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      items.forEach((item) => { item.hidden = category !== 'all' && item.dataset.productCategory !== category; });
    }));
    items.forEach((button) => button.addEventListener('click', () => {
      const item = button.dataset.item;
      if (!products[item]) return;
      const quantity = order.get(item) || 0;
      if (quantity >= 9) {
        announce(`The sample tray holds up to 9 of each item. ${products[item]} is at that limit.`);
        return;
      }
      order.set(item, quantity + 1);
      renderOrder();
      announce(`${products[item]} added. ${count.textContent} in your sample tray.`);
    }));
    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-order-action]');
      if (!button || !list.contains(button)) return;
      const item = button.dataset.orderItem;
      const action = button.dataset.orderAction;
      const quantity = order.get(item);
      if (!quantity) return;
      if (action === 'remove' || (action === 'decrease' && quantity === 1)) order.delete(item);
      else if (action === 'decrease') order.set(item, quantity - 1);
      else if (action === 'increase') order.set(item, Math.min(9, quantity + 1));
      renderOrder({ item, action });
      announce(`${products[item]}: ${order.get(item) || 0} in your sample tray. ${count.textContent} total.`);
    });
    clear.addEventListener('click', () => {
      order.clear();
      renderOrder();
      announce('Sample tray cleared.');
      const first = items.find((item) => !item.hidden);
      if (first) first.focus();
    });
    controls.disabled = false;
    renderOrder();
  }

  function initCopyEmail() {
    const button = $('#copy-email');
    const status = $('#copy-status');
    const link = $('a[href^="mailto:"]');
    if (!button || !link || !navigator.clipboard || !window.isSecureContext) return;
    const email = link.getAttribute('href').slice(7).split('?')[0];
    button.hidden = false;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await navigator.clipboard.writeText(email);
        if (status) status.textContent = 'Email address copied.';
      } catch (_) {
        if (status) status.textContent = `Copy is unavailable here. Email: ${email}`;
      } finally {
        button.disabled = false;
      }
    });
  }

  function initCursor() {
    const ring = $('#cursor-ring');
    if (!ring) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    function available() { return finePointer.matches && !reducedMotion.matches && !document.hidden; }
    function hide() {
      ring.classList.remove('is-visible', 'is-active');
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
    document.addEventListener('pointermove', (event) => {
      if (!available() || event.pointerType === 'touch') { hide(); return; }
      x = event.clientX;
      y = event.clientY;
      ring.classList.add('is-visible');
      ring.classList.toggle('is-active', Boolean(event.target.closest('a, button:not(:disabled), input, select, summary')));
      if (!frame) frame = requestAnimationFrame(() => {
        ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        frame = 0;
      });
    }, { passive: true });
    document.addEventListener('pointerleave', hide);
    document.addEventListener('visibilitychange', hide);
    document.addEventListener('keydown', (event) => { if (event.key === 'Tab') hide(); });
    watchMedia(reducedMotion, hide);
    watchMedia(finePointer, hide);
  }

  function init() {
    // Each enhancement is independent. A failed optional visual cannot break links,
    // theme controls, or the working project demonstrations.
    [initTheme, initNavigation, initScrollStory, initReveals, initSystemVisual,
      initCaptionDemo, initKioskDemo, initCopyEmail, initCursor].forEach((initialize) => {
      try { initialize(); } catch (error) {
        console.warn(`Portfolio enhancement unavailable: ${initialize.name}`, error);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
