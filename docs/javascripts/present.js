/*
 * present.js - turn any page into a slide deck, no per-page markup required.
 *
 * Slides are split at <h2> boundaries, plus any <hr> (a markdown "---") for
 * splitting a long section further. Everything before the first <h2> becomes
 * the title slide.
 *
 * Nodes are MOVED into the overlay rather than cloned, so typeset MathJax,
 * highlighted code and any live widget keep working; they are moved back in
 * their original order on exit.
 */
(function () {
  "use strict";

  var CONTENT = ".md-content__inner";
  var BREAK_TAGS = { H2: true, HR: true };

  var state = null; // non-null only while presenting
  var toggleButton = null;

  function el(tag, cls, parent) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (parent) parent.appendChild(node);
    return node;
  }

  /* Widgets that size themselves against the viewport (the walkthrough's arrow
   * layer, for one) need a nudge once the stage geometry has settled. */
  function reflow() {
    // Synchronously first: setting .hidden above already invalidated layout, so
    // a listener reading clientWidth here gets the new geometry. The rAF pass
    // catches anything that settles a frame later - and is skipped entirely
    // while the tab is hidden, which is why it cannot be the only signal.
    window.dispatchEvent(new Event("resize"));
    requestAnimationFrame(function () {
      window.dispatchEvent(new Event("resize"));
    });
  }

  function isTyping(event) {
    var node = event.target;
    if (!node || !node.tagName) return false;
    var tag = node.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || node.isContentEditable;
  }

  function groupNodes(container) {
    var groups = [];
    var current = null;
    var children = Array.prototype.slice.call(container.childNodes);

    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      var isBreak = node.nodeType === 1 && BREAK_TAGS[node.tagName];

      if (isBreak || current === null) {
        current = [];
        groups.push(current);
      }
      // A horizontal rule only marks the break; it is not slide content.
      if (!(node.nodeType === 1 && node.tagName === "HR")) {
        current.push(node);
      }
    }

    return groups.filter(function (group) {
      return group.some(function (node) {
        return node.nodeType !== 3 || node.textContent.trim() !== "";
      });
    });
  }

  function buildOverlay(count) {
    var overlay = el("div", "present", document.body);
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Presentation");
    overlay.setAttribute("tabindex", "-1");

    var ui = { overlay: overlay };
    ui.stage = el("div", "present__stage", overlay);

    var bar = el("div", "present__bar", overlay);
    ui.progress = el("div", "present__progress", bar);
    ui.fill = el("div", "present__fill", ui.progress);

    ui.prev = el("button", "present__btn", bar);
    ui.prev.type = "button";
    ui.prev.textContent = "←";
    ui.prev.title = "Previous slide";

    ui.counter = el("div", "present__counter", bar);
    ui.counter.textContent = "1 / " + count;

    ui.next = el("button", "present__btn", bar);
    ui.next.type = "button";
    ui.next.textContent = "→";
    ui.next.title = "Next slide";

    ui.exit = el("button", "present__btn present__btn--exit", bar);
    ui.exit.type = "button";
    ui.exit.textContent = "Esc";
    ui.exit.title = "Exit presentation";

    return ui;
  }

  function show(index) {
    if (!state) return;
    var bounded = Math.min(state.slides.length - 1, Math.max(0, index));
    state.index = bounded;

    for (var i = 0; i < state.slides.length; i++) {
      state.slides[i].hidden = i !== bounded;
    }

    state.ui.counter.textContent = bounded + 1 + " / " + state.slides.length;
    state.ui.fill.style.width =
      ((bounded + 1) / state.slides.length) * 100 + "%";
    state.ui.prev.disabled = bounded === 0;
    state.ui.next.disabled = bounded === state.slides.length - 1;
    state.ui.stage.scrollTop = 0;
    reflow();
  }

  function go(delta) {
    if (state) show(state.index + delta);
  }

  function enter() {
    if (state || !isPresentable()) return;

    var container = document.querySelector(CONTENT);
    if (!container) return;

    var groups = groupNodes(container);
    if (!groups.length) return;

    var original = Array.prototype.slice.call(container.childNodes);
    var ui = buildOverlay(groups.length);
    var slides = [];

    for (var i = 0; i < groups.length; i++) {
      var slide = el("section", "present__slide", ui.stage);
      var inner = el("div", "present__inner md-typeset", slide);
      for (var k = 0; k < groups[i].length; k++) {
        inner.appendChild(groups[i][k]); // moves the node out of the page
      }
      slides.push(slide);
    }

    state = { container: container, original: original, slides: slides, ui: ui, index: 0 };

    ui.prev.addEventListener("click", function () {
      go(-1);
    });
    ui.next.addEventListener("click", function () {
      go(1);
    });
    ui.exit.addEventListener("click", exit);

    document.body.classList.add("present-active");
    if (toggleButton) toggleButton.hidden = true;
    ui.overlay.focus();
    show(0);
  }

  function exit() {
    if (!state) return;

    // Put every node back in its original order, then drop the overlay.
    for (var i = 0; i < state.original.length; i++) {
      state.container.appendChild(state.original[i]);
    }
    state.ui.overlay.remove();

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function () {
        /* the browser may refuse; nothing to recover */
      });
    }

    document.body.classList.remove("present-active");
    if (toggleButton) toggleButton.hidden = false;
    state = null;
    reflow();
  }

  /* Interactive embeds opt out of the deck's arrow keys with data-keys="own"
   * (the stepper is exempt by class, since it always wants them). */
  function isInsideWidget(event) {
    var node = event.target;
    return !!(node && node.closest && node.closest('.step-walk, [data-keys="own"]'));
  }

  /* Runs in the CAPTURE phase, ahead of Material's own keyboard bindings.
   * Material claims f, s, / (search) and n, p, ., (page navigation), so a
   * bubble-phase listener loses those keys - pressing "p" navigated to the
   * previous page instead of presenting. Handled keys are stopped outright
   * while a deck is open; a focused stepper keeps its arrow keys. */
  function onKeydown(event) {
    if (isTyping(event)) return;

    if (!state) {
      // Shift+P: unclaimed by Material, unlike a bare "p". Browsers report the
      // key as "P", but synthesised events sometimes send "p" + shiftKey.
      var pressedP = event.key === "P" || event.key === "p";
      if (pressedP && event.shiftKey && !event.ctrlKey && !event.metaKey) {
        enter();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    if (isInsideWidget(event) && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      return;
    }

    switch (event.key) {
      case "ArrowRight":
      case "PageDown":
      case " ":
        go(1);
        break;
      case "ArrowLeft":
      case "PageUp":
        go(-1);
        break;
      case "Home":
        show(0);
        break;
      case "End":
        show(state.slides.length - 1);
        break;
      case "Escape":
        exit();
        break;
      case "f":
        if (document.fullscreenElement) {
          if (document.exitFullscreen) document.exitFullscreen();
        } else if (state.ui.overlay.requestFullscreen) {
          state.ui.overlay.requestFullscreen().catch(function () {
            /* fullscreen is a nicety, not required */
          });
        }
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  /* Blog index, archive and category pages are generated lists of other posts,
   * not writing of their own - the blog plugin marks each entry on them with
   * .md-post--excerpt. A page also has to split into more than a title slide,
   * which means at least one <h2>. */
  function isPresentable() {
    var container = document.querySelector(CONTENT);
    if (!container) return false;
    if (container.querySelector(".md-post--excerpt")) return false;
    return !!container.querySelector("h2");
  }

  function mountToggle() {
    if (toggleButton) toggleButton.remove();
    toggleButton = null;
    if (!isPresentable()) return;
    toggleButton = el("button", "present-toggle", document.body);
    toggleButton.type = "button";
    toggleButton.textContent = "Slide show";
    toggleButton.title = "Start slide show (Shift+P)";
    toggleButton.addEventListener("click", enter);
  }

  function init() {
    // Instant navigation can swap the page out from under an open deck.
    exit();
    mountToggle();
  }

  document.addEventListener("keydown", onKeydown, true);

  if (typeof window.document$ !== "undefined" && window.document$.subscribe) {
    window.document$.subscribe(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
