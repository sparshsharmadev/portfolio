(function () {
  "use strict";

  // Scroll progress tracker
  const fill = document.getElementById("scroll-fill");
  const nav = document.getElementById("nav");

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

  // Reveal elements on scroll
  const reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("vis");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -30px 0px" }
    );
    reveals.forEach((el) => obs.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("vis"));
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
})();
