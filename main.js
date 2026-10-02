(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = () => window.matchMedia('(min-width: 901px)').matches;
  gsap.registerPlugin(ScrollTrigger, Draggable);

  /* ------------------------------------------------------------------
   * Smooth scroll (Lenis) driven by GSAP's ticker so ScrollTrigger stays in sync
   * ------------------------------------------------------------------ */
  let lenis = null;
  if (!reduceMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis ? lenis.scrollTo(target, { duration: 1.4 }) : target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      blip(660);
    });
  });

  /* ------------------------------------------------------------------
   * Interface sounds — tiny Web Audio blips, off until the visitor opts in
   * ------------------------------------------------------------------ */
  let audio = null;
  let soundOn = false;
  const soundBtn = document.getElementById('sound-toggle');
  function blip(freq = 520, dur = 0.08, type = 'triangle', vol = 0.06) {
    if (!soundOn || !audio) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, audio.currentTime + dur);
    g.gain.setValueAtTime(vol, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur + 0.02);
  }
  soundBtn.addEventListener('click', () => {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.querySelector('.sound-label').textContent = soundOn ? 'sound on' : 'sound off';
    if (soundOn) { blip(440); setTimeout(() => blip(660), 90); }
  });
  document.querySelectorAll('[data-sound], .btn, .tool-cloud li').forEach((el) => {
    el.addEventListener('mouseenter', () => blip(380 + Math.random() * 240, 0.06, 'sine', 0.035));
  });

  /* ------------------------------------------------------------------
   * Contour ripples: rings flow outward from the silhouette.
   * assets/hardik-field.png stores each pixel's distance to the figure (÷3).
   * ------------------------------------------------------------------ */
  function startRipples(canvas, opts) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const W = canvas.width, H = canvas.height;
    const img = new Image();
    img.src = 'assets/hardik-field.png';
    img.onload = () => {
      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const tctx = tmp.getContext('2d');
      tctx.drawImage(img, 0, 0, W, H);
      const src = tctx.getImageData(0, 0, W, H).data;
      const dist = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) dist[i] = src[i * 4] * 3;

      const out = ctx.createImageData(W, H);
      const px = out.data;
      const spacing = opts.spacing, maxD = opts.maxD;
      let t = 0, visible = true, last = 0, boost = 0;

      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
      io.observe(canvas);
      if (lenis && opts.scrollBoost) lenis.on('scroll', (l) => { boost = Math.min(Math.abs(l.velocity) * 0.6, 40); });

      function draw(phase) {
        for (let i = 0, p = 0; i < W * H; i++, p += 4) {
          const d = dist[i];
          if (d < 2 || d > maxD) { px[p + 3] = 0; continue; }
          const v = (d - phase) / spacing;
          const f = v - Math.floor(v);
          const fade = 1 - d / maxD;
          if (f < 0.13) {                       // bright ring
            px[p] = opts.a[0]; px[p + 1] = opts.a[1]; px[p + 2] = opts.a[2];
            px[p + 3] = 255 * fade;
          } else if (f > 0.5 && f < 0.58) {     // softer echo ring
            px[p] = opts.b[0]; px[p + 1] = opts.b[1]; px[p + 2] = opts.b[2];
            px[p + 3] = 210 * fade;
          } else {
            px[p + 3] = 0;
          }
        }
        ctx.putImageData(out, 0, 0);
      }

      if (reduceMotion) { draw(0); return; }
      function loop(now) {
        requestAnimationFrame(loop);
        if (!visible || now - last < 33) return;   // ~30fps, paused off-screen
        const dt = last ? (now - last) / 1000 : 0;
        last = now;
        boost *= 0.92;
        t += dt * (opts.speed + boost);
        draw(t);
      }
      requestAnimationFrame(loop);
    };
  }
  startRipples(document.getElementById('ripples'), { spacing: 24, maxD: 760, speed: 14, a: [255, 255, 255], b: [143, 170, 235], scrollBoost: true });
  startRipples(document.getElementById('ripples-2'), { spacing: 30, maxD: 760, speed: 10, a: [242, 255, 0], b: [79, 123, 216] });

  /* ------------------------------------------------------------------
   * Preloader → hero intro
   * ------------------------------------------------------------------ */
  const loader = document.getElementById('loader');
  const num = document.getElementById('loader-num');
  const status = document.getElementById('loader-status');
  const lines = ['warming up the pixels', 'mapping the flow', 'designing the boring states', 'and… shipped'];
  document.body.classList.add('is-loading');
  lenis && lenis.stop();

  function intro() {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero-name-line', { yPercent: 110, duration: 1.4 }, 0)
      .from('.hero-figure', { y: 140, opacity: 0, duration: 1.6 }, 0.1)
      .from('#ripples', { scale: 0.85, opacity: 0, duration: 2 }, 0)
      .from('.hero-meta > *', { y: 30, opacity: 0, stagger: 0.08, duration: 1 }, 0.5)
      .from('.topbar > *', { y: -30, opacity: 0, stagger: 0.08, duration: 1 }, 0.6);
  }

  if (reduceMotion) {
    loader.remove();
    document.body.classList.remove('is-loading');
  } else {
    const counter = { v: 0 };
    gsap.to(counter, {
      v: 100, duration: 1.8, ease: 'power2.inOut',
      onUpdate: () => {
        num.textContent = String(Math.round(counter.v)).padStart(3, '0');
        status.textContent = lines[Math.min(lines.length - 1, Math.floor(counter.v / 26))];
      },
      onComplete: () => {
        gsap.to(loader, {
          yPercent: -100, duration: 1, ease: 'expo.inOut',
          onComplete: () => {
            loader.remove();
            document.body.classList.remove('is-loading');
            lenis && lenis.start();
            ScrollTrigger.refresh();
          }
        });
        intro();
      }
    });
  }

  /* ------------------------------------------------------------------
   * The project line: a train where every carriage is a project.
   * Scroll (or the arrows / route stops) moves the train so the current
   * carriage pulls up at the platform; the departure board follows.
   * ------------------------------------------------------------------ */
  const projects = [
    { name: 'Alter', tint: '#FFD44E', tag: 'Android · AI companion', ui: 'chat', link: 'https://hardik-gupta.com/',
      desc: "My personal AI assistant for Android. I designed it, built it in real code, and it's the app I open most in a day." },
    { name: 'Track It', tint: '#B4F6B8', tag: 'Android · expense tracker', ui: 'bars', link: 'https://hardik-gupta.com/',
      desc: 'An expense tracker that turns logging money into a two-second habit instead of a chore.' },
    { name: 'Parchi', tint: '#E7BBFF', tag: 'Android · voice billing', ui: 'voice', link: 'https://hardik-gupta.com/',
      desc: 'Say the order out loud, get the bill. Built for busy counters, not boardrooms.' },
    { name: 'Hourbit', tint: '#98FF53', tag: 'Android · focus timer', ui: 'timer', link: 'https://hardik-gupta.com/',
      desc: 'A focus timer that stays out of the way until you need it.' },
    { name: 'Washio', tint: '#A9DEFF', tag: 'UX/UI case study · design only', ui: 'list', link: 'https://hardik-gupta.com/',
      desc: "A laundry app where the real problem wasn't scheduling, it was trusting a stranger with your clothes. Designed down to the last state." },
    { name: 'FXKIT', tint: '#FF9E7A', tag: 'Web tool', ui: 'web', link: 'https://fxkit.vercel.app/',
      desc: 'Photo and video effects in the browser: halftone, dither, CRT, film. Nothing leaves your device.' },
    { name: 'Piyo Aur Peene Do', tint: '#FFC46B', tag: 'Website · chai brand', ui: 'web', link: 'https://hardik-gupta.com/',
      desc: 'A site for a street-stall chai brand, with a hero image run through FXKIT.' },
    { name: 'Mistline', tint: '#8FE3D6', tag: 'Website · web radio', ui: 'web', link: 'https://hardik-gupta.com/',
      desc: 'Web radio for monsoon road trips, complete with a rain mode.' }
  ];
  const UI = {
    chat: '<div class="phone-ui ui-chat"><div class="b l"></div><div class="b r"></div><div class="b l s"></div><div class="b r s"></div><div class="input"></div></div>',
    bars: '<div class="phone-ui ui-bars"><div class="big">₹ 12,480</div><div class="bars"><i style="--h:40%"></i><i style="--h:72%"></i><i style="--h:55%"></i><i style="--h:90%"></i><i style="--h:35%"></i></div><div class="row"></div></div>',
    voice: '<div class="phone-ui ui-voice"><div class="mic"></div><div class="wave"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="row"></div><div class="row short"></div></div>',
    timer: '<div class="phone-ui ui-timer"><div class="ring"><span>25:00</span></div><div class="row short"></div></div>',
    list: '<div class="phone-ui ui-list"><div class="row"></div><div class="slot"></div><div class="slot on"></div><div class="slot"></div><div class="cta"></div></div>'
  };
  const pad = (n) => String(n).padStart(2, '0');

  const train = document.getElementById('train');
  const route = document.getElementById('route');
  projects.forEach((p, i) => {
    const win = p.ui === 'web'
      ? '<div class="browser"><div class="browser-bar"><i></i><i></i><i></i></div><div class="browser-art" style="background:linear-gradient(135deg,' + p.tint + ' 0 40%, #0B1020 40% 44%, #F7F6EF 44%)"></div></div>'
      : '<div class="phone"><div class="phone-notch"></div>' + UI[p.ui] + '</div>';
    train.insertAdjacentHTML('beforeend',
      `<div class="car" style="--tint:${p.tint}"><div class="car-body">
         <span class="car-no mono">${pad(i + 1)}</span>
         <div class="car-window">${win}</div>
         <div class="car-label"><h3>${p.name}</h3><p class="mono">${p.tag}</p></div>
         <div class="car-door"></div>
       </div><div class="car-wheels"><i></i><i></i><i></i><i></i></div></div>`);
    route.insertAdjacentHTML('beforeend',
      `<li style="--stop:${p.tint}"><button type="button" data-stop="${i}" aria-label="Go to ${p.name}"><span class="stop"></span><span class="stop-name">${p.name}</span></button></li>`);
  });

  const cars = Array.from(train.querySelectorAll('.car'));
  const wheels = train.querySelectorAll('.car-wheels i');
  const poles = document.getElementById('scene-poles');
  const stops = Array.from(route.querySelectorAll('li'));
  const boardNo = document.getElementById('board-no');
  const boardTag = document.getElementById('board-tag');
  const boardName = document.getElementById('board-name');
  const boardDesc = document.getElementById('board-desc');
  const boardLink = document.getElementById('board-link');
  const prevBtn = document.getElementById('line-prev');
  const nextBtn = document.getElementById('line-next');
  const last = projects.length - 1;
  let current = -1;

  // train x that puts carriage i in the middle of the screen
  const xFor = (i) => {
    const c = cars[i];
    return window.innerWidth / 2 - (c.offsetLeft + c.offsetWidth / 2);
  };
  // fractional position f (0..last) → x, interpolating between neighbouring carriages
  const xAt = (f) => {
    const a = Math.floor(f), b = Math.min(last, a + 1);
    return xFor(a) + (xFor(b) - xFor(a)) * (f - a);
  };
  function placeTrain(x) {
    gsap.set(train, { x });
    wheels.forEach((w) => w.style.setProperty('--spin', (-x / (Math.PI * 34)) * 360 + 'deg'));
    poles.style.backgroundPosition = (x * 0.35) + 'px 0';
  }

  function setStop(i) {
    if (i === current) return;
    const p = projects[i];
    const update = () => {
      boardNo.textContent = pad(i + 1);
      boardTag.textContent = p.tag;
      boardName.textContent = p.name;
      boardDesc.textContent = p.desc;
      boardLink.href = p.link;
      boardLink.textContent = p.link.includes('fxkit') ? 'Open FXKIT ↗' : 'See it on hardik-gupta.com ↗';
    };
    if (current === -1 || reduceMotion) update();
    else {
      // split-flap style: old text flips up, new text drops in
      gsap.timeline()
        .to([boardName, boardDesc, boardTag], { yPercent: -60, opacity: 0, duration: 0.18, ease: 'power2.in', onComplete: update })
        .fromTo([boardName, boardDesc, boardTag], { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.04 });
      blip(440 + i * 40, 0.09, 'triangle', 0.05);
    }
    current = i;
    stops.forEach((s, k) => { s.classList.toggle('current', k === i); s.classList.toggle('passed', k < i); });
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === last;
  }

  let lineST = null;
  function goTo(i) {
    i = Math.max(0, Math.min(last, i));
    if (lineST) {
      const y = lineST.start + (lineST.end - lineST.start) * (i / last) + 1;
      lenis ? lenis.scrollTo(y, { duration: 1.2 }) : window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    } else {
      setStop(i);
      placeTrain(xFor(i));
      gsap.set('#route-fill', { scaleX: i / last });
    }
  }
  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  route.addEventListener('click', (e) => {
    const b = e.target.closest('[data-stop]');
    if (b) goTo(Number(b.dataset.stop));
  });
  document.getElementById('work').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
  });

  setStop(0);
  placeTrain(xFor(0));
  window.addEventListener('resize', () => { if (!lineST) placeTrain(xFor(current)); });

  if (!reduceMotion) {
    // scroll drives the train; one screen-ish of scroll per stop, snapping at stations
    const xTo = gsap.quickTo(train, 'x', { duration: 0.5, ease: 'power3.out', onUpdate: () => {
      const x = gsap.getProperty(train, 'x');
      wheels.forEach((w) => w.style.setProperty('--spin', (-x / (Math.PI * 34)) * 360 + 'deg'));
      poles.style.backgroundPosition = (x * 0.35) + 'px 0';
    } });
    lineST = ScrollTrigger.create({
      trigger: '#work', start: 'top top', end: () => '+=' + last * window.innerHeight * 0.75,
      pin: '.line-pin', anticipatePin: 1, invalidateOnRefresh: true,
      snap: { snapTo: 1 / last, duration: { min: 0.3, max: 0.7 }, delay: 0.08, ease: 'power2.inOut' },
      onUpdate: (st) => {
        const f = st.progress * last;
        xTo(xAt(f));
        gsap.set('#route-fill', { scaleX: st.progress });
        setStop(Math.round(f));
      },
      onRefresh: (st) => placeTrain(xAt(st.progress * last))
    });
    // the train pulls in the first time the line comes into view
    gsap.from(train, {
      xPercent: 60, opacity: 0, duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: '#work', start: 'top 70%', once: true },
      onStart: () => { blip(220, 0.25, 'sawtooth', 0.03); setTimeout(() => blip(180, 0.3, 'sawtooth', 0.03), 260); }
    });
  }

  if (reduceMotion) return;   // everything below is motion

  /* ------------------------------------------------------------------
   * Hero parallax on scroll
   * ------------------------------------------------------------------ */
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero-name', { yPercent: -60, ease: 'none' }, 0)
    .to('.hero-figure', { yPercent: 12, scale: 1.06, ease: 'none' }, 0)
    .to('.hero-meta', { y: -80, opacity: 0, ease: 'none' }, 0);

  /* ------------------------------------------------------------------
   * About: words light up one by one as you scroll
   * ------------------------------------------------------------------ */
  document.querySelectorAll('.reveal-words').forEach((p) => {
    p.innerHTML = p.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    gsap.to(p.querySelectorAll('.w'), {
      opacity: 1, stagger: 0.05, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });
  gsap.from('.about-title', { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.about-title', start: 'top 85%' } });
  gsap.from('.offscreen', { rotate: -6, y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.offscreen', start: 'top 85%' } });

  /* ------------------------------------------------------------------
   * Principles: cards stack (CSS sticky); each one shrinks back as the next lands
   * ------------------------------------------------------------------ */
  const cards = gsap.utils.toArray('.stack-card');
  cards.forEach((card, i) => {
    card.style.setProperty('--i', i);
    if (i === cards.length - 1) return;
    gsap.fromTo(card, { scale: 1, filter: 'brightness(1)' }, {
      scale: 0.92, filter: 'brightness(0.85)', ease: 'none',
      scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 20%', scrub: true }
    });
  });

  /* ------------------------------------------------------------------
   * Experience: the timeline line draws itself, entries slide in
   * ------------------------------------------------------------------ */
  gsap.to('#timeline-fill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 60%', scrub: true } });
  gsap.utils.toArray('.timeline li').forEach((li) => {
    gsap.from(li, { x: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: li, start: 'top 80%' } });
  });

  /* ------------------------------------------------------------------
   * Tools pop in
   * ------------------------------------------------------------------ */
  gsap.from('.tool-cloud li', { scale: 0.6, opacity: 0, stagger: 0.05, duration: 0.7, ease: 'back.out(2)', scrollTrigger: { trigger: '.tool-cloud', start: 'top 85%' } });

  /* ------------------------------------------------------------------
   * Contact: draggable stickers, copy email, headline rise
   * ------------------------------------------------------------------ */
  gsap.from('.contact h2', { y: 100, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 70%' } });
  Draggable.create('.sticker', {
    bounds: '.contact', inertia: false,
    onPress() { blip(300, 0.05, 'square', 0.03); gsap.to(this.target, { scale: 1.08, duration: 0.2 }); },
    onRelease() { blip(500, 0.05, 'square', 0.03); gsap.to(this.target, { scale: 1, duration: 0.3, ease: 'back.out(3)' }); }
  });

  /* ------------------------------------------------------------------
   * Magnetic buttons
   * ------------------------------------------------------------------ */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
    });
  }

  /* ------------------------------------------------------------------
   * Active nav link
   * ------------------------------------------------------------------ */
  ['work', 'about', 'principles', 'experience', 'contact'].forEach((id) => {
    const link = document.querySelector(`.nav a[href="#${id}"]`);
    ScrollTrigger.create({
      trigger: '#' + id, start: 'top center', end: 'bottom center',
      onToggle: (st) => link && link.classList.toggle('active', st.isActive)
    });
  });
})();

/* Copy email works even with reduced motion */
(() => {
  const btn = document.getElementById('copy-email');
  const toast = document.getElementById('toast');
  btn.addEventListener('click', async () => {
    const email = btn.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
      toast.textContent = '✓ email copied';
    } catch {
      window.location.href = 'mailto:' + email;
      return;
    }
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  });
})();
