(function () {
  "use strict";

  // ── Scroll progress ──
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

  // ── Mobile nav toggle ──
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

  // ── Smooth scroll ──
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

  // ── Reveal on scroll ──
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

  // ── Active nav highlight ──
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

  // ── Parallax orbital on mouse ──
  const orbital = document.querySelector(".hero-orbital");
  if (orbital && window.matchMedia("(pointer:fine)").matches) {
    document.addEventListener(
      "mousemove",
      (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        orbital.style.transform = `translateY(-50%) translate(${x}px, ${y}px)`;
      },
      { passive: true }
    );
  }
})();
