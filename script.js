if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const getHashTarget = (hash = window.location.hash) => {
  if (!hash || hash === "#") return null;
  const id = decodeURIComponent(hash.slice(1));
  return document.getElementById(id);
};

function getScrollOffset() {
  const nav = document.querySelector(".nav");
  return nav ? nav.offsetHeight + 12 : 0;
}

window.addEventListener("load", () => {
  const target = getHashTarget();
  if (!target) {
    window.scrollTo(0, 0);
    return;
  }

  const targetY = target.getBoundingClientRect().top + window.pageYOffset - getScrollOffset();
  window.scrollTo(0, targetY);
});

const reveals = document.querySelectorAll(".reveal");
const nav = document.querySelector(".nav");
const navToggle = document.querySelector(".nav-toggle");
const langSwitches = document.querySelectorAll(".lang-switch");
const mailtoLinks = document.querySelectorAll("[data-mailto-fallback-link]");
const mailtoModal = document.querySelector("[data-mailto-fallback-modal]");
const mailtoStatus = mailtoModal?.querySelector("[data-mailto-fallback-status]");
const mailtoEmail = mailtoModal?.querySelector("[data-mailto-fallback-email]");
const mailtoCopyButton = mailtoModal?.querySelector("[data-copy-mailto-email]");
const navOpenLabel = navToggle?.dataset.labelOpen || "Open menu";
const navCloseLabel = navToggle?.dataset.labelClose || "Close menu";

const closeLanguageMenus = () => {
  langSwitches.forEach((menu) => {
    menu.open = false;
  });
};

const closeMailtoModal = () => {
  if (!mailtoModal || mailtoModal.hidden) return;
  mailtoModal.hidden = true;
  document.body.classList.remove("modal-open");
  if (mailtoStatus) {
    mailtoStatus.textContent = "";
  }
};

const openMailtoModal = () => {
  if (!mailtoModal) return;
  mailtoModal.hidden = false;
  document.body.classList.add("modal-open");
};

const setNavState = (isOpen) => {
  if (!nav) return;
  nav.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("nav-open", isOpen);
  if (!isOpen) {
    closeLanguageMenus();
  }
  if (navToggle) {
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? navCloseLabel : navOpenLabel);
  }
};

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav ? !nav.classList.contains("is-open") : false;
    setNavState(isOpen);
  });
}


document.addEventListener("click", (event) => {
  if (!nav || !nav.classList.contains("is-open")) return;
  if (event.target.closest(".nav")) return;
  setNavState(false);
});

document.addEventListener("click", (event) => {
  langSwitches.forEach((menu) => {
    if (!menu.open) return;
    if (menu.contains(event.target)) return;
    menu.open = false;
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeLanguageMenus();
  closeMailtoModal();
});

if (mailtoModal) {
  mailtoModal.addEventListener("click", (event) => {
    if (!event.target.closest("[data-close-mailto-fallback]")) return;
    closeMailtoModal();
  });
}

if (mailtoCopyButton && mailtoEmail) {
  mailtoCopyButton.addEventListener("click", async () => {
    const text = mailtoEmail.textContent?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (mailtoStatus) {
        mailtoStatus.textContent = mailtoModal?.dataset.copySuccess || "Email copied.";
      }
    } catch {
      if (mailtoStatus) {
        mailtoStatus.textContent = mailtoModal?.dataset.copyFail || "Copy failed. Please copy manually.";
      }
    }
  });
}

const launchMailtoWithFallback = (mailtoHref) => {
  let pageHidden = false;
  let windowBlurred = false;

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      pageHidden = true;
    }
  };

  const onPageHide = () => {
    pageHidden = true;
  };

  const onBlur = () => {
    windowBlurred = true;
  };

  const cleanup = () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("blur", onBlur);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("blur", onBlur);

  window.location.href = mailtoHref;

  window.setTimeout(() => {
    cleanup();
    if (!pageHidden && !windowBlurred && document.visibilityState === "visible") {
      openMailtoModal();
    }
  }, 900);
};

mailtoLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    closeLanguageMenus();
    closeMailtoModal();
    if (nav && nav.classList.contains("is-open")) {
      setNavState(false);
    }
    launchMailtoWithFallback(link.href);
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

reveals.forEach((el) => revealObserver.observe(el));

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let scrollRafId = null;

const easeInOutQuint = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);

const smoothScrollTo = (targetY) => {
  if (scrollRafId) {
    cancelAnimationFrame(scrollRafId);
    scrollRafId = null;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 1) return;

  const duration = Math.min(3600, Math.max(1600, Math.abs(distance) * 1.1));
  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutQuint(progress);
    window.scrollTo(0, startY + distance * eased);
    if (progress < 1) {
      scrollRafId = requestAnimationFrame(step);
    } else {
      scrollRafId = null;
    }
  };

  scrollRafId = requestAnimationFrame(step);
};

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href || href === "#") {
    event.preventDefault();
    if (prefersReducedMotion.matches) {
      window.scrollTo(0, 0);
    } else {
      smoothScrollTo(0);
    }
    history.pushState(null, "", "#top");
    return;
  }

  const target = getHashTarget(href);
  if (!target) return;
  event.preventDefault();

  if (nav && nav.classList.contains("is-open") && link.closest(".nav-menu")) {
    setNavState(false);
  }

  const offset = getScrollOffset();
  const targetY = target.getBoundingClientRect().top + window.pageYOffset - offset;

  if (prefersReducedMotion.matches) {
    window.scrollTo(0, targetY);
  } else {
    smoothScrollTo(targetY);
  }

  history.pushState(null, "", href);
});

// ── Features tabs ───────────────────────────────────────────────────
// Switches the active panel in the "What makes Mappy AI different"
// section. All panels live in the DOM (SEO); CSS shows only the active
// one. Videos are paused on inactive panels so only one is moving at
// a time — that's the main reason we replaced the old 6-card grid.
(() => {
  const tabs = Array.from(document.querySelectorAll(".features-tab"));
  const panels = Array.from(document.querySelectorAll(".features-tab-panel"));
  if (!tabs.length || !panels.length) return;

  const activate = (targetId) => {
    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === targetId;
      panel.classList.toggle("is-active", isActive);
      const video = panel.querySelector("video");
      if (video) {
        if (isActive) {
          video.currentTime = 0;
          // Some browsers reject autoplay until a user interaction; the
          // tab click IS the gesture so play() should succeed here, but
          // swallow the promise rejection just in case (reduced-motion,
          // battery saver, etc).
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        } else {
          video.pause();
        }
      }
    });
    tabs.forEach((tab) => {
      const isActive = tab.dataset.target === targetId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab.dataset.target));
  });

  // On load, only the initially-active panel's video should be playing.
  // The other panels' <video> elements don't have autoplay set in HTML
  // (only the active one does), but be defensive — pause anything
  // outside the active panel so a stale browser cache or markup edit
  // can't sneak past.
  panels.forEach((panel) => {
    const video = panel.querySelector("video");
    if (!video) return;
    if (panel.classList.contains("is-active")) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  });
})();

// ── Workflow mindmap connectors ────────────────────────────────────
// Draws curved SVG connectors from each leaf card to the center node.
// Paths are computed from rendered card positions (instead of being
// hand-coded) so the layout stays correct across viewport sizes and
// font loads. Each path's total length is written to a CSS custom
// property so stroke-dashoffset can animate cleanly via CSS.
(() => {
  const map = document.querySelector(".workflow-mindmap");
  if (!map) return;
  const svg = map.querySelector(".workflow-connectors");
  const center = map.querySelector(".workflow-center");
  const leaves = Array.from(map.querySelectorAll(".workflow-leaf"));
  if (!svg || !center || !leaves.length) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const mobileMQ = window.matchMedia("(max-width: 900px)");

  // Build the <path> elements once; we'll set/refresh their d attrs
  // every time we recompute.
  const paths = leaves.map((_, idx) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.style.setProperty("--idx", String(idx));
    svg.appendChild(path);
    return path;
  });

  const recompute = () => {
    if (mobileMQ.matches) {
      // Mobile uses a stacked column with CSS-drawn connectors — the
      // SVG layer is hidden, so don't bother computing.
      return;
    }

    const mapRect = map.getBoundingClientRect();
    const centerRect = center.getBoundingClientRect();

    // Center node anchor points (in coords local to the SVG).
    const centerLeftX = centerRect.left - mapRect.left;
    const centerRightX = centerRect.right - mapRect.left;
    const centerY = centerRect.top + centerRect.height / 2 - mapRect.top;

    // Match the SVG's coordinate system to the section's pixel box
    // so path coordinates are 1:1 with the layout.
    svg.setAttribute("viewBox", `0 0 ${mapRect.width} ${mapRect.height}`);

    leaves.forEach((leaf, idx) => {
      const leafRect = leaf.getBoundingClientRect();
      const leafMidY = leafRect.top + leafRect.height / 2 - mapRect.top;
      const leafCenterX = leafRect.left + leafRect.width / 2 - mapRect.left;
      const isLeft = leafCenterX < (centerLeftX + centerRightX) / 2;

      const startX = isLeft
        ? leafRect.right - mapRect.left
        : leafRect.left - mapRect.left;
      const endX = isLeft ? centerLeftX : centerRightX;

      // Cubic bezier: control points pulled horizontally toward the
      // midpoint of the span so the curve flows in from the leaf and
      // out to the center without sharp kinks. 0.55 is a sweet spot
      // between "almost-straight" (0.3) and "loopy" (0.8).
      const dx = (endX - startX) * 0.55;
      const d = `M ${startX} ${leafMidY} C ${startX + dx} ${leafMidY}, ${endX - dx} ${centerY}, ${endX} ${centerY}`;

      const path = paths[idx];
      path.setAttribute("d", d);

      // getTotalLength is exact; using it instead of an estimate so
      // stroke-dasharray matches the path precisely and there's no
      // stub of dash visible after the draw-in animation completes.
      const len = path.getTotalLength();
      path.style.setProperty("--length", String(len));
    });
  };

  // Initial pass + recompute on layout changes. ResizeObserver tracks
  // the section box (font load, image load, viewport resize, zoom).
  recompute();
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(recompute).observe(map);
  } else {
    window.addEventListener("resize", recompute);
  }
  document.fonts?.ready?.then(recompute);
})();
