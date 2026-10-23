(() => {
  const root = document.documentElement;
  const body = document.body;
  const nav = document.querySelector('.nav');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Smooth scroll (Lenis), tuned to feel like TMF's GSAP ScrollSmoother (smooth 0.4, power2)
  const lenis = (!reduce && window.Lenis) ? new Lenis({
    duration: 1.1,
    easing: t => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
    wheelMultiplier: 0.9,
    syncTouch: false
  }) : null;
  if (lenis) {
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // Hero bolt loop: make sure it plays (some browsers block autoplay until nudged)
  const bolt = document.querySelector('video.bolt');
  if (bolt) {
    if (reduce) bolt.removeAttribute('autoplay');
    else {
      const play = () => bolt.play().catch(() => {});
      play();
      document.addEventListener('visibilitychange', () => !document.hidden && play());
      addEventListener('pointerdown', play, { once: true });
    }
  }

  // Solid nav once scrolled
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 20);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.menu');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
    burger.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // Jump links: unlock scroll first, then scroll (so menu links don't stop short)
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? document.body : document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      requestAnimationFrame(() => {
        const y = id === '#top' ? 0 : target.getBoundingClientRect().top + scrollY - nav.offsetHeight + 1;
        if (lenis) lenis.scrollTo(y, { duration: 1.4 });
        else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  });

  // Highlight current section in nav + menu
  const links = [...document.querySelectorAll('.nav__links a, .menu a')];
  const sections = [...new Set(links.map(l => l.getAttribute('href')))]
    .map(h => document.querySelector(h)).filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  // Reveal on scroll (staggered within a row)
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const sibs = [...en.target.parentElement.children].filter(c => c.classList.contains('reveal'));
      en.target.style.transitionDelay = Math.min(sibs.indexOf(en.target), 4) * 80 + 'ms';
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Service tabs
  const tabs = [...document.querySelectorAll('.svc__tabs button')];
  const panes = [...document.querySelectorAll('.svc__pane')];
  const medias = [...document.querySelectorAll('.svc__m')];
  const select = i => {
    tabs.forEach((t, j) => t.setAttribute('aria-selected', i === j));
    panes.forEach((p, j) => p.classList.toggle('is-on', i === j));
    const kind = panes[i].dataset.media;
    medias.forEach(m => m.classList.toggle('is-on', m.classList.contains('svc__m--' + kind)));
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => { select(i); stopAuto(); }));
  let auto = reduce ? null : setInterval(() => {
    const cur = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
    select((cur + 1) % tabs.length);
  }, 5000);
  const stopAuto = () => { clearInterval(auto); auto = null; };

  // "The gap": platform vs reality toggle (auto-flips once when first seen)
  const pl = document.querySelector('.pl');
  if (pl) {
    const btns = [...pl.querySelectorAll('.toggle button')];
    const setView = v => {
      pl.dataset.view = v;
      btns.forEach(b => b.classList.toggle('is-on', b.dataset.v === v));
      pl.querySelectorAll('[data-p]').forEach(el => (el.textContent = v === 'reality' ? el.dataset.r : el.dataset.p));
    };
    let touched = false;
    btns.forEach(b => b.addEventListener('click', () => { touched = true; setView(b.dataset.v); }));
    new IntersectionObserver((en, obs) => {
      if (!en[0].isIntersecting) return;
      obs.disconnect();
      setTimeout(() => { if (!touched) setView('reality'); }, 2200);
    }, { threshold: 0.6 }).observe(pl);
  }

  // Count-up stats
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      cio.unobserve(en.target);
      const el = en.target, end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      if (reduce) return;
      const t0 = performance.now(), dur = 1400;
      const tick = t => {
        const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
        el.textContent = pre + Math.round(end * e) + suf;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  counters.forEach(c => cio.observe(c));

  // Buttons that preselect the enquiry type
  const serviceSelect = document.querySelector('select[name="service"]');
  document.querySelectorAll('[data-service]').forEach(a => a.addEventListener('click', () => {
    const opt = [...serviceSelect.options].find(o => o.text === a.dataset.service.replace('&amp;', '&'));
    if (opt) serviceSelect.value = opt.value || opt.text;
  }));
  document.querySelectorAll('a[href="#audit"]').forEach(a => a.addEventListener('click', () => {
    serviceSelect.selectedIndex = 1;
  }));

  // Hero bubbles: TMF-style scroll lag + gentle mouse parallax, combined in one transform.
  // Each bubble scrolls at data-speed × page speed (0.6–0.72), so they trail behind and
  // drift in around the bolt as you scroll, like the circles on themarketingfriends.com.
  if (!reduce) {
    const hero = document.querySelector('.hero');
    const bubbles = [...document.querySelectorAll('.bubble')].map(el => ({
      el, speed: +el.dataset.speed || 1, depth: +el.dataset.depth || 0, mx: 0, my: 0, tx: 0, ty: 0
    }));
    let sy = scrollY, ticking = false;
    const apply = () => {
      ticking = false;
      const visible = sy < hero.offsetHeight + 200;
      bubbles.forEach(b => {
        b.mx += (b.tx - b.mx) * 0.12;
        b.my += (b.ty - b.my) * 0.12;
        const lag = visible ? sy * (1 - b.speed) : 0;
        b.el.style.transform = `translate3d(${b.mx.toFixed(2)}px, ${(b.my + lag).toFixed(2)}px, 0)`;
      });
      if (bubbles.some(b => Math.abs(b.tx - b.mx) > 0.1 || Math.abs(b.ty - b.my) > 0.1)) queue();
    };
    const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
    const onS = y => { sy = y; queue(); };
    if (lenis) lenis.on('scroll', e => onS(e.scroll)); else addEventListener('scroll', () => onS(scrollY), { passive: true });

    if (matchMedia('(pointer:fine)').matches) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        bubbles.forEach(b => { b.tx = x * b.depth * 50; b.ty = y * b.depth * 50; });
        queue();
      });
      hero.addEventListener('pointerleave', () => { bubbles.forEach(b => { b.tx = 0; b.ty = 0; }); queue(); });
    }
    queue();
  }
})();
