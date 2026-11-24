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
    nav.classList.toggle('is-warm', c === '#f29871');
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

  /* Menu receipt: flip between 550 Madison and Harlem. The hidden side is inert so it can't take focus or clicks. */
  const flip = document.querySelector('[data-flip]');
  const flipBtn = document.querySelector('[data-flip-btn]');
  const [front, back] = flip.querySelectorAll('.receipt');
  flipBtn.addEventListener('click', () => {
    const toBack = !flip.classList.contains('is-flipped');
    flip.classList.toggle('is-flipped', toBack);
    front.inert = toBack; back.inert = !toBack;
    flipBtn.setAttribute('aria-pressed', String(toBack));
    flipBtn.textContent = toBack ? 'Flip to 550 Madison ↻' : 'Flip to Harlem ↻';
    if (reduce) return;
    flip.classList.remove('is-lifting'); void flip.offsetWidth; flip.classList.add('is-lifting');
  });
  flip.addEventListener('animationend', () => flip.classList.remove('is-lifting'));

  /* Catering: jump to the catering chapter and open the order site in a popup over it. */
  const cater = document.getElementById('cater');
  const caterFrame = cater.querySelector('iframe');
  document.querySelectorAll('[data-open-cater]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    if (sheet.open) sheet.close();
    document.getElementById('ch-catering').scrollIntoView();
    if (!caterFrame.src) caterFrame.src = caterFrame.dataset.src;
    cater.showModal();
  }));
  cater.querySelector('[data-close-cater]').addEventListener('click', () => cater.close());
  cater.addEventListener('click', e => { if (e.target === cater) cater.close(); });

  /* Chat buddies. The buddy list opens one instant message window at a time.
     Raffi is the live catering bot in a frame; UptacoInfo answers from the facts on this page. */
  const im = document.querySelector('[data-im]');
  const fold = im.querySelector('[data-buddy-fold]');
  const wins = [...im.querySelectorAll('.imwin')];
  let opener = null;
  function imOpen(id) {
    const w = document.getElementById(id);
    wins.forEach(x => { x.hidden = x !== w; });
    const f = w.querySelector('iframe');
    if (f && !f.src) f.src = f.dataset.src;
    im.classList.add('is-chatting');
    if (id === 'im-info') infoStart();
    (f || w.querySelector('input')).focus();
  }
  function imClose() {
    wins.forEach(x => { x.hidden = true; });
    im.classList.remove('is-chatting');
    (opener || fold).focus();
  }
  im.querySelectorAll('[data-im-open]').forEach(b => b.addEventListener('click', () => { opener = b; imOpen(b.dataset.imOpen); }));
  im.querySelectorAll('[data-im-close]').forEach(b => b.addEventListener('click', imClose));
  im.addEventListener('keydown', e => { if (e.key === 'Escape' && im.classList.contains('is-chatting')) imClose(); });
  const toggleFold = () => fold.setAttribute('aria-expanded', fold.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  fold.addEventListener('click', e => { e.stopPropagation(); toggleFold(); });
  im.querySelector('[data-buddy-title]').addEventListener('click', toggleFold);
  /* Phones start with the buddy list folded to its title bar so it covers less of the page. */
  if (matchMedia('(max-width: 760px)').matches) fold.setAttribute('aria-expanded', 'false');
  const raffiFrame = document.querySelector('#im-raffi iframe');
  const botOrigin = new URL(raffiFrame.dataset.src).origin;
  addEventListener('message', e => { if (e.origin === botOrigin && e.source === raffiFrame.contentWindow && e.data?.type === 'uptaco-raffi-close') imClose(); });

  /* UptacoInfo: canned answers, matched by keyword. Facts mirror the sections of this page. */
  const log = document.querySelector('.info__log');
  const choiceBox = document.querySelector('.info__choices');
  const info = document.querySelector('.info');
  const A = {
    hours: () => `550 Madison: Mon to Fri 7:30 to 16:30, Sat and Sun 9:00 to 15:00. ${document.querySelector('[data-status]').textContent}\nHarlem, 300 W 135th St: open daily 7a-7p.`,
    where: () => `Midtown: in the plaza at 550 Madison Ave, at 55th St. <a href="https://www.google.com/maps/search/?api=1&query=Uptaco%20550%20Madison&query_place_id=ChIJxcR6lTRZwokRZkNGNwDnqWg" target="_blank" rel="noopener">Directions</a>\nHarlem: 300 W 135th St, at St. Nicholas Ave. <a href="https://www.google.com/maps/search/?api=1&query=Uptaco%20Harlem&query_place_id=ChIJe1i32DD3wokR-xW3HBseZqo" target="_blank" rel="noopener">Directions</a>`,
    menu: () => 'Breakfast tacos (Classic, BEC, vegan Impossible chorizo), new steak tacos, burritos (OG Classic, The Jacob, The Raffi), the Chicken Caesar wrap with grilled or crispy chicken, and matcha drinks. Harlem also has a Devoción coffee bar and the horchata latte. This month\'s specials are ube matcha and grilled cheese with tomato soup. <a href="#ch-menu" data-info-go>See the core menu</a>',
    order: () => 'Pickup: <a href="https://uptaco.square.site/" target="_blank" rel="noopener">550 Madison</a> or <a href="https://uptaco-harlem.square.site/" target="_blank" rel="noopener">Harlem</a>. Delivery: both shops are on Uber Eats and Grubhub.',
    delivery: () => 'Both shops deliver through <a href="https://www.ubereats.com/store/uptaco-breakfast-tacos/6b2GD1yUUbuNowE0SgrO_w" target="_blank" rel="noopener">Uber Eats (Midtown)</a>, <a href="https://www.ubereats.com/store/uptaco-harlem/AueXmDLRV8mxy-oOGY_NQQ" target="_blank" rel="noopener">Uber Eats (Harlem)</a>, and Grubhub. For a group order, ask my buddy RaffiCateringBot.',
    vegan: () => 'The Impossible chorizo taco is vegan. For an allergy, email <a href="mailto:info@uptaco.nyc">info@uptaco.nyc</a> before you order and the team will answer for your specific case.',
    catering: () => 'Catering is RaffiCateringBot\'s department. <button type="button" data-info-raffi>IM Raffi</button> or <a href="https://uptaco.gethoneycart.com/?menu=1&order_type=1" target="_blank" rel="noopener">order catering online</a>.',
    contact: () => 'Email <a href="mailto:info@uptaco.nyc">info@uptaco.nyc</a> for anything else: jobs, press, wholesale, or feedback. Instagram is <a href="https://www.instagram.com/uptaconyc" target="_blank" rel="noopener">@uptaconyc</a>.',
    hi: () => 'Hey. Ask me about hours, locations, the menu, ordering, or delivery.',
    none: () => 'I only know the basics. Try one of the buttons below, or email <a href="mailto:info@uptaco.nyc">info@uptaco.nyc</a> and a person will answer.'
  };
  const keys = [
    ['catering', /cater|group|office|party|event|platter|people|quote|bulk/],
    ['hours', /hour|open|close|when|time|today|weekend|sunday|saturday/],
    ['where', /where|address|location|direction|harlem|madison|midtown|135|map|near/],
    ['vegan', /vegan|vegetarian|gluten|allerg|dairy|nut|celiac|diet/],
    ['delivery', /deliver|uber|grubhub|doordash|seamless/],
    ['order', /order|pickup|pick up|online|app/],
    ['menu', /menu|taco|burrito|wrap|caesar|steak|matcha|drink|price|cost|eat|food|coffee/],
    ['contact', /contact|email|phone|call|job|hiring|work|press|wholesale|instagram|feedback/],
    ['hi', /^(hi|hey|hello|yo|sup)\b/]
  ];
  const labels = [['hours', 'Hours'], ['where', 'Locations'], ['menu', 'Menu'], ['order', 'Order'], ['delivery', 'Delivery'], ['catering', 'Catering'], ['contact', 'Contact']];
  function say(cls, html) {
    const p = document.createElement('p'); p.className = cls;
    if (cls === 'you') p.textContent = html; else p.innerHTML = html.replace(/\n/g, '<br>');
    log.append(p); info.scrollTop = info.scrollHeight;
  }
  function answer(key) { setTimeout(() => say('bot', A[key]()), reduce ? 0 : 350); }
  labels.forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = () => { say('you', t); answer(k); }; choiceBox.append(b); });
  let started = false;
  function infoStart() {
    if (started) return; started = true;
    say('sys', 'UptacoInfo has signed on.');
    say('bot', 'Hi. I can tell you hours, locations, the menu, and how to order. Pick a button or type a question.');
  }
  document.querySelector('.info__form').addEventListener('submit', e => {
    e.preventDefault();
    const q = e.target.elements[0]; const t = q.value.trim(); if (!t) return;
    say('you', t); q.value = '';
    const hit = keys.find(([, re]) => re.test(t.toLowerCase()));
    answer(hit ? hit[0] : 'none');
  });
  log.addEventListener('click', e => {
    if (e.target.closest('[data-info-raffi]')) { opener = im.querySelector('[data-im-open="im-raffi"]'); imOpen('im-raffi'); }
    if (e.target.closest('[data-info-go]') && matchMedia('(max-width: 760px)').matches) imClose();
  });
})();
