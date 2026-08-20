/*
 * walkthrough.js - generic chess-style step viewer.
 *
 * Usage in markdown:
 *   <div class="step-walk" data-name="partition"></div>
 *
 * data-name is resolved against the site root, so it works from any page depth.
 * data-src is the escape hatch for data living somewhere else.
 *
 * The JSON schema is documented in docs/meta/authoring.md. This file is the
 * only renderer: improving it improves every walkthrough on the site.
 */
(function () {
  "use strict";

  var SELECTOR = ".step-walk[data-name], .step-walk[data-src]";
  var ARROW_LIFT = 0.55; // control-point height as a fraction of span width
  var LABEL_ROOM = 16; // px kept clear above an arc for its label

  function el(tag, cls, parent) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (parent) parent.appendChild(node);
    return node;
  }

  function svgEl(tag, parent) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (parent) parent.appendChild(node);
    return node;
  }

  function buildShell(root, data) {
    root.innerHTML = "";
    root.setAttribute("tabindex", "0");

    var ui = {};
    if (data.title) {
      ui.title = el("div", "sw__title", root);
      ui.title.textContent = data.title;
    }

    ui.board = el("div", "sw__board", root);
    ui.cells = el("div", "sw__cells", ui.board);
    ui.overlay = svgEl("svg", ui.board);
    ui.overlay.setAttribute("class", "sw__overlay");

    var defs = svgEl("defs", ui.overlay);
    var marker = svgEl("marker", defs);
    marker.setAttribute("id", "sw-arrowhead-" + Math.random().toString(36).slice(2));
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto-start-reverse");
    var head = svgEl("path", marker);
    head.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    head.setAttribute("class", "sw__arrowhead");
    ui.markerId = marker.getAttribute("id");

    ui.caption = el("div", "sw__caption", root);

    if (data.code) {
      ui.codeWrap = el("pre", "sw__code", root);
      ui.code = el("code", null, ui.codeWrap);
    }

    var controls = el("div", "sw__controls", root);
    ui.prev = el("button", "sw__btn", controls);
    ui.prev.type = "button";
    ui.prev.textContent = "← Prev";
    ui.prev.setAttribute("aria-label", "Previous step");

    ui.progress = el("div", "sw__progress", controls);
    ui.bar = el("div", "sw__bar", ui.progress);

    ui.counter = el("div", "sw__counter", controls);

    ui.next = el("button", "sw__btn", controls);
    ui.next.type = "button";
    ui.next.textContent = "Next →";
    ui.next.setAttribute("aria-label", "Next step");

    return ui;
  }

  function renderCells(ui, step) {
    ui.cells.innerHTML = "";
    ui.byId = {};

    if (step.html) {
      ui.cells.innerHTML = step.html;
      var tagged = ui.cells.querySelectorAll("[data-sw-id]");
      for (var t = 0; t < tagged.length; t++) {
        ui.byId[tagged[t].getAttribute("data-sw-id")] = tagged[t];
      }
      return;
    }

    var cells = step.cells || [];
    for (var i = 0; i < cells.length; i++) {
      var spec = cells[i];
      var cls = "sw-cell";
      if (spec.class) {
        var tokens = String(spec.class).split(/\s+/);
        for (var k = 0; k < tokens.length; k++) {
          if (tokens[k]) cls += " sw-cell--" + tokens[k];
        }
      }
      var cell = el("div", cls, ui.cells);
      var value = el("div", "sw-cell__value", cell);
      value.textContent = spec.label != null ? spec.label : "";
      if (spec.sub) {
        var sub = el("div", "sw-cell__sub", cell);
        sub.textContent = spec.sub;
      }
      if (spec.id) ui.byId[spec.id] = cell;
    }
  }

  function renderArrows(ui, step) {
    var svg = ui.overlay;
    var stale = svg.querySelectorAll(".sw__arrow, .sw__arrow-label");
    for (var s = 0; s < stale.length; s++) stale[s].remove();

    var arrows = step.arrows || [];
    if (!arrows.length) return;

    var base = ui.board.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + base.width + " " + base.height);

    for (var i = 0; i < arrows.length; i++) {
      var arrow = arrows[i];
      var from = ui.byId[arrow.from];
      var to = ui.byId[arrow.to];
      if (!from || !to || from === to) continue;

      var a = from.getBoundingClientRect();
      var b = to.getBoundingClientRect();
      var x1 = a.left + a.width / 2 - base.left;
      var x2 = b.left + b.width / 2 - base.left;
      var y1 = a.top - base.top;
      var y2 = b.top - base.top;
      // The board clips vertically, so never lift the control point past the
      // headroom above the cells (minus room for the label).
      var headroom = Math.max(0, Math.min(y1, y2) - LABEL_ROOM);
      var lift = Math.min(
        Math.max(24, Math.abs(x2 - x1) * ARROW_LIFT),
        headroom * 2
      );
      var cx = (x1 + x2) / 2;
      var cy = Math.min(y1, y2) - lift;

      var path = svgEl("path", svg);
      path.setAttribute(
        "d",
        "M " + x1 + " " + y1 + " Q " + cx + " " + cy + " " + x2 + " " + y2
      );
      path.setAttribute("class", "sw__arrow" + (arrow.class ? " sw__arrow--" + arrow.class : ""));
      path.setAttribute("marker-end", "url(#" + ui.markerId + ")");

      if (arrow.label) {
        // Apex of the quadratic at t = 0.5, so the label sits on the curve.
        var apex = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
        var text = svgEl("text", svg);
        text.setAttribute("class", "sw__arrow-label");
        text.setAttribute("x", cx);
        text.setAttribute("y", apex - 5);
        text.setAttribute("text-anchor", "middle");
        text.textContent = arrow.label;
      }
    }
  }

  function renderCode(ui, data, step) {
    if (!ui.code) return;
    var hot = {};
    var lines = step.codeLines || [];
    for (var h = 0; h < lines.length; h++) hot[lines[h]] = true;

    ui.code.innerHTML = "";
    var source = data.code.replace(/\n$/, "").split("\n");
    for (var i = 0; i < source.length; i++) {
      var lineNo = i + 1;
      var row = el("span", "sw-line" + (hot[lineNo] ? " sw-line--hot" : ""), ui.code);
      var num = el("span", "sw-line__no", row);
      num.textContent = String(lineNo);
      var body = el("span", "sw-line__text", row);
      body.textContent = source[i] || " ";
    }
  }

  function mount(root, data) {
    var steps = data.steps || [];
    if (!steps.length) {
      root.textContent = "Walkthrough has no steps.";
      return;
    }

    var ui = buildShell(root, data);
    var index = 0;

    function draw() {
      var step = steps[index];
      renderCells(ui, step);
      renderCode(ui, data, step);
      ui.caption.innerHTML = step.caption || "";
      ui.counter.textContent = index + 1 + " / " + steps.length;
      ui.bar.style.width = ((index + 1) / steps.length) * 100 + "%";
      ui.prev.disabled = index === 0;
      ui.next.disabled = index === steps.length - 1;
      // Arrows need final cell geometry, so measure on the next frame.
      requestAnimationFrame(function () {
        renderArrows(ui, step);
      });
    }

    function go(delta) {
      var next = Math.min(steps.length - 1, Math.max(0, index + delta));
      if (next === index) return;
      index = next;
      draw();
    }

    ui.prev.addEventListener("click", function () {
      go(-1);
    });
    ui.next.addEventListener("click", function () {
      go(1);
    });
    root.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      go(event.key === "ArrowLeft" ? -1 : 1);
      event.preventDefault();
      // While presenting, the deck listens for the same keys on document. A
      // focused stepper owns them, so stop the event before it advances the
      // slide as well.
      event.stopPropagation();
    });
    window.addEventListener("resize", function () {
      renderArrows(ui, steps[index]);
    });

    draw();
  }

  /* Material publishes the page's relative path back to the site root (e.g.
   * "../..") in its #__config blob, which is how data-name works at any
   * nesting depth without pages counting "../" by hand.
   *
   * That blob is only correct for the document that shipped it: with
   * navigation.instant, Material swaps page content in place and leaves the
   * FIRST page's #__config behind, so reading it later yields a base relative
   * to whichever page the visitor happened to land on. Resolve it to an
   * absolute URL once, here at load time, while base and location still agree.
   */
  var SITE_ROOT = (function () {
    var base = ".";
    var config = document.getElementById("__config");
    if (config) {
      try {
        base = JSON.parse(config.textContent).base || ".";
      } catch (error) {
        /* fall through to the same-directory default */
      }
    }
    return new URL(base.replace(/\/?$/, "/"), window.location.href).href;
  })();

  function resolveSrc(root) {
    var explicit = root.getAttribute("data-src");
    if (explicit) return explicit;
    return SITE_ROOT + "data/" + root.getAttribute("data-name") + ".json";
  }

  function load(root) {
    if (root.dataset.swReady === "1") return;
    root.dataset.swReady = "1";
    var src = resolveSrc(root);
    fetch(src)
      .then(function (response) {
        if (!response.ok) throw new Error(response.status + " " + response.statusText);
        return response.json();
      })
      .then(function (data) {
        mount(root, data);
      })
      .catch(function (error) {
        root.innerHTML = "";
        var warn = el("div", "sw__error", root);
        warn.textContent = "Could not load walkthrough " + src + " (" + error.message + ")";
      });
  }

  function initAll() {
    var nodes = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < nodes.length; i++) load(nodes[i]);
  }

  // Material's instant navigation swaps page content without a reload.
  if (typeof window.document$ !== "undefined" && window.document$.subscribe) {
    window.document$.subscribe(initAll);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
