/* RAV3N — Studio — shared behaviour */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- mobile nav toggle ---- */
  var nav = document.querySelector(".nav");
  var navToggle = document.querySelector(".navtoggle");
  if (nav && navToggle) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("menu-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Lenis smooth scroll + GSAP ScrollTrigger ----
     Both libs are optional (loaded via CDN in index.html) — everything
     degrades to plain browser scrolling + a CSS-only reveal if either
     fails to load or the visitor has requested reduced motion. */
  var lenis = null;
  if (!reduceMotion && typeof window.Lenis === "function") {
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
  }

  var hasGsap = !reduceMotion && window.gsap && window.ScrollTrigger;
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  } else if (lenis) {
    var raf = function (time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  /* ---- smooth-scroll same-page anchor links (nav, CTAs, footer) ---- */
  var scrollToTarget = function (target) {
    if (lenis) {
      lenis.scrollTo(target, { offset: 0 });
    } else {
      var behavior = reduceMotion ? "auto" : "smooth";
      if (target === 0) window.scrollTo({ top: 0, behavior: behavior });
      else target.scrollIntoView({ behavior: behavior, block: "start" });
    }
  };
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute("href");
    a.addEventListener("click", function (e) {
      e.preventDefault();
      if (href === "#" || href === "") {
        scrollToTarget(0);
      } else {
        var el = document.querySelector(href);
        if (el) scrollToTarget(el);
      }
      history.pushState(null, "", href || "#");
    });
  });

  /* ---- scroll reveal: each [data-reveal] block fades/rises in once,
     the first time it scrolls into view. ---- */
  if (hasGsap) {
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: function () {
          gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" });
        },
      });
    });
  } else {
    var revealEls = document.querySelectorAll("[data-reveal]");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---- count-up numbers ---- */
  // Any element with data-count="489" counts up to that integer.
  // The element's existing text supplies the prefix/suffix (+, %, etc.)
  // by locating the digits inside it and animating just that run of digits.
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    var animateCount = function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      if (isNaN(target)) return;
      var text = el.textContent;
      var match = text.match(/\d+/);
      if (!match) return;
      var start = 0;
      var duration = 900;
      var startTime = null;
      function tick(now) {
        if (startTime === null) startTime = now;
        var p = Math.min(1, (now - startTime) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = Math.round(start + (target - start) * eased);
        el.textContent = text.replace(match[0], String(val));
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = text;
      }
      requestAnimationFrame(tick);
    };
    if (reduceMotion || !("IntersectionObserver" in window)) {
      // leave numbers as authored
    } else {
      var cio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              cio.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---- scrollspy: highlight the nav link for the section in view ---- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-links a[data-nav]"));
  var navSections = navLinks
    .map(function (a) {
      return { link: a, section: document.getElementById(a.getAttribute("data-nav")) };
    })
    .filter(function (o) { return o.section; });
  if (navSections.length) {
    var updateActiveNav = function () {
      var pos = window.scrollY + 140;
      var current = navSections[0];
      navSections.forEach(function (o) {
        if (o.section.offsetTop <= pos) current = o;
      });
      navSections.forEach(function (o) { o.link.removeAttribute("aria-current"); });
      current.link.setAttribute("aria-current", "page");
    };
    window.addEventListener("scroll", updateActiveNav, { passive: true });
    if (lenis) lenis.on("scroll", updateActiveNav);
    updateActiveNav();
  }

  /* ---- back to top ---- */
  var toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.textContent = "↑";
  document.body.appendChild(toTop);
  var toggleToTop = function () {
    toTop.classList.toggle("show", window.scrollY > 480);
  };
  window.addEventListener("scroll", toggleToTop, { passive: true });
  if (lenis) lenis.on("scroll", toggleToTop);
  toggleToTop();
  toTop.addEventListener("click", function () {
    scrollToTarget(0);
  });

  /* ---- case-study lightbox: click, or hover for 5s, opens the before/after
     pair large enough to actually read — same trigger pattern as the
     multi-shot cards below. */
  (function () {
    var pair = document.querySelector(".baf-pair");
    if (!pair) return;
    var shots = pair.querySelectorAll(".baf-shot");
    if (!shots.length) return;

    var lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lb-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    lightbox.appendChild(closeBtn);
    shots.forEach(function (shot) {
      var img = shot.querySelector("img");
      var label = shot.querySelector(".baf");
      if (!img) return;
      var wrap = document.createElement("div");
      wrap.className = "lb-shot";
      var clone = document.createElement("img");
      clone.src = img.currentSrc || img.src;
      clone.alt = img.alt;
      wrap.appendChild(clone);
      if (label) {
        var lbl = document.createElement("span");
        lbl.className = "baf";
        lbl.textContent = label.textContent;
        wrap.appendChild(lbl);
      }
      lightbox.appendChild(wrap);
    });
    document.body.appendChild(lightbox);

    var openLb = function () { lightbox.classList.add("show"); };
    var closeLb = function () { lightbox.classList.remove("show"); };
    closeBtn.addEventListener("click", closeLb);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLb();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLb();
    });

    var timer = null;
    pair.addEventListener("click", openLb);
    pair.addEventListener("mouseenter", function () {
      if (reduceMotion) return;
      timer = setTimeout(openLb, 5000);
    });
    pair.addEventListener("mouseleave", function () {
      clearTimeout(timer);
    });
  })();

  /* ---- voiceover sample: play/pause toggle over the cover image ---- */
  document.querySelectorAll(".audio-play").forEach(function (btn) {
    var audio = new Audio(btn.getAttribute("data-src"));
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (audio.paused) {
        audio.play();
        btn.classList.add("playing");
      } else {
        audio.pause();
        btn.classList.remove("playing");
      }
    });
    audio.addEventListener("ended", function () {
      btn.classList.remove("playing");
    });
  });

  /* ---- multi-shot cards: hover cycles through extra shots of the same
     work, in the same frame, morphing the frame's height to match each
     shot's own aspect ratio as it goes. Marked up as
     data-rotate='["a.jpg","b.jpg",...]' on the .art element, which already
     has its first image as the visible one. */
  document.querySelectorAll(".art[data-rotate]").forEach(function (art) {
    var sources;
    try { sources = JSON.parse(art.getAttribute("data-rotate")); } catch (e) { return; }
    if (!sources || sources.length < 2) return;
    var img = art.querySelector("img");
    if (!img) return;

    var badge = document.createElement("span");
    badge.className = "mtag";
    art.appendChild(badge);
    var setBadge = function (i) {
      badge.textContent = (i + 1) + " / " + sources.length;
    };
    setBadge(0);

    var index = 0;
    var timer = null;
    var busy = false;

    var goTo = function (i) {
      if (busy || reduceMotion) return;
      busy = true;
      var startH = art.getBoundingClientRect().height;
      var pre = new Image();
      pre.onload = function () {
        var w = art.getBoundingClientRect().width;
        var endH = w * (pre.naturalHeight / pre.naturalWidth);
        img.src = sources[i];
        setBadge(i);
        if (hasGsap) {
          gsap.set(art, { height: startH });
          gsap.fromTo(img, { opacity: 0.3 }, { opacity: 1, duration: 0.35, ease: "power1.out" });
          gsap.to(art, {
            height: endH,
            duration: 0.5,
            ease: "power2.inOut",
            onComplete: function () {
              gsap.set(art, { clearProps: "height" });
              busy = false;
            },
          });
        } else {
          art.style.height = endH + "px";
          setTimeout(function () { art.style.height = ""; busy = false; }, 450);
        }
      };
      pre.onerror = function () { busy = false; };
      pre.src = sources[i];
    };

    var advance = function () {
      index = (index + 1) % sources.length;
      goTo(index);
    };
    var startCycle = function () {
      clearInterval(timer);
      timer = setInterval(advance, 5000);
    };

    art.addEventListener("mouseenter", function () {
      if (reduceMotion) return;
      startCycle();
    });
    art.addEventListener("mouseleave", function () {
      clearInterval(timer);
      if (index !== 0) {
        index = 0;
        goTo(0);
      }
    });
    art.addEventListener("click", function (e) {
      if (reduceMotion) return;
      e.preventDefault();
      advance();
      startCycle();
    });
  });

  /* ---- footer year ---- */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
