(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const portrait = matchMedia('(max-aspect-ratio: 4/5)').matches;
  const root = document.documentElement;

  /* NYC clock and Midtown status (Mon-Fri 7:30-16:30, Sat-Sun 9:00-15:00). */
  const clock = document.querySelector('[data-clock]');
  const status = document.querySelector('[data-status]');
  function tick() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    clock.textContent = `${p.hour}:${p.minute}`;
    const m = +p.hour * 60 + +p.minute;
    const [o, c] = (p.weekday === 'Sat' || p.weekday === 'Sun') ? [540, 900] : [450, 990];
    status.textContent = m >= o && m < c ? 'Open now.' : 'Closed now.';
  }
  tick(); setInterval(tick, 15000);

  /* Nav takes the color of the section under it. */
  const tinted = [...document.querySelectorAll('[data-navc], .field')];
  const nav = document.querySelector('.nav');
  const chapters = [...document.querySelectorAll('.field, .band')];
  const navLinks = [...document.querySelectorAll('.nav__left a')];
  function navTint() {
    const y = 40;
    let c = '#ad7bb3';
    for (const s of tinted) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) c = s.dataset.navc || '#ad7bb3'; }
    nav.style.setProperty('--navc', c);
    nav.classList.toggle('is-light', c === '#ffffff' || c === '#ddc5dd');
    /* Mark the nav link for the section in view. */
    let here = 'top';
    for (const s of chapters) { if (s.getBoundingClientRect().top <= innerHeight * .4) here = s.id; }
    navLinks.forEach(l => l.classList.toggle('is-here', l.dataset.for.split(' ').includes(here)));
  }

  /* Videos: load near the screen; pause when off screen or covered by the next band. */
  const vids = [...document.querySelectorAll('video.vid')];
  function load(v) {
    if (v.dataset.loaded) return;
    v.src = (portrait && v.dataset.srcPortrait) || v.dataset.src;
    v.dataset.loaded = '1';
  }
  const near = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? (near.add(e.target), load(e.target)) : near.delete(e.target); }), { rootMargin: '300px 0px' });
  vids.forEach(v => io.observe(v));
  function playState() {
    if (reduce) return;
    vids.forEach(v => {
      if (!near.has(v)) { v.paused || v.pause(); return; }
      const panel = v.closest('.media');
      const next = panel && panel.nextElementSibling;
      const covered = next && next.getBoundingClientRect().top <= 0;
      if (covered) { v.paused || v.pause(); }
      else if (v.paused) { const p = v.play(); p && p.catch(() => {}); }
    });
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { navTint(); playState(); ticking = false; });
  }, { passive: true });
  navTint();
  setInterval(playState, 600);

  /* Order sheet */
  const sheet = document.getElementById('order');
  document.querySelectorAll('[data-open-order]').forEach(b => b.addEventListener('click', () => sheet.showModal()));
  sheet.querySelector('[data-close-order]').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
})();
