/* SetchatkaGlaza Web Studio — interactions. Vanilla JS, one animation loop. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  /* Language (RU / EN), remembered between visits */
  let lang = null; try { lang = localStorage.getItem('lang'); } catch (e) {}
  if (!lang) lang = (navigator.language || 'ru').slice(0, 2) === 'ru' ? 'ru' : 'en';
  const setLang = l => { root.lang = l; try { localStorage.setItem('lang', l); } catch (e) {} };
  setLang(lang); $('#lg').onclick = () => setLang(root.lang === 'ru' ? 'en' : 'ru');

  /* Elements and state */
<<<<<<< HEAD
  const cv = $('#bg'), cx = cv.getContext('2d'), glow = $('.cur'), logo = $('.lg img'), nav = $('nav'), bar = $('.pg');
=======
  const cv = $('#bg'), cx = cv.getContext('2d'), glow = $('.cur'), logo = $('.lg img'), cast = $('.cast'), nav = $('nav'), bar = $('.pg');
>>>>>>> c43ae845f0d0d04d30a11b85e330ae70567d81d2
  const ptr = { x: -999, y: -999, nx: .5, ny: .5 }, ease = { x: -999, y: -999, nx: .5, ny: .5 };
  let W, H, P = [], dpr = Math.min(devicePixelRatio || 1, 2), fine = false;

  const resize = () => {
    W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    P = Array.from({ length: Math.min(110, Math.floor(W * H / 14000)) }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28, r: Math.random() * 1.4 + .4, t: Math.random() * 6 }));
  };
  resize(); addEventListener('resize', resize);

  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    fine = true; ptr.x = e.clientX; ptr.y = e.clientY; ptr.nx = e.clientX / W; ptr.ny = e.clientY / H;
  }, { passive: true });
  addEventListener('pointerleave', () => { ptr.x = ptr.y = -999; });

  /* Particles ("constellation") */
  const stars = () => {
    cx.clearRect(0, 0, W, H);
    for (const p of P) {
      p.x += p.vx; p.y += p.vy; p.t += .02;
      if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;
      const dx = ease.x - p.x, dy = ease.y - p.y, d = Math.hypot(dx, dy);
      if (d < 190) { p.x += dx * .006; p.y += dy * .006; cx.strokeStyle = `rgba(255,212,121,${(1 - d / 190) * .5})`; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(ease.x, ease.y); cx.stroke(); }
      cx.fillStyle = `rgba(220,225,255,${.45 + Math.sin(p.t) * .35})`; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.3); cx.fill();
    }
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
      if (d < 120) { cx.strokeStyle = `rgba(139,107,255,${(1 - d / 120) * .3})`; cx.beginPath(); cx.moveTo(P[i].x, P[i].y); cx.lineTo(P[j].x, P[j].y); cx.stroke(); }
    }
  };

<<<<<<< HEAD
  /* One loop: eased pointer, logo tilt, scroll progress — all DOM writes happen here */
=======
  /* One loop: eased pointer, castle parallax and fade, scroll progress — all DOM writes happen here */
>>>>>>> c43ae845f0d0d04d30a11b85e330ae70567d81d2
  let lastNav = null;
  const tick = () => {
    for (const k of ['x', 'y', 'nx', 'ny']) ease[k] += (ptr[k] - ease[k]) * .09;
    if (fine) {
      glow.style.opacity = 1; glow.style.transform = `translate3d(${ease.x}px,${ease.y}px,0)`;
<<<<<<< HEAD
      logo.style.transform = `rotateY(${((ease.nx - .5) * 14).toFixed(2)}deg) rotateX(${((.5 - ease.ny) * 10).toFixed(2)}deg)`;
    }
    const y = scrollY;
=======
      cast.style.setProperty('--px', ((.5 - ease.nx) * 28).toFixed(2)); cast.style.setProperty('--py', ((.5 - ease.ny) * 18).toFixed(2));
      logo.style.transform = `rotateY(${((ease.nx - .5) * 14).toFixed(2)}deg) rotateX(${((.5 - ease.ny) * 10).toFixed(2)}deg)`;
    }
    const y = scrollY, p = Math.min(1, y / (H * .9));
    cast.style.setProperty('--co', (1 - .78 * p).toFixed(3));
>>>>>>> c43ae845f0d0d04d30a11b85e330ae70567d81d2
    bar.style.transform = `scaleX(${(y / Math.max(1, root.scrollHeight - H)).toFixed(4)})`;
    const sc = y > 20; if (sc !== lastNav) { nav.classList.toggle('sc', sc); lastNav = sc; }
    stars();
    requestAnimationFrame(tick);
  };
  if (calm) { stars(); } else requestAnimationFrame(tick);

<<<<<<< HEAD

  /* Hero video: right file for the screen, pauses off-screen, calm fallbacks */
  (() => {
    const v = $('.hv-v'); if (!v) return;
    const mq = matchMedia('(max-width: 860px) and (orientation: portrait)'); let mode = null;
    const load = () => {
      const m = mq.matches ? 'm' : 'd'; if (m === mode) return; mode = m;
      const sfx = m === 'm' ? '-m' : '', base = 'assets/video/hero' + sfx;
      v.poster = base.replace('hero', 'hero-poster') + '.jpg';
      v.innerHTML = `<source src="${base}.webm" type="video/webm"><source src="${base}.mp4" type="video/mp4">`;
      v.load(); play();
    };
    const play = () => { if (calm || document.hidden) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    v.muted = true; v.setAttribute('muted', '');
    load(); (mq.addEventListener ? mq.addEventListener('change', load) : mq.addListener(load));
    if (calm) { v.removeAttribute('autoplay'); v.pause(); return; }
    /* run only while the hero is on screen (saves battery) */
    new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? play() : v.pause()), { threshold: 0 }).observe($('.hero'));
    document.addEventListener('visibilitychange', () => document.hidden ? v.pause() : play());
    /* iOS Low Power Mode blocks autoplay: start on the first touch instead */
    addEventListener('touchstart', () => { if (v.paused) play(); }, { once: true, passive: true });
    v.addEventListener('canplay', () => v.classList.add('ok'), { once: true });
  })();

=======
>>>>>>> c43ae845f0d0d04d30a11b85e330ae70567d81d2
  /* Reveal on scroll */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv').forEach(el => io.observe(el));

  /* Spotlight + tilt on cards */
  $$('.card').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--x', e.clientX - r.left + 'px'); el.style.setProperty('--y', e.clientY - r.top + 'px');
    });
  });

  /* Portfolio: auto-scroll screenshots when a project is centred in view */
  const cs = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('on', e.isIntersecting)), { threshold: .6 });
  $$('.cs').forEach(el => cs.observe(el));

  /* Services tabs */
  const tabs = $$('.tab'), sps = $$('.sp');
  const sel = i => tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i); sps[j].classList.toggle('on', j === i); });
  tabs.forEach((t, i) => {
    t.onclick = () => sel(i);
    t.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') sel(i); });
    t.onkeydown = e => { const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); const n = (i + k + tabs.length) % tabs.length; sel(n); tabs[n].focus(); } };
  });
})();
