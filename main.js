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

  if (reduceMotion) return;   // everything below is motion

  /* ------------------------------------------------------------------
   * Hero parallax on scroll
   * ------------------------------------------------------------------ */
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero-name', { yPercent: -60, ease: 'none' }, 0)
    .to('.hero-figure', { yPercent: 12, scale: 1.06, ease: 'none' }, 0)
    .to('.hero-meta', { y: -80, opacity: 0, ease: 'none' }, 0);

  /* ------------------------------------------------------------------
   * Work: pin the section and slide the shelf sideways (desktop only)
   * ------------------------------------------------------------------ */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = document.getElementById('work-track');
    const dist = () => track.scrollWidth - (window.innerWidth - track.getBoundingClientRect().left) + 40;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.work', start: 'top top', end: () => '+=' + dist(),
        pin: '.work-pin', scrub: 1, invalidateOnRefresh: true,
        onUpdate: (st) => gsap.set('#work-progress-bar', { scaleX: st.progress })
      }
    });
    // cards tilt in as they enter from the right
    gsap.utils.toArray('.app-card, .web-card').forEach((card) => {
      gsap.from(card, {
        rotate: 6, y: 60, opacity: 0.4, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 100%', end: 'left 60%', scrub: true }
      });
    });
  });
  mm.add('(max-width: 900px)', () => {
    gsap.utils.toArray('.app-card, .web-card').forEach((card) => {
      gsap.from(card, { y: 60, opacity: 0, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 85%' } });
    });
  });

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
