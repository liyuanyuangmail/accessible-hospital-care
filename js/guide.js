(function () {
  "use strict";

  var wizard = document.getElementById("wizard");
  var steps = wizard ? Array.prototype.slice.call(wizard.querySelectorAll("[data-step]")) : [];
  var done = document.getElementById("done");
  var bar = document.getElementById("action-bar");
  var prev = document.getElementById("prev");
  var next = document.getElementById("next");
  var got = document.getElementById("got-it");
  var progress = document.getElementById("progress");
  var progressLabel = document.getElementById("progress-label");
  var fill = document.getElementById("progress-fill");
  var showAllBtn = document.getElementById("show-all");
  var doneTitle = document.getElementById("done-title");
  var doneLead = document.getElementById("done-lead");
  var status = document.getElementById("understood-status");
  var jumps = Array.prototype.slice.call(document.querySelectorAll("[data-goto]"));

  if (!wizard || !done || !bar || !prev || !next || !got || !progress || steps.length === 0) {
    return;
  }

  document.documentElement.classList.add("js");

  var storageKey = "ahc-understood";
  var understood = {};
  try {
    JSON.parse(sessionStorage.getItem(storageKey) || "[]").forEach(function (n) {
      understood[String(n)] = true;
    });
  } catch (err) {
    understood = {};
  }

  function saveUnderstood() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(Object.keys(understood)));
    } catch (err) {
      /* Ignore quota or private-mode failures. */
    }
  }

  function readLocation() {
    var hash = location.hash || "";
    if (hash === "#done") return { type: "done" };
    var match = hash.match(/^#step-(\d+)$/);
    if (match) {
      var n = parseInt(match[1], 10);
      if (n >= 1 && n <= steps.length) return { type: "step", index: n - 1 };
    }
    return { type: "step", index: 0 };
  }

  function hashFor(state) {
    return state.type === "done" ? "#done" : "#step-" + (state.index + 1);
  }

  function titleOf(step) {
    return step.getAttribute("data-step-title") || "";
  }

  function syncBar() {
    var hide = document.documentElement.classList.contains("show-all") || wizard.classList.contains("is-finished");
    bar.hidden = hide;
  }

  function render(state, opts) {
    opts = opts || {};
    var finished = state.type === "done";
    wizard.classList.toggle("is-finished", finished);

    steps.forEach(function (step, i) {
      step.classList.toggle("is-active", !finished && i === state.index);
    });
    done.classList.toggle("is-active", finished);

    var currentNumber = finished ? steps.length : state.index + 1;
    progress.setAttribute("aria-valuenow", String(currentNumber));
    progress.setAttribute("aria-valuemax", String(steps.length));

    var label;
    if (finished) {
      label = "五步都看完了";
      if (doneTitle) doneTitle.textContent = "你已经看完入院五步";
      if (doneLead) doneLead.textContent = "接下来可以出示沟通卡片，或查看住院须知。文字、卡片和呼叫铃就够用。";
    } else {
      label = "第 " + currentNumber + " 步，共 " + steps.length + " 步：" + titleOf(steps[state.index]);
    }
    if (progressLabel) progressLabel.textContent = label;
    if (fill) fill.style.width = ((finished ? 1 : currentNumber / steps.length) * 100) + "%";

    jumps.forEach(function (btn) {
      var n = parseInt(btn.getAttribute("data-goto"), 10);
      var on = !finished && n === currentNumber;
      if (on) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
      var known = !!understood[String(n)];
      btn.classList.toggle("is-understood", known);
      var name = btn.getAttribute("data-name") || btn.textContent.trim();
      btn.setAttribute("aria-label", known ? name + "，已看懂" : name);
    });

    if (!finished) {
      prev.disabled = state.index === 0;
      next.textContent = "下一步";
      if (status) status.hidden = !understood[String(state.index + 1)];
      document.title = titleOf(steps[state.index]) + " · 入院指引 · 即时可知";
    } else {
      document.title = "看完入院指引 · 即时可知";
    }

    var hash = hashFor(state);
    if (opts.history === "push" && location.hash !== hash) history.pushState({ ahc: true }, "", hash);
    if (opts.history === "replace" && location.hash !== hash) history.replaceState({ ahc: true }, "", hash);

    syncBar();

    if (opts.focus) {
      var heading = finished ? doneTitle : steps[state.index].querySelector("h2");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    }
  }

  function advance(mark) {
    var state = readLocation();
    if (state.type === "done") return;
    if (mark) {
      understood[String(state.index + 1)] = true;
      saveUnderstood();
    }
    if (state.index < steps.length - 1) {
      render({ type: "step", index: state.index + 1 }, { history: "push", focus: true });
    } else {
      render({ type: "done" }, { history: "push", focus: true });
    }
  }

  prev.addEventListener("click", function () {
    var state = readLocation();
    if (state.type === "step" && state.index > 0) {
      render({ type: "step", index: state.index - 1 }, { history: "push", focus: true });
    }
  });

  next.addEventListener("click", function () { advance(false); });
  got.addEventListener("click", function () { advance(true); });

  jumps.forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.documentElement.classList.remove("show-all");
      if (showAllBtn) {
        showAllBtn.setAttribute("aria-pressed", "false");
        showAllBtn.textContent = "一次看完全部步骤";
      }
      var n = parseInt(btn.getAttribute("data-goto"), 10);
      render({ type: "step", index: n - 1 }, { history: "push", focus: true });
    });
  });

  if (showAllBtn) {
    showAllBtn.addEventListener("click", function () {
      var on = document.documentElement.classList.toggle("show-all");
      showAllBtn.setAttribute("aria-pressed", on ? "true" : "false");
      showAllBtn.textContent = on ? "回到一步一步看" : "一次看完全部步骤";
      if (!on) render(readLocation(), { history: "none", focus: false });
      syncBar();
    });
  }

  var restart = document.getElementById("restart");
  if (restart) {
    restart.addEventListener("click", function () {
      document.documentElement.classList.remove("show-all");
      if (showAllBtn) {
        showAllBtn.setAttribute("aria-pressed", "false");
        showAllBtn.textContent = "一次看完全部步骤";
      }
      render({ type: "step", index: 0 }, { history: "push", focus: true });
    });
  }

  window.addEventListener("popstate", function () {
    document.documentElement.classList.remove("show-all");
    if (showAllBtn) {
      showAllBtn.setAttribute("aria-pressed", "false");
      showAllBtn.textContent = "一次看完全部步骤";
    }
    render(readLocation(), { history: "none", focus: true });
  });

  var initialHash = location.hash;
  var deepLink = /^#step-\d+$/.test(initialHash) || initialHash === "#done";
  render(readLocation(), { history: "none", focus: false });
  document.documentElement.classList.add("wizard-ready");
  if (deepLink) {
    var opened = readLocation();
    var heading = opened.type === "done" ? doneTitle : steps[opened.index].querySelector("h2");
    if (heading) heading.focus();
  }

  var ns = (window.AccessibleHospitalCare = window.AccessibleHospitalCare || {});
  ns.admissionGuide = {
    status: "ready",
    steps: steps.map(function (step, index) {
      return {
        number: index + 1,
        id: step.id,
        title: step.getAttribute("data-step-title"),
        slot: step.getAttribute("data-ai-sign-slot")
      };
    })
  };
})();
