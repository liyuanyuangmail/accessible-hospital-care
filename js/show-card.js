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
