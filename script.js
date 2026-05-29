(function () {
  "use strict";

  // Scroll progress tracker
  const fill = document.getElementById("scroll-fill");
  const nav = document.getElementById("nav");

  // ── Parallax State ────────────────────────────────────────────────────────
  // We wrap each parallax target in a .parallax-layer shell, and apply
  // translateY to the shell — so we never fight the element's own
  // CSS keyframe animation or reveal transition transform.
  const parallaxItems = [];

  function wrapAndRegisterParallax(selector, speed) {
    document.querySelectorAll(selector).forEach((el) => {
      // Create a zero-height passthrough wrapper
      const shell = document.createElement('div');
      shell.className = 'parallax-layer';
      el.parentNode.insertBefore(shell, el);
      shell.appendChild(el);
      // Baseline: shell's top when page first loads
      const baseY = shell.getBoundingClientRect().top + window.scrollY;
      parallaxItems.push({ shell, speed, baseY });
    });
  }

  function tickParallax() {
    const y = window.scrollY;
    parallaxItems.forEach(({ shell, speed, baseY }) => {
      const offset = (y - baseY) * speed;
      shell.style.transform = `translateY(${offset.toFixed(2)}px) translateZ(0)`;
    });
    requestAnimationFrame(tickParallax);
  }

  // Only run parallax on desktop, respecting reduced-motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.innerWidth > 960;

  if (!prefersReducedMotion && isDesktop) {
    // Hero elements float up slower than the page → depth illusion
    wrapAndRegisterParallax('.hero-badge',      -0.06);
    wrapAndRegisterParallax('.hero-title',      -0.04);
    wrapAndRegisterParallax('.hero-sub',        -0.03);
    wrapAndRegisterParallax('.hero-btns',       -0.02);

    // Section numbers drift faster → feel like foreground
    wrapAndRegisterParallax('.sect-num',        -0.08);

    // Giant ghost numbers behind cards drift downward → deep background
    wrapAndRegisterParallax('.card-giant-num',   0.05);

    // Section sub-labels float gently
    wrapAndRegisterParallax('.sect-sub',        -0.035);

    tickParallax();
  }

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (fill && max > 0) fill.style.width = Math.min((y / max) * 100, 100) + "%";
    if (nav) nav.classList.toggle("scrolled", y > 50);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile nav logic
  const burger = document.getElementById("nav-burger");
  const menu = document.getElementById("nav-menu");

  if (burger && menu) {
    burger.addEventListener("click", () => {
      const open = burger.classList.toggle("open");
      menu.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    });

    // Close on link click
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        burger.classList.remove("open");
        menu.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  // Smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const hash = a.getAttribute("href");
      if (!hash || hash === "#") return;
      const el = document.querySelector(hash);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", hash);
    });
  });

  // ── Staggered Reveal System ───────────────────────────────────────────────
  //
  // [data-reveal]          → the container; fades + slides up when in view
  // [data-reveal-stagger]  → children inside are animated one-by-one
  //
  // We also auto-tag children of these containers:
  //   .card-feats li, .card-pills span, article.card, .ticket, .cl-item

  function prepareStaggerChildren() {
    // Project cards inside sections → stagger between siblings
    document.querySelectorAll('#work, #clients').forEach((section) => {
      const cards = section.querySelectorAll('article.card, article.ticket');
      cards.forEach((card, i) => {
        card.dataset.stagger = i;
      });
    });

    // Feature bullet lists
    document.querySelectorAll('.card-feats').forEach((list) => {
      list.querySelectorAll('li').forEach((li, i) => {
        li.dataset.staggerChild = i;
      });
    });

    // Tech pills
    document.querySelectorAll('.card-pills').forEach((pills) => {
      pills.querySelectorAll('span').forEach((span, i) => {
        span.dataset.staggerChild = i;
      });
    });

    // Contact links
    document.querySelectorAll('.contact-links .cl-item').forEach((item, i) => {
      item.dataset.staggerChild = i;
    });

    // Cred cards
    document.querySelectorAll('.cred-card').forEach((card, i) => {
      card.dataset.stagger = i;
    });
  }

  prepareStaggerChildren();

  const reveals = document.querySelectorAll("[data-reveal]");

  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;

          // Stagger index on the element itself (for cards/tickets)
          const si = el.dataset.stagger ? parseInt(el.dataset.stagger) : 0;
          el.style.transitionDelay = `${si * 90}ms`;
          el.classList.add("vis");

          // Animate stagger-children inside this container
          el.querySelectorAll('[data-stagger-child]').forEach((child) => {
            const ci = parseInt(child.dataset.staggerChild) || 0;
            // Children start after the container's own delay
            child.style.transitionDelay = `${si * 90 + ci * 55 + 80}ms`;
            child.classList.add('reveal-child-vis');
          });

          obs.unobserve(el);
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => obs.observe(el));
  } else {
    reveals.forEach((el) => {
      el.classList.add("vis");
      el.querySelectorAll('[data-stagger-child]').forEach((c) => c.classList.add('reveal-child-vis'));
    });
  }

  // Highlight active section nav
  const sects = document.querySelectorAll("section[id]");
  const links = document.querySelectorAll(".nav-link");
  if (sects.length && links.length) {
    const so = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = e.target.id;
            links.forEach((l) => {
              const match = l.getAttribute("href") === "#" + id;
              l.style.color = match ? "var(--t1)" : "";
              l.style.background = match ? "rgba(255,255,255,.06)" : "";
            });
          }
        });
      },
      { threshold: 0.25 }
    );
    sects.forEach((s) => so.observe(s));
  }

  // Custom cursor (desktop only)
  const cur = document.getElementById("cur");
  if (cur && window.matchMedia("(pointer:fine)").matches) {
    let mx = -100, my = -100, cx = -100, cy = -100;

    document.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!cur.classList.contains("vis")) cur.classList.add("vis");
    }, { passive: true });

    (function tick() {
      cx += (mx - cx) * 0.15;
      cy += (my - cy) * 0.15;
      cur.style.left = cx + "px";
      cur.style.top = cy + "px";
      requestAnimationFrame(tick);
    })();

    const hoverTargets = "a, button, .card, .cred-card, .cl-item, .stack-col, .building-strip";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverTargets)) cur.classList.add("hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverTargets)) cur.classList.remove("hover");
    });
  }

  // Magnetic Effect for Buttons & Links
  if (window.matchMedia("(pointer:fine)").matches) {
    const magnetics = document.querySelectorAll('.btn, .nav-link, .case-back');
    magnetics.forEach(mag => {
      mag.addEventListener('mousemove', (e) => {
        const rect = mag.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        mag.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px) scale(1.02)`;
      });
      mag.addEventListener('mouseleave', () => {
        mag.style.transform = '';
      });
    });
  }

  // Terminal Logic
  const termOverlay = document.getElementById('cmd-terminal');
  const termInput = document.getElementById('term-input');
  const termOutput = document.getElementById('term-output');

  if (termOverlay) {
    const commands = {
      'help': 'Available commands: about, skills, echo <msg>, sudo, clear, exit',
      'about': 'Sparsh Sharma - 17yo Full-Stack Dev. Building high-performance systems from scratch.',
      'skills': 'Frontend: React, Next.js, Three.js. Backend: Node, Postgres, WebSockets. Design: Brutalist/Minimal.',
      'sudo': 'Nice try. This is sparsh-dev. Access restricted.',
      'clear': 'CLEAR'
    };

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k') || (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'x') || (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        termOverlay.classList.toggle('active');
        if (termOverlay.classList.contains('active')) termInput.focus();
      }
      if (e.key === 'Escape' && termOverlay.classList.contains('active')) {
        termOverlay.classList.remove('active');
      }
    });

    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = termInput.value.trim();
        const lowerVal = val.toLowerCase();
        termInput.value = '';
        if (val === '') return;
        
        appendLine(`guest@sparsh-dev:~$ ${val}`, '#fff');
        
        if (lowerVal === 'clear') {
          termOutput.innerHTML = '';
          return;
        } else if (lowerVal === 'admin') {
          appendLine(`Initiating secure handshake...`, '#00ffcc');
          setTimeout(() => { window.location.href = '/admin'; }, 800);
          return;
        }
        
        if (lowerVal === 'exit') {
          termOverlay.classList.remove('active');
          return;
        }
        if (lowerVal.startsWith('echo ')) {
          appendLine(val.substring(5), '#0f0');
          termOutput.scrollTop = termOutput.scrollHeight;
          return;
        }
        
        if (commands[lowerVal]) {
          appendLine(commands[lowerVal], '#0f0');
        } else {
          appendLine(`zsh: command not found: ${val}. Type 'help' for available commands.`, '#f44');
        }
        termOutput.scrollTop = termOutput.scrollHeight;
      }
    });

    function appendLine(text, color) {
      const div = document.createElement('div');
      div.className = 'term-line';
      div.style.color = color;
      div.textContent = text;
      termOutput.appendChild(div);
    }

    document.querySelector('.term-close').addEventListener('click', () => {
      termOverlay.classList.remove('active');
    });
  }

  // Sound Design
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let soundEnabled = true;

  const unlockAudio = () => {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      }).catch(() => {});
    } else {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    }
  };
  document.addEventListener('click', unlockAudio, { passive: true });
  document.addEventListener('keydown', unlockAudio, { passive: true });
  document.addEventListener('touchstart', unlockAudio, { passive: true });

  const playSound = () => {
    if (!soundEnabled || audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  };

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a, button, .card, .ticket, .exp-block, .cred-card')) {
      playSound();
    }
  });

  const soundToggle = document.getElementById('sound-toggle');
  const soundState = document.getElementById('sound-state');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundState.textContent = soundEnabled ? 'ON' : 'OFF';
      if (soundEnabled && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    });
  }

  // Page Transitions
  document.querySelectorAll('a[href]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      // Ignore external links, anchors, and blank targets
      if (href.startsWith('http') || href.startsWith('#') || link.target === '_blank') return;
      
      e.preventDefault();
      document.body.classList.add('page-exit');
      
      setTimeout(() => {
        window.location.href = href;
      }, 300);
    });
  });

})();
