/* Mockup page behaviour. Query parameters:
   appearance=light|soot-brass|dark  the starting appearance (theme cookie values)
   width=1280|360                    the starting frame width
   bare                              show the page alone, with no toolbar
   The page shows itself alone (bare) when it has ?bare, when it sits in a
   frame, or when ?width is given and the window is no wider than that
   width plus 40 px: a screenshot tool that sets its viewport to the width
   gets the page alone. Otherwise it shows a toolbar and the page in a frame
   of the chosen width. */
(function () {
  var MODES = [["light", "Ivory Vellum"], ["soot-brass", "Soot & Brass"], ["dark", "Espresso Leather"]];
  var WIDTHS = ["1280", "360"];
  var params = new URLSearchParams(location.search);
  var mode = params.get("appearance") || params.get("mode") || "light";
  if (!MODES.some(function (m) { return m[0] === mode; })) mode = "light";
  var width = params.get("width");
  var widthGiven = WIDTHS.indexOf(width) !== -1;
  if (!widthGiven) width = "1280";
  var framed = window !== window.top;
  var bare = params.has("bare") || framed ||
    (widthGiven && window.innerWidth <= Number(width) + 40);
  var root = document.documentElement;
  root.setAttribute("data-mode", mode);
  if (!bare) root.classList.add("pb-shell-page");

  function setMode(next) {
    mode = next;
    root.setAttribute("data-mode", mode);
    document.querySelectorAll(".appearance-swatch-input").forEach(function (input) {
      input.checked = input.value === mode;
    });
  }

  function wireBare() {
    setMode(mode);
    var modal = document.querySelector("[data-preview-modal]");
    if (modal) {
      modal.showModal();
      modal.addEventListener("click", function (event) {
        if (event.target.closest("[data-preview-dismiss]")) modal.close();
      });
      modal.addEventListener("close", function () {
        var trigger = document.querySelector('[aria-expanded="true"].button-quiet-danger');
        if (!trigger || !trigger.getClientRects().length) {
          var panel = modal.getAttribute("role") === "alertdialog" ? "quest-sidebar" : "site-panel";
          trigger = document.querySelector('.trail-band [aria-controls="' + panel + '"]');
        }
        if (trigger) trigger.focus();
      });
    }

    var narrow = window.matchMedia("(width < 64rem)");
    var sidebar = document.getElementById("quest-sidebar");
    var sidebarTrigger = document.querySelector('.trail-band [aria-controls="quest-sidebar"]');
    function syncSidebar() {
      if (!sidebar || !sidebarTrigger) return;
      var open = sidebar.hasAttribute(narrow.matches ? "data-drawer-open" : "data-open");
      sidebarTrigger.setAttribute("aria-expanded", String(open));
      sidebarTrigger.setAttribute("aria-label", (open ? "Close" : "Open") + " quest sidebar");
    }
    syncSidebar();
    narrow.addEventListener("change", syncSidebar);
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || (modal && modal.open)) return;
      document.querySelectorAll(".appearance-swatch:is(:hover, :focus-within)").forEach(function (choice) {
        choice.setAttribute("data-tooltip-dismissed", "");
      });
      if (sidebar && narrow.matches && sidebar.hasAttribute("data-drawer-open")) {
        sidebar.removeAttribute("data-drawer-open");
        syncSidebar();
        sidebarTrigger.focus();
      }
    });
    document.querySelectorAll(".appearance-swatch").forEach(function (choice) {
      function resetTooltip() {
        if (!choice.matches(":hover, :focus-within")) choice.removeAttribute("data-tooltip-dismissed");
      }
      choice.addEventListener("pointerleave", resetTooltip);
      choice.addEventListener("focusout", function () { requestAnimationFrame(resetTooltip); });
    });

    var latest = document.querySelector("[data-preview-latest]");
    if (latest) {
      document.fonts.ready.then(function () {
        latest.scrollIntoView({ block: "center" });
      });
    }
    document.addEventListener("change", function (event) {
      var t = event.target;
      if (t.classList && t.classList.contains("appearance-swatch-input")) {
        setMode(t.value);
        if (framed) window.parent.postMessage({ pbAppearance: t.value }, "*");
      }
    });
    document.querySelectorAll('[role="tab"][aria-controls]').forEach(function (tab) {
      tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
    });
    document.addEventListener("keydown", function (event) {
      var tab = event.target.closest('[role="tab"][aria-controls]');
      if (!tab) return;
      var list = tab.closest('[role="tablist"]');
      var vertical = list.getAttribute("aria-orientation") === "vertical";
      var previous = vertical ? "ArrowUp" : "ArrowLeft";
      var next = vertical ? "ArrowDown" : "ArrowRight";
      if ([previous, next, "Home", "End"].indexOf(event.key) === -1) return;
      var tabs = Array.from(list.querySelectorAll('[role="tab"][aria-controls]'));
      var index = tabs.indexOf(tab);
      if (event.key === "Home") index = 0;
      if (event.key === "End") index = tabs.length - 1;
      if (event.key === previous) index = (index + tabs.length - 1) % tabs.length;
      if (event.key === next) index = (index + 1) % tabs.length;
      event.preventDefault();
      tabs[index].click();
      tabs[index].focus();
    });
    document.addEventListener("click", function (event) {
      var control = event.target.closest("[aria-controls]");
      if (!control) return;
      var target = document.getElementById(control.getAttribute("aria-controls"));
      if (!target) return;
      if (target.classList.contains("site-panel")) {
        var open = target.hasAttribute("data-open");
        if (open) { target.removeAttribute("data-open"); target.removeAttribute("open"); }
        else { target.setAttribute("data-open", "always"); target.setAttribute("open", ""); }
        document.querySelectorAll('[aria-controls="site-panel"]').forEach(function (b) {
          if (b.closest(".trail-band")) b.setAttribute("aria-expanded", String(!open));
        });
      } else if (target.classList.contains("quest-sidebar")) {
        var phone = window.matchMedia("(width < 64rem)").matches;
        var attr = phone ? "data-drawer-open" : "data-open";
        var on = target.hasAttribute(attr);
        if (on) target.removeAttribute(attr); else target.setAttribute(attr, "");
        syncSidebar();
        if (phone) {
          var destination = on ? target.querySelector("[aria-controls=quest-sidebar]") : sidebarTrigger;
          if (destination) destination.focus();
        }
      } else if (control.getAttribute("role") === "tab") {
        var list = control.closest("[role=tablist]");
        list.querySelectorAll("[role=tab]").forEach(function (tab) {
          var panel = document.getElementById(tab.getAttribute("aria-controls"));
          var selected = tab === control;
          tab.setAttribute("aria-selected", String(selected));
          tab.tabIndex = selected ? 0 : -1;
          if (panel) panel.hidden = !selected;
        });
      }
    });
  }

  function radios(name, items, current) {
    return items.map(function (item) {
      return '<label><input type="radio" name="' + name + '" value="' + item[0] + '"' +
        (item[0] === current ? " checked" : "") + "> " + item[1] + "</label>";
    }).join("");
  }

  function wireShell() {
    var shell = document.createElement("div");
    shell.className = "pb-shell";
    shell.innerHTML =
      '<div class="pb-bar"><a href="../index.html">All views</a>' +
      '<span class="pb-title"></span>' +
      '<fieldset><legend>Appearance</legend>' + radios("pb-appearance", MODES, mode) + "</fieldset>" +
      '<fieldset><legend>Width</legend>' +
      radios("pb-width", WIDTHS.map(function (w) { return [w, w + " px"]; }), width) + "</fieldset>" +
      '<a class="pb-alone" href="#">Open alone</a></div>' +
      '<div class="pb-stage"><iframe title="Mockup"></iframe></div>';
    document.body.appendChild(shell);
    shell.querySelector(".pb-title").textContent = document.title.replace(/ · .*$/, "");
    var frame = shell.querySelector("iframe");
    var alone = shell.querySelector(".pb-alone");
    function sync(reload) {
      var q = "?appearance=" + mode + "&width=" + width;
      history.replaceState(null, "", location.pathname + q);
      alone.href = location.pathname + q + "&bare";
      frame.style.inlineSize = width + "px";
      if (reload) frame.src = location.pathname + q + "&bare";
    }
    shell.addEventListener("change", function (event) {
      var t = event.target;
      if (t.name === "pb-appearance") { mode = t.value; sync(true); }
      if (t.name === "pb-width") { width = t.value; sync(true); }
    });
    window.addEventListener("message", function (event) {
      if (event.data && event.data.pbAppearance) {
        mode = event.data.pbAppearance;
        shell.querySelectorAll('[name="pb-appearance"]').forEach(function (r) { r.checked = r.value === mode; });
        sync(false);
      }
    });
    sync(true);
  }

  document.addEventListener("DOMContentLoaded", bare ? wireBare : wireShell);
})();
