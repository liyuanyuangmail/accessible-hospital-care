(function () {
  "use strict";

  var dialog = document.getElementById("show-dialog");
  if (!dialog) return;

  var textEl = document.getElementById("show-text");
  var urgentEl = document.getElementById("show-urgent");
  var copyBtn = document.getElementById("copy-phrase");
  var status = document.getElementById("copy-status");

  function resetCopy() {
    if (copyBtn) copyBtn.textContent = "复制文字";
    if (status) status.textContent = "";
  }

  function phraseFor(card) {
    var template = card.getAttribute("data-card") || "";
    var input = card.querySelector("[data-fill]");
    if (!input) return template;
    var value = input.value.replace(/\s+/g, " ").trim();
    if (!value) return card.getAttribute("data-card-empty") || template;
    return template.split("____").join(value);
  }

  function closeDialog() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-show]"), function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest("[data-card]");
      if (!card || !textEl) return;
      var urgent = card.getAttribute("data-urgent") === "true";
      textEl.textContent = phraseFor(card);
      if (urgentEl) urgentEl.hidden = !urgent;
      dialog.classList.toggle("is-urgent", urgent);
      if (urgent) dialog.setAttribute("aria-describedby", "show-urgent");
      else dialog.removeAttribute("aria-describedby");
      resetCopy();
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "open");
      textEl.setAttribute("tabindex", "-1");
      textEl.focus();
    });
  });

  Array.prototype.forEach.call(dialog.querySelectorAll("[data-close]"), function (btn) {
    btn.addEventListener("click", closeDialog);
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeDialog();
  });

  dialog.addEventListener("close", resetCopy);

  var search = document.getElementById("phrase-search");
  var empty = document.getElementById("phrase-empty");
  var countEl = document.getElementById("phrase-count");
  var groups = Array.prototype.slice.call(document.querySelectorAll("[data-group]"));
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  var activeFilter = "all";

  function applyPhraseFilter() {
    if (!groups.length) return;
    var query = search ? search.value.replace(/\s+/g, " ").trim().toLowerCase() : "";
    var shown = 0;
    groups.forEach(function (section) {
      var group = section.getAttribute("data-group");
      var cards = section.querySelectorAll(".phrase");
      var sectionShown = 0;
      Array.prototype.forEach.call(cards, function (card) {
        var text = (card.textContent || "").toLowerCase();
        var groupOk = activeFilter === "all" || activeFilter === group;
        var textOk = !query || text.indexOf(query) !== -1;
        var visible = groupOk && textOk;
        card.hidden = !visible;
        if (visible) sectionShown += 1;
      });
      section.hidden = sectionShown === 0;
      shown += sectionShown;
    });
    if (countEl) countEl.textContent = "现在显示 " + shown + " 句";
    if (empty) empty.hidden = shown !== 0;
  }

  if (groups.length) {
    if (search) {
      search.addEventListener("input", applyPhraseFilter);
    }
    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeFilter = btn.getAttribute("data-filter") || "all";
        filterButtons.forEach(function (other) {
          other.setAttribute("aria-pressed", other === btn ? "true" : "false");
        });
        applyPhraseFilter();
      });
    });
    applyPhraseFilter();
    Array.prototype.forEach.call(document.querySelectorAll('a[href="#urgent"]'), function (link) {
      link.addEventListener("click", function () {
        activeFilter = "all";
        if (search) search.value = "";
        filterButtons.forEach(function (other) {
          other.setAttribute("aria-pressed", other.getAttribute("data-filter") === "all" ? "true" : "false");
        });
        applyPhraseFilter();
      });
    });
  }

  if (copyBtn && textEl) {
    copyBtn.addEventListener("click", function () {
      var value = textEl.textContent || "";
      function ok() {
        copyBtn.textContent = "已复制";
        if (status) status.textContent = "已复制到剪贴板";
      }
      function fail() {
        copyBtn.textContent = "请长按大字复制";
        if (status) status.textContent = "无法自动复制，请长按上面的大字自行复制";
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(ok).catch(fail);
      } else {
        fail();
      }
    });
  }
})();
