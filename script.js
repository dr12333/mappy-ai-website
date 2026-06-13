if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const isTopHash = (hash) => !hash || hash === "#" || hash === "#top";

const getHashTarget = (hash = window.location.hash) => {
  if (!hash || hash === "#") return null;
  return document.getElementById(decodeURIComponent(hash.slice(1)));
};

const getScrollOffset = () => {
  const nav = document.querySelector(".nav");
  return nav ? nav.offsetHeight + 12 : 0;
};

// The `load` event only fires after every resource (including the
// 60 MB hero video) finishes downloading, which can take 2-3 seconds.
// If we unconditionally scrollTo here we yank the user back to the
// top after they've already started scrolling. So:
//   - no-hash case: the inline head script already handled it on
//     parse / DOMContentLoaded — nothing to do here.
//   - hash case: only re-snap to the anchor if the user is still
//     parked at the top, i.e. they haven't begun scrolling themselves.
window.addEventListener("load", () => {
  const hash = window.location.hash;
  if (isTopHash(hash)) return;
  const target = getHashTarget();
  if (!target) return;
  if (window.pageYOffset > 4) return;
  const y = target.getBoundingClientRect().top + window.pageYOffset - getScrollOffset();
  window.scrollTo(0, y);
});

// pageshow fires when the page is restored from the bfcache, which
// otherwise preserves the previous scroll position.
window.addEventListener("pageshow", (event) => {
  if (event.persisted && isTopHash(window.location.hash)) {
    window.scrollTo(0, 0);
  }
});

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
  if (mailtoStatus) mailtoStatus.textContent = "";
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
  if (!isOpen) closeLanguageMenus();
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

// If the OS has no mail handler, the mailto: navigation neither hides
// the page nor blurs the window — we detect that and show a fallback
// modal with the address to copy.
const launchMailtoWithFallback = (mailtoHref) => {
  let pageHidden = false;
  let windowBlurred = false;

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") pageHidden = true;
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
    if (nav && nav.classList.contains("is-open")) setNavState(false);
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

const easeInOutQuint = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

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
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutQuint(progress));
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
  if (!href || href === "#" || href === "#top") {
    event.preventDefault();
    if (prefersReducedMotion.matches) window.scrollTo(0, 0);
    else smoothScrollTo(0);
    history.replaceState(null, "", window.location.pathname + window.location.search);
    return;
  }

  const target = getHashTarget(href);
  if (!target) return;
  event.preventDefault();

  if (nav && nav.classList.contains("is-open") && link.closest(".nav-menu")) {
    setNavState(false);
  }

  const targetY = target.getBoundingClientRect().top + window.pageYOffset - getScrollOffset();
  if (prefersReducedMotion.matches) window.scrollTo(0, targetY);
  else smoothScrollTo(targetY);

  history.pushState(null, "", href);
});

// Features-tabs: switch the active panel and pause the inactive
// panels' videos so only the visible one is playing.
(() => {
  const tabs = Array.from(document.querySelectorAll(".features-tab"));
  const panels = Array.from(document.querySelectorAll(".features-tab-panel"));
  if (!tabs.length || !panels.length) return;

  const playSafely = (video) => {
    const result = video.play();
    if (result && typeof result.catch === "function") result.catch(() => {});
  };

  const activate = (targetId) => {
    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === targetId;
      panel.classList.toggle("is-active", isActive);
      const video = panel.querySelector("video");
      if (!video) return;
      if (isActive) {
        video.currentTime = 0;
        playSafely(video);
      } else {
        video.pause();
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

  panels.forEach((panel) => {
    const video = panel.querySelector("video");
    if (!video) return;
    if (panel.classList.contains("is-active")) playSafely(video);
    else video.pause();
  });
})();

// Interactive mindmap demo in the "Who Mappy AI is for" section.
// Hydrates the static markup into a draggable, selectable graph with
// a floating toolbar. Each node carries desktop coords in its inline
// top/left and mobile coords in data-mobile-x / data-mobile-y; the
// active coord set swaps on viewport change.
(() => {
  const canvas = document.querySelector("[data-interactive-mindmap]");
  if (!canvas) return;

  const svg = canvas.querySelector(".audience-canvas-edges");
  const toolbar = canvas.querySelector(".audience-toolbar");
  const nodeEls = Array.from(canvas.querySelectorAll(".audience-node"));
  if (!svg || !toolbar || !nodeEls.length) return;

  const mobileMQ = window.matchMedia("(max-width: 720px)");

  const nodes = new Map();
  nodeEls.forEach((el) => {
    const id = el.dataset.nodeId;
    if (!id) return;
    const desktopX = parseFloat(el.style.left);
    const desktopY = parseFloat(el.style.top);
    const mobileX = parseFloat(el.dataset.mobileX);
    const mobileY = parseFloat(el.dataset.mobileY);
    const useMobile = mobileMQ.matches && !Number.isNaN(mobileX) && !Number.isNaN(mobileY);
    const x = useMobile ? mobileX : desktopX;
    const y = useMobile ? mobileY : desktopY;
    if (useMobile) {
      el.style.left = x + "%";
      el.style.top = y + "%";
    }
    nodes.set(id, {
      id,
      el,
      x,
      y,
      desktopX,
      desktopY,
      mobileX,
      mobileY,
      bg: el.style.getPropertyValue("--node-color").trim() || "#FFFFFF",
      text: "#FFFFFF",
      shape: el.classList.contains("audience-node-l2") ? "rounded" : "pill",
      fontSize: parseFloat(getComputedStyle(el).fontSize) || 14,
    });
  });

  const edges = Array.from(svg.querySelectorAll("path")).map((path) => {
    const [from, to] = path.dataset.edge.split(",");
    return { from, to, path };
  });

  // Cubic bezier between each parent/child. Control points biased
  // along the layout's primary axis (horizontal on desktop, vertical
  // on mobile) so curves emerge from the parent and land at the child.
  const updateEdges = () => {
    const vertical = mobileMQ.matches;
    edges.forEach(({ from, to, path }) => {
      const a = nodes.get(from);
      const b = nodes.get(to);
      if (!a || !b) return;
      const d = vertical
        ? `M ${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`
        : `M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`;
      path.setAttribute("d", d);
    });
  };

  let selectedId = null;

  const select = (id) => {
    selectedId = id;
    nodeEls.forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.nodeId === id);
    });
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

  // Position the toolbar next to the selected node — prefer the right
  // side, fall back to the left, then dock to the canvas edge if
  // neither fits.
  const positionToolbar = () => {
    if (!selectedId) return;
    const node = nodes.get(selectedId);
    if (!node) return;
    const canvasRect = canvas.getBoundingClientRect();
    const nodeRect = node.el.getBoundingClientRect();
    const toolbarW = toolbar.offsetWidth || 188;
    const toolbarH = toolbar.offsetHeight || 240;
    const PAD = 8;
    const GAP = 12;

    const nodeLeft = nodeRect.left - canvasRect.left;
    const nodeRight = nodeRect.right - canvasRect.left;
    const nodeCenterY = (nodeRect.top + nodeRect.bottom) / 2 - canvasRect.top;

    let toolbarLeft;
    if (nodeRight + GAP + toolbarW <= canvasRect.width - PAD) {
      toolbarLeft = nodeRight + GAP;
    } else if (nodeLeft - GAP - toolbarW >= PAD) {
      toolbarLeft = nodeLeft - GAP - toolbarW;
    } else {
      toolbarLeft = canvasRect.width - toolbarW - PAD;
    }

    let toolbarTop = nodeCenterY - toolbarH / 2;
    toolbarTop = Math.max(PAD, Math.min(canvasRect.height - toolbarH - PAD, toolbarTop));

    toolbar.style.left = (toolbarLeft / canvasRect.width * 100) + "%";
    toolbar.style.top = (toolbarTop / canvasRect.height * 100) + "%";
    toolbar.style.right = "auto";
    toolbar.style.transform = "none";
  };

  const FONT_MIN = 10;
  const FONT_MAX = 28;
  const FONT_STEP = 2;
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
    toolbar.querySelectorAll(".audience-toolbar-swatches button[data-bg]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.bg.toLowerCase() === node.bg.toLowerCase());
    });
    toolbar.querySelectorAll(".audience-toolbar-swatches button[data-text]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.text.toLowerCase() === node.text.toLowerCase());
    });
    const shapeValue = toolbar.querySelector(".audience-toolbar-shape-value");
    if (shapeValue) shapeValue.textContent = SHAPE_LABELS[node.shape] || node.shape;
    toolbar.querySelectorAll(".audience-toolbar-shape-popover button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.shape === node.shape);
    });
    const fontValue = toolbar.querySelector(".audience-toolbar-font-value");
    if (fontValue) fontValue.textContent = Math.round(node.fontSize);
  };

  const applyNodeStyle = (node) => {
    node.el.style.background = node.bg;
    node.el.style.borderColor = node.bg.toLowerCase() === "#ffffff" ? "" : node.bg;
    node.el.style.color = node.text;
    node.el.style.borderRadius = node.shape === "rounded" ? "12px" : "999px";
    node.el.style.fontSize = node.fontSize + "px";
  };

  toolbar.addEventListener("click", (event) => {
    if (!selectedId) return;
    const node = nodes.get(selectedId);
    if (!node) return;

    const shapeTrigger = event.target.closest(".audience-toolbar-shape-trigger");
    if (shapeTrigger) {
      const popover = shapeTrigger.parentElement.querySelector(".audience-toolbar-shape-popover");
      popover.hidden = !popover.hidden;
      return;
    }

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
      node.fontSize = fontBtn.dataset.font === "inc"
        ? Math.min(FONT_MAX, node.fontSize + FONT_STEP)
        : Math.max(FONT_MIN, node.fontSize - FONT_STEP);
    } else {
      return;
    }
    applyNodeStyle(node);
    syncToolbarValues();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!toolbar.contains(event.target)) return;
    if (event.target.closest(".audience-toolbar-shape-popover")) return;
    if (event.target.closest(".audience-toolbar-shape-trigger")) return;
    closeAllPopovers();
  });

  const DRAG_THRESHOLD = 4;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let drag = null;

  nodeEls.forEach((el) => {
    el.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".audience-toolbar")) return;
      if (event.button !== 0 && event.button !== undefined) return;
      const node = nodes.get(el.dataset.nodeId);
      if (!node) return;
      const rect = canvas.getBoundingClientRect();
      const nodeRect = el.getBoundingClientRect();
      drag = {
        node,
        el,
        startX: event.clientX,
        startY: event.clientY,
        origX: node.x,
        origY: node.y,
        rect,
        halfWidthPct: (nodeRect.width / 2 / rect.width) * 100,
        halfHeightPct: (nodeRect.height / 2 / rect.height) * 100,
        moved: false,
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
    drag.node.x = clamp(drag.origX + dxPct, drag.halfWidthPct, 100 - drag.halfWidthPct);
    drag.node.y = clamp(drag.origY + dyPct, drag.halfHeightPct, 100 - drag.halfHeightPct);
    drag.el.style.left = drag.node.x + "%";
    drag.el.style.top = drag.node.y + "%";
    updateEdges();
    if (selectedId === drag.node.id) positionToolbar();
  });

  document.addEventListener("pointerup", () => {
    if (!drag) return;
    const wasMoved = drag.moved;
    drag.el.classList.remove("is-dragging");
    if (!wasMoved) select(drag.node.id);
    drag = null;
  });

  document.addEventListener("pointercancel", () => {
    if (!drag) return;
    drag.el.classList.remove("is-dragging");
    drag = null;
  });

  document.addEventListener("pointerdown", (event) => {
    if (!selectedId) return;
    if (event.target.closest(".audience-node")) return;
    if (event.target.closest(".audience-toolbar")) return;
    deselect();
  });

  window.addEventListener("resize", () => {
    if (selectedId) positionToolbar();
  });

  const applyLayoutForViewport = (isMobile) => {
    nodes.forEach((node) => {
      const hasMobile = !Number.isNaN(node.mobileX) && !Number.isNaN(node.mobileY);
      const x = isMobile && hasMobile ? node.mobileX : node.desktopX;
      const y = isMobile && hasMobile ? node.mobileY : node.desktopY;
      node.x = x;
      node.y = y;
      node.el.style.left = x + "%";
      node.el.style.top = y + "%";
    });
    updateEdges();
  };

  const onMQChange = (event) => {
    deselect();
    applyLayoutForViewport(event.matches);
  };
  if (typeof mobileMQ.addEventListener === "function") {
    mobileMQ.addEventListener("change", onMQChange);
  } else if (typeof mobileMQ.addListener === "function") {
    mobileMQ.addListener(onMQChange);
  }

  updateEdges();
})();

// Audience onboarding tip: tap the avatar to toggle the message
// bubble; tap outside to collapse. data-seen kills the shake and the
// notification dot after the first open (CSS-driven).
(() => {
  const tip = document.querySelector(".audience-tip");
  if (!tip) return;
  const trigger = tip.querySelector(".audience-tip-trigger");
  if (!trigger) return;

  trigger.addEventListener("click", () => {
    tip.dataset.seen = "true";
    tip.dataset.state = tip.dataset.state === "open" ? "collapsed" : "open";
  });

  document.addEventListener("click", (event) => {
    if (tip.dataset.state !== "open") return;
    if (event.target.closest(".audience-tip")) return;
    tip.dataset.state = "collapsed";
  });
})();
