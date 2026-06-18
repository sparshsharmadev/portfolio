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

  // ── GSAP ScrollReveal (Advanced Awwwards Style) ─────────────────────────
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Advanced Text Reveal for Section Titles
    const titles = document.querySelectorAll(".sect-title");
    titles.forEach((title) => {
      // Very basic text splitting (since we don't have SplitText)
      const words = title.innerText.split(" ");
      title.innerHTML = "";
      words.forEach(word => {
        const span = document.createElement("span");
        span.style.display = "inline-block";
        span.style.overflow = "hidden";
        span.style.verticalAlign = "top";
        const innerSpan = document.createElement("span");
        innerSpan.style.display = "inline-block";
        innerSpan.innerText = word + "\u00A0"; // add space
        span.appendChild(innerSpan);
        title.appendChild(span);
      });

      gsap.fromTo(title.querySelectorAll("span > span"),
        { yPercent: 120, rotationZ: 5 },
        {
          duration: 1.2,
          yPercent: 0,
          rotationZ: 0,
          stagger: 0.05,
          ease: "expo.out",
          scrollTrigger: {
            trigger: title,
            start: "top 90%",
            toggleActions: "play none none none"
          }
        }
      );
    });

    // Advanced Stagger for Cards with ClipPath
    const staggerGroups = document.querySelectorAll('#work, #clients, #creds, #contact');
    staggerGroups.forEach(group => {
      const items = group.querySelectorAll('article.card, article.ticket, .exp-block, .cred-card, .inquiry-form-wrap, .track-lookup');
      if (items.length === 0) return;
      items.forEach(item => {
        item.style.transition = 'none'; // remove CSS transitions to let GSAP handle
        item.style.clipPath = 'polygon(0 0, 100% 0, 100% 0, 0 0)'; // hidden top
      });
      gsap.fromTo(items, 
        { clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)', y: 60 },
        {
          duration: 1.8,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          y: 0,
          stagger: 0.15,
          ease: "expo.out",
          scrollTrigger: {
            trigger: group,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

    // Subtitles and tags fade up
    const reveals = document.querySelectorAll("[data-reveal]:not(.sect-title)");
    reveals.forEach((el) => {
      el.style.transition = 'none';
      gsap.fromTo(el, 
        { autoAlpha: 0, y: 30 },
        {
          duration: 1.5, 
          autoAlpha: 1, 
          y: 0, 
          ease: "power3.out", 
          scrollTrigger: {
            trigger: el,
            start: "top 95%",
            toggleActions: "play none none reverse"
          }
        }
      );
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

  // ── GSAP Custom Cursor & Magnetic Effect ─────────────────────────────────
  const cur = document.getElementById("cur");
  if (cur && window.matchMedia("(pointer:fine)").matches) {
    gsap.set(cur, { xPercent: -50, yPercent: -50 });
    let xTo = gsap.quickTo(cur, "x", { duration: 0.15, ease: "power3" });
    let yTo = gsap.quickTo(cur, "y", { duration: 0.15, ease: "power3" });

    window.addEventListener("mousemove", (e) => {
      xTo(e.clientX);
      yTo(e.clientY);
      if (!cur.classList.contains("vis")) cur.classList.add("vis");
    });

    const magnetics = document.querySelectorAll('.btn, .nav-link, a, .ticket');
    magnetics.forEach(mag => {
      mag.addEventListener('mouseenter', () => {
        gsap.to(cur, { width: 60, height: 60, backgroundColor: "#fff", border: "none", mixBlendMode: "difference", duration: 0.3 });
      });
      mag.addEventListener('mouseleave', () => {
        gsap.to(cur, { width: 18, height: 18, backgroundColor: "transparent", border: "1.5px solid rgba(255,255,255,0.5)", mixBlendMode: "normal", duration: 0.3 });
        gsap.to(mag, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
      });
      mag.addEventListener('mousemove', (e) => {
        // Only magnetic if it's a small element like a button or nav-link
        if (mag.classList.contains('btn') || mag.classList.contains('nav-link')) {
          const rect = mag.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(mag, { x: x * 0.4, y: y * 0.4, duration: 0.2 });
        }
      });
    });
  }

    // ── 3D Tilt Effect for Project Cards ────────────────────────────────────
    const pcards = document.querySelectorAll('.pcard');
    pcards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const deltaX = (x - centerX) / centerX;
        const deltaY = (y - centerY) / centerY;
        
        card.style.transform = `perspective(1200px) rotateX(${-deltaY * 4}deg) rotateY(${deltaX * 4}deg) scale3d(1.01, 1.01, 1.01)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      });
    });
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

  // ── Easter Egg ────────────────────────────────────────────────────────────
  let konamiCode = "mansi";
  let konamiIndex = 0;
  document.addEventListener('keydown', (e) => {
    // Ignore keystrokes inside inputs or textareas so it doesn't trigger accidentally
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key.toLowerCase() === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        konamiIndex = 0;
        triggerMansiEasterEgg();
      }
    } else {
      // Reset if wrong key, unless it's the first letter again
      konamiIndex = e.key.toLowerCase() === konamiCode[0] ? 1 : 0;
    }
  });

  function triggerMansiEasterEgg() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'radial-gradient(circle at center, rgba(167,139,250,0.15) 0%, transparent 60%)';
    overlay.style.zIndex = '10001';
    overlay.style.pointerEvents = 'none';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.transition = 'opacity 3s ease';
    overlay.style.opacity = '1';
    
    // Create text
    const text = document.createElement('div');
    text.textContent = 'Sparnity = 0.999 Mansh 💜';
    text.style.fontFamily = 'var(--mono)';
    text.style.fontSize = 'clamp(1rem, 4vw, 1.5rem)';
    text.style.color = 'var(--purple)';
    text.style.textShadow = '0 0 30px rgba(167,139,250,0.8)';
    text.style.opacity = '0';
    text.style.transform = 'translateY(20px)';
    text.style.transition = 'all 1.5s cubic-bezier(0.16, 1, 0.3, 1)';
    text.style.letterSpacing = '0.05em';
    
    overlay.appendChild(text);
    document.body.appendChild(overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      setTimeout(() => {
        text.style.opacity = '1';
        text.style.transform = 'translateY(0)';
      }, 100);
    });
    
    // Animate out and remove
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 3000);
    }, 4500);
  }

})();
