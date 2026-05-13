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

// Helper: should this hash be treated as "actual top of page"?
const isTopHash = (hash) => !hash || hash === "#" || hash === "#top";

window.addEventListener("load", () => {
  const hash = window.location.hash;
  // "#top" is the brand-logo anchor — treat as "actual page top",
  // not as a hash-navigation target. (Otherwise refreshing after a
  // logo click lands at the hero section with sticky-nav offset,
  // hiding the audience-switch above the viewport.)
  if (isTopHash(hash)) {
    window.scrollTo(0, 0);
    return;
  }

  const target = getHashTarget();
  if (!target) {
    window.scrollTo(0, 0);
    return;
  }

  const targetY = target.getBoundingClientRect().top + window.pageYOffset - getScrollOffset();
  window.scrollTo(0, targetY);
});

// pageshow fires both on first load and when the page is restored
// from the back/forward cache (which preserves scroll position
// regardless of scrollRestoration). Force top here so navigating
// back from /schools/ (or any other page) lands at the actual top.
window.addEventListener("pageshow", (event) => {
  if (event.persisted && isTopHash(window.location.hash)) {
    window.scrollTo(0, 0);
  }
});

// Save scroll position as 0 before unloading the page, so the
// browser's restore-cache for the next load already has 0.
// (Combined with scrollRestoration = "manual" set in <head>, this
// makes the restored scroll position match what we want.)
window.addEventListener("beforeunload", () => {
  if (isTopHash(window.location.hash)) {
    window.scrollTo(0, 0);
  }
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
  // "#top" and "#" both mean "scroll to the actual top of the page"
  // (y=0). Without the #top special-case the click would otherwise
  // fall through to hash-navigation and scroll to the id=top element
  // WITH the sticky-nav offset, hiding the audience-switch.
  if (!href || href === "#" || href === "#top") {
    event.preventDefault();
    if (prefersReducedMotion.matches) {
      window.scrollTo(0, 0);
    } else {
      smoothScrollTo(0);
    }
    // Clear the hash from the URL so a subsequent refresh lands at
    // actual top, not at "#top".
    history.replaceState(null, "", window.location.pathname + window.location.search);
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

// ── Audience mindmap: interactive demo ─────────────────────────────
// Hydrates the static mindmap illustration in the "Who Mappy AI is
// for" section into a draggable, selectable mini-editor. Visitors
// can grab any node to reposition it (edges update live), click a
// node to select it, and use the floating toolbar to change its
// background color, text color, or shape. Same palette and shape
// model used by the actual editor in mindmap-tool.
(() => {
  const canvas = document.querySelector("[data-interactive-mindmap]");
  if (!canvas) return;

  // Skip on small viewports — the canvas itself is hidden via CSS
  // below 720px in favor of a text list fallback.
  const mobileMQ = window.matchMedia("(max-width: 720px)");
  if (mobileMQ.matches) return;

  const svg = canvas.querySelector(".audience-canvas-edges");
  const toolbar = canvas.querySelector(".audience-toolbar");
  const nodeEls = Array.from(canvas.querySelectorAll(".audience-node"));
  if (!svg || !toolbar || !nodeEls.length) return;

  // Build node + edge state from the DOM. Each node carries its
  // current (x, y) in canvas-percent coords and its style state.
  const nodes = new Map();
  nodeEls.forEach((el) => {
    const id = el.dataset.nodeId;
    if (!id) return;
    const x = parseFloat(el.style.left);
    const y = parseFloat(el.style.top);
    nodes.set(id, {
      id,
      el,
      x,
      y,
      // Initial bg color: prefer --node-color custom property; fallback to white.
      bg: el.style.getPropertyValue("--node-color").trim() || "#FFFFFF",
      // Initial text color: white on every node (all three levels
      // now have colored backgrounds; this matches the CSS defaults).
      text: "#FFFFFF",
      // Level-2 leaves carry multi-line copy and use a rounded
      // rectangle by default; other levels use full pills.
      shape: el.classList.contains("audience-node-l2") ? "rounded" : "pill",
      // Initial font size in px — read from computed style so we
      // start in sync with whatever the CSS rules set per level.
      fontSize: parseFloat(getComputedStyle(el).fontSize) || 14,
    });
  });

  // Edge definitions: each path carries a "from,to" data attribute
  // matching node IDs. The first 3 edges are curved (root → level 1);
  // the last 3 are straight (level 1 → level 2).
  const edges = Array.from(svg.querySelectorAll("path")).map((path) => {
    const [from, to] = path.dataset.edge.split(",");
    return { from, to, path, curved: ["students", "researchers", "teams"].includes(to) && to !== "researchers" };
  });

  // ── Edge geometry ──────────────────────────────────────────────
  // For curved edges (root to top/bottom branches): cubic bezier
  // with control points pulled horizontally toward the mid-x so the
  // curve flows from parent right edge to child left edge without
  // sharp kinks. For straight edges: a simple line.
  const updateEdges = () => {
    edges.forEach((edge) => {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) return;
      const dx = (to.x - from.x) * 0.5;
      // Always use a soft cubic so the edges feel like editor links
      // (even the "straight" ones get a gentle s-curve when nodes are
      // dragged out of horizontal alignment).
      const d = `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
      edge.path.setAttribute("d", d);
    });
  };

  // ── Selection + toolbar ────────────────────────────────────────
  let selectedId = null;

  const select = (id) => {
    selectedId = id;
    nodeEls.forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.nodeId === id);
    });
    // Show the toolbar before measuring its size so offsetWidth/
    // offsetHeight in positionToolbar return the real values
    // instead of 0 (hidden elements report 0 dimensions).
    toolbar.hidden = false;
    positionToolbar();
    syncToolbarValues();
  };

  const deselect = () => {
    selectedId = null;
    nodeEls.forEach((el) => el.classList.remove("is-selected"));
    closeAllPopovers();
    toolbar.hidden = true;
  };

  const positionToolbar = () => {
    if (!selectedId) return;
    const node = nodes.get(selectedId);
    if (!node) return;
    // Compute toolbar position in pixels, clamp to the canvas
    // box, then convert back to percentages. This guarantees the
    // toolbar always stays fully inside the canvas regardless of
    // node position or canvas size.
    const canvasRect = canvas.getBoundingClientRect();
    const nodeRect = node.el.getBoundingClientRect();
    const toolbarW = toolbar.offsetWidth || 188;
    const toolbarH = toolbar.offsetHeight || 240;
    const padding = 8;  // gap from canvas edge
    const gap = 12;     // gap between node and toolbar

    // Node bounds in canvas-local pixels.
    const nodeLeft = nodeRect.left - canvasRect.left;
    const nodeRight = nodeRect.right - canvasRect.left;
    const nodeCenterY = (nodeRect.top + nodeRect.bottom) / 2 - canvasRect.top;

    // Prefer right side; flip to left if it would clip; if neither
    // fits, dock against the right edge of the canvas.
    let toolbarLeft;
    if (nodeRight + gap + toolbarW <= canvasRect.width - padding) {
      toolbarLeft = nodeRight + gap;
    } else if (nodeLeft - gap - toolbarW >= padding) {
      toolbarLeft = nodeLeft - gap - toolbarW;
    } else {
      toolbarLeft = canvasRect.width - toolbarW - padding;
    }

    // Center vertically on node, clamp inside canvas.
    let toolbarTop = nodeCenterY - toolbarH / 2;
    toolbarTop = Math.max(padding, Math.min(canvasRect.height - toolbarH - padding, toolbarTop));

    toolbar.style.left = (toolbarLeft / canvasRect.width * 100) + "%";
    toolbar.style.top = (toolbarTop / canvasRect.height * 100) + "%";
    toolbar.style.right = "auto";
    toolbar.style.transform = "none";
  };

  const FONT_MIN = 10;
  const FONT_MAX = 28;
  const SHAPE_LABELS = { pill: "Pill", rounded: "Rounded" };

  const closeAllPopovers = () => {
    toolbar
      .querySelectorAll(".audience-toolbar-shape-popover")
      .forEach((p) => (p.hidden = true));
  };

  const syncToolbarValues = () => {
    if (!selectedId) return;
    const node = nodes.get(selectedId);
    if (!node) return;
    // Mark active inline swatch.
    toolbar.querySelectorAll(".audience-toolbar-swatches button[data-bg]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.bg.toLowerCase() === node.bg.toLowerCase());
    });
    toolbar.querySelectorAll(".audience-toolbar-swatches button[data-text]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.text.toLowerCase() === node.text.toLowerCase());
    });
    // Shape trigger label + popover active state.
    const shapeValue = toolbar.querySelector(".audience-toolbar-shape-value");
    if (shapeValue) shapeValue.textContent = SHAPE_LABELS[node.shape] || node.shape;
    toolbar.querySelectorAll(".audience-toolbar-shape-popover button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.shape === node.shape);
    });
    // Font size display.
    const fontValue = toolbar.querySelector(".audience-toolbar-font-value");
    if (fontValue) fontValue.textContent = Math.round(node.fontSize);
  };

  // ── Toolbar event handlers ─────────────────────────────────────
  toolbar.addEventListener("click", (event) => {
    if (!selectedId) return;
    const node = nodes.get(selectedId);
    if (!node) return;

    // Shape trigger toggles its popover.
    const shapeTrigger = event.target.closest(".audience-toolbar-shape-trigger");
    if (shapeTrigger) {
      const popover = shapeTrigger.parentElement.querySelector(".audience-toolbar-shape-popover");
      popover.hidden = !popover.hidden;
      return;
    }

    // Direct control clicks (inline swatches + font + shape option).
    const bgBtn = event.target.closest("button[data-bg]");
    const textBtn = event.target.closest("button[data-text]");
    const shapeBtn = event.target.closest(".audience-toolbar-shape-popover button[data-shape]");
    const fontBtn = event.target.closest("button[data-font]");

    if (bgBtn) {
      node.bg = bgBtn.dataset.bg;
    } else if (textBtn) {
      node.text = textBtn.dataset.text;
    } else if (shapeBtn) {
      node.shape = shapeBtn.dataset.shape;
      closeAllPopovers();
    } else if (fontBtn) {
      const step = 2;
      if (fontBtn.dataset.font === "inc") {
        node.fontSize = Math.min(FONT_MAX, node.fontSize + step);
      } else {
        node.fontSize = Math.max(FONT_MIN, node.fontSize - step);
      }
    } else {
      return;
    }
    applyNodeStyle(node);
    syncToolbarValues();
  });

  // Click inside the toolbar but outside the shape popover/trigger
  // closes the shape popover (e.g. clicking a swatch should close
  // any open popover too).
  document.addEventListener("pointerdown", (event) => {
    if (!toolbar.contains(event.target)) return;
    if (event.target.closest(".audience-toolbar-shape-popover")) return;
    if (event.target.closest(".audience-toolbar-shape-trigger")) return;
    closeAllPopovers();
  });

  const applyNodeStyle = (node) => {
    // Apply background, border (match the bg color for the colored
    // nodes; stroke-color for white), text color, shape, font size.
    node.el.style.background = node.bg;
    node.el.style.borderColor =
      node.bg.toLowerCase() === "#ffffff" ? "" : node.bg;
    node.el.style.color = node.text;
    node.el.style.borderRadius = node.shape === "rounded" ? "12px" : "999px";
    node.el.style.fontSize = node.fontSize + "px";
  };

  // ── Drag (pointer events; works for mouse + touch) ─────────────
  let drag = null;
  const DRAG_THRESHOLD = 4; // pixels before pointerdown becomes a drag

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  nodeEls.forEach((el) => {
    el.addEventListener("pointerdown", (event) => {
      // Ignore clicks on the toolbar that bubble up; only react to
      // direct pointerdowns on the node itself.
      if (event.target.closest(".audience-toolbar")) return;
      // Don't initiate drag with secondary buttons.
      if (event.button !== 0 && event.button !== undefined) return;
      const id = el.dataset.nodeId;
      const node = nodes.get(id);
      if (!node) return;
      const rect = canvas.getBoundingClientRect();
      const nodeRect = el.getBoundingClientRect();
      // Half the node's own dimensions as canvas-percent values, so
      // the drag clamp keeps the WHOLE node inside the canvas
      // bounds (not just its center point).
      const halfWidthPct = (nodeRect.width / 2 / rect.width) * 100;
      const halfHeightPct = (nodeRect.height / 2 / rect.height) * 100;
      drag = {
        node,
        el,
        startX: event.clientX,
        startY: event.clientY,
        origX: node.x,
        origY: node.y,
        rect,
        halfWidthPct,
        halfHeightPct,
        moved: false,
        pointerId: event.pointerId,
      };
      el.setPointerCapture(event.pointerId);
      el.classList.add("is-dragging");
    });
  });

  document.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
    }
    const dxPct = (dx / drag.rect.width) * 100;
    const dyPct = (dy / drag.rect.height) * 100;
    // Clamp by node's own bounding-box dimensions so the whole
    // node stays inside the canvas, not just its center.
    drag.node.x = clamp(drag.origX + dxPct, drag.halfWidthPct, 100 - drag.halfWidthPct);
    drag.node.y = clamp(drag.origY + dyPct, drag.halfHeightPct, 100 - drag.halfHeightPct);
    drag.el.style.left = drag.node.x + "%";
    drag.el.style.top = drag.node.y + "%";
    updateEdges();
    if (selectedId === drag.node.id) positionToolbar();
  });

  document.addEventListener("pointerup", (event) => {
    if (!drag) return;
    const wasMoved = drag.moved;
    drag.el.classList.remove("is-dragging");
    if (!wasMoved) {
      // No drag occurred — treat as a click to select.
      select(drag.node.id);
    }
    drag = null;
  });

  document.addEventListener("pointercancel", () => {
    if (!drag) return;
    drag.el.classList.remove("is-dragging");
    drag = null;
  });

  // Click outside the canvas (or on canvas chrome that isn't a node
  // or the toolbar) deselects.
  document.addEventListener("pointerdown", (event) => {
    if (!selectedId) return;
    if (event.target.closest(".audience-node")) return;
    if (event.target.closest(".audience-toolbar")) return;
    deselect();
  });

  // Recompute toolbar position if window resizes (canvas may resize).
  window.addEventListener("resize", () => {
    if (selectedId) positionToolbar();
  });

  // Initial: ensure SVG edges are in the right shape.
  updateEdges();
})();

// ── Audience onboarding tip: collapsed ↔ open ─────────────────────
// Click the avatar to toggle. Click anywhere outside the tip to
// collapse. The actual show/hide is CSS-driven (transform + opacity
// transitions); JS just flips the data-state attribute.
//
// data-seen tracks whether the user has ever opened the tip. Once
// set, the green notification dot stays hidden permanently (CSS
// keys off the attribute). Persisted in localStorage so the dot
// doesn't reappear on every page reload.
(() => {
  const tip = document.querySelector(".audience-tip");
  if (!tip) return;
  const trigger = tip.querySelector(".audience-tip-trigger");
  if (!trigger) return;

  const SEEN_KEY = "mappy-audience-tip-seen";

  // Restore seen-state from previous visits if available.
  try {
    if (window.localStorage && localStorage.getItem(SEEN_KEY)) {
      tip.dataset.seen = "true";
    }
  } catch (e) {
    // localStorage can throw in private mode / disabled storage —
    // ignore, the dot just reappears on refresh in that case.
  }

  const markSeen = () => {
    if (tip.dataset.seen === "true") return;
    tip.dataset.seen = "true";
    try {
      localStorage?.setItem(SEEN_KEY, "1");
    } catch (e) {}
  };

  trigger.addEventListener("click", () => {
    markSeen();
    tip.dataset.state = tip.dataset.state === "open" ? "collapsed" : "open";
  });

  // Click anywhere outside the tip → collapse. The trigger and
  // bubble are both inside .audience-tip, so this listener won't
  // fire-close on internal clicks.
  document.addEventListener("click", (event) => {
    if (tip.dataset.state !== "open") return;
    if (event.target.closest(".audience-tip")) return;
    tip.dataset.state = "collapsed";
  });
})();

