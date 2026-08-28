/* RAV3N — Studio Journal — shared behaviour */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- mobile nav toggle ---- */
  var top = document.querySelector(".top");
  var toggle = document.querySelector(".nav-toggle");
  if (top && toggle) {
    toggle.addEventListener("click", function () {
      var open = top.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    top.querySelectorAll(".idx a").forEach(function (a) {
      a.addEventListener("click", function () {
        top.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Lenis smooth scroll + GSAP ScrollTrigger ----
     Mirrors the stack the reference build (rav3n-next) uses for scroll feel.
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

  /* ---- character splitter, used by both the intro type-in and the
     scroll-triggered section reveals below. Walks arbitrary nested markup
     (em/span/a/b/i/strong) and wraps every character in its own <span
     class="ch">, preserving tag structure and word-wrap (spaces stay as
     plain text). Skips <br> and anything under a [data-count] element,
     since those numbers already animate on their own (see count-up). ---- */
  function splitChars(root) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var text = child.textContent;
          // Whitespace-only text nodes are just HTML source formatting
          // (the newline/indentation between sibling tags) — skip them
          // entirely rather than wrapping them in a new <span>. Otherwise
          // that span becomes a real extra child, which silently breaks
          // any parent relying on direct-child position, like a 2-column
          // CSS Grid (e.g. .edi) or a flex row (e.g. .cv .row).
          if (!text || !text.trim()) return;
          var frag = document.createDocumentFragment();
          // Characters are grouped inside a per-word wrapper (display:inline-block)
          // so each word stays one atomic, unbreakable unit — otherwise every
          // character becomes its own independent inline-block box and the
          // browser is free to wrap the line between any two letters instead
          // of only at real word boundaries.
          var words = text.split(" ");
          words.forEach(function (word, wi) {
            if (word.length) {
              var wordSpan = document.createElement("span");
              wordSpan.className = "word";
              for (var i = 0; i < word.length; i++) {
                var span = document.createElement("span");
                span.className = "ch";
                span.textContent = word[i];
                wordSpan.appendChild(span);
                out.push(span);
              }
              frag.appendChild(wordSpan);
            }
            if (wi < words.length - 1) frag.appendChild(document.createTextNode(" "));
          });
          node.replaceChild(frag, child);
        } else if (
          child.nodeType === 1 &&
          child.tagName !== "BR" &&
          !child.hasAttribute("data-count")
        ) {
          walk(child);
        }
      });
    })(root);
    return out;
  }

  function typeChars(chars, opts) {
    opts = opts || {};
    if (!chars.length) return;
    if (hasGsap) {
      gsap.set(chars, { opacity: 0, y: 4 });
      gsap.to(chars, {
        opacity: 1,
        y: 0,
        duration: 0.22,
        ease: "power1.out",
        stagger: opts.stagger || 0.01,
        delay: opts.delay || 0,
      });
    } else {
      chars.forEach(function (c, i) {
        c.style.transitionDelay = (opts.delay || 0) + i * (opts.stagger || 0.01) + "s";
        requestAnimationFrame(function () { c.classList.add("in"); });
      });
    }
  }

  /* ---- hero headline: grows to fill the page, then settles into place ----
     The headline starts tiny and centered on the viewport, scales up fast
     until it dominates the screen, then shrinks and migrates back down to
     its real, normal in-flow position and size in one settling motion.
     It's the real <h1> the whole time (just transformed), so there's no
     separate element to keep in sync and no handoff/flash at the end. The
     headline itself is never hidden or faded — it's on screen from first
     paint, exactly as authored; the glow is the only thing that animates. */
  function glowHeroIn(h1) {
    return new Promise(function (resolve) {
      h1.classList.add("glow-intro");
      var done = function () {
        h1.classList.remove("glow-intro");
        h1.removeEventListener("animationend", done);
        resolve();
      };
      h1.addEventListener("animationend", done);
      // Safety net in case the animationend event doesn't fire for any reason.
      setTimeout(done, 1800);
    });
  }

  /* ---- load sequence: glow the headline, then type in the rest of the
     cover text. Everything under [data-intro] is CSS-hidden by default
     (see style.css) specifically so there's no flash of static text before
     this runs; reduced motion / no-JS both have their own escape hatches. */
  function runIntro() {
    var h1 = document.getElementById("hero-h1");
    var introEls = document.querySelectorAll("[data-intro]");
    if (reduceMotion || !h1) {
      introEls.forEach(function (el) { el.style.opacity = 1; });
      return;
    }
    glowHeroIn(h1).then(function () {
      introEls.forEach(function (el, i) {
        el.style.opacity = 1;
        typeChars(splitChars(el), { stagger: 0.01, delay: i * 0.15 });
      });
    });
  }
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(runIntro);

  /* ---- scroll reveal (sections 01–07): each block fades/rises in, and
     its text types itself out at the same time, once, the first time it
     scrolls into view. ---- */
  if (hasGsap) {
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: function () {
          gsap.fromTo(el, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
          typeChars(splitChars(el), { stagger: 0.008 });
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
  // The element's existing text supplies the prefix/suffix (+, %, +yrs, etc.)
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
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".idx a[data-nav]"));
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
     multi-shot plates below. */
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

  /* ---- multi-shot plates: hover cycles through extra shots of the same
     work, in the same frame, morphing the frame's height to match each
     shot's own aspect ratio as it goes (a plate can hold several photos
     of varying size — the frame just keeps re-fitting whichever one is
     showing). Marked up as data-rotate='["a.jpg","b.jpg",...]' on the
     .art element, which already has its first image as the visible one.
     An optional data-rotate-labels='["Before","After"]' swaps the usual
     numbered corner counter for a labelled plaque along the bottom edge
     instead — for a growth/comparison pair rather than a generic gallery. */
  document.querySelectorAll(".art[data-rotate]").forEach(function (art) {
    var sources;
    try { sources = JSON.parse(art.getAttribute("data-rotate")); } catch (e) { return; }
    if (!sources || sources.length < 2) return;
    var img = art.querySelector("img");
    if (!img) return;

    var labels = null;
    var labelsAttr = art.getAttribute("data-rotate-labels");
    if (labelsAttr) {
      try { labels = JSON.parse(labelsAttr); } catch (e) { labels = null; }
    }

    var badge = document.createElement("span");
    badge.className = labels ? "baf" : "mtag";
    art.appendChild(badge);
    var setBadge = function (i) {
      badge.textContent = labels ? labels[i] : (i + 1) + " / " + sources.length;
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
    art.addEventListener("click", function () {
      if (reduceMotion) return;
      advance();
      startCycle();
    });
  });

  /* ---- hover glow: gold glow, but only after holding hover 2+ seconds ----
     mouseenter/mouseleave (unlike mouseover/mouseout) don't bubble, so they
     fire exactly once for the whole element even while the pointer moves
     between its inner .ch character spans — one continuous hover session,
     one timer. */
  if (!reduceMotion) {
    var GLOW_SELECTOR = [
      ".bx", ".idx a", ".kick", "h1", "h2", "h3", "h4",
      ".lede p", ".meta div", ".pull", ".dropcap", ".edi .body p",
      ".fig .n", ".fig .l", ".appr h4", ".appr p",
      ".track h3", ".track .sub", ".track .items", ".more-link",
      ".plate .cap .t", ".plate .cap .m", ".plate .d", ".pl", ".mtag",
      ".feat p", ".metric .n", ".metric .l",
      ".cv .yr", ".cv .role", ".cv .place",
      ".marg .lbl", ".chip",
      ".end-grid h2.big", ".contact-list div", ".hire",
      ".foot span", ".foot a",
    ].join(",");
    var GLOW_HOLD_MS = 2000;
    document.querySelectorAll(GLOW_SELECTOR).forEach(function (el) {
      el.classList.add("glow-ready");
      var timer = null;
      el.addEventListener("mouseenter", function () {
        timer = setTimeout(function () {
          el.classList.add("glow-on");
        }, GLOW_HOLD_MS);
      });
      el.addEventListener("mouseleave", function () {
        clearTimeout(timer);
        el.classList.remove("glow-on");
      });
    });
  }
})();
