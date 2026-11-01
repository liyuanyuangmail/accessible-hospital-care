(function (root) {
  "use strict";

  var dialog = root.document.getElementById("show-dialog");
  var fillKey = "ahc-fills";
  var careKey = "ahc-care";
  var ns = (root.AccessibleHospitalCare = root.AccessibleHospitalCare || {});

  function readJson(key) {
    try {
      var raw = root.localStorage.getItem(key);
      var data = raw ? JSON.parse(raw) : null;
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      return data;
    } catch (err) {
      return {};
    }
  }

  function writeJson(key, data) {
    try {
      root.localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      /* Private mode: the card can still be shown this visit. */
    }
  }

  function clip(value, max) {
    var text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length > max) text = text.slice(0, max);
    return text;
  }

  function patchCare(partial) {
    var data = readJson(careKey);
    Object.keys(partial).forEach(function (key) {
      data[key] = partial[key];
    });
    writeJson(careKey, data);
  }

  if (!dialog) {
    ns.showCard = function () { return false; };
    return;
  }

  var textEl = root.document.getElementById("show-text");
  var urgentEl = root.document.getElementById("show-urgent");
  var copyBtn = root.document.getElementById("copy-phrase");
  var status = root.document.getElementById("copy-status");

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

  function showCard(text, urgent) {
    if (!textEl) return false;
    var value = String(text || "").trim();
    if (!value) return false;
    textEl.textContent = value;
    dialog.classList.toggle("is-long", value.length > 80);
    if (urgentEl) urgentEl.hidden = !urgent;
    dialog.classList.toggle("is-urgent", !!urgent);
    if (urgent) dialog.setAttribute("aria-describedby", "show-urgent");
    else dialog.removeAttribute("aria-describedby");
    resetCopy();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");
    textEl.setAttribute("tabindex", "-1");
    textEl.focus();
    return true;
  }

  ns.showCard = showCard;

  Array.prototype.forEach.call(root.document.querySelectorAll("[data-show]"), function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest("[data-card]");
      if (!card) return;
      showCard(phraseFor(card), card.getAttribute("data-urgent") === "true");
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
      if (root.navigator.clipboard && root.navigator.clipboard.writeText) {
        root.navigator.clipboard.writeText(value).then(ok).catch(fail);
      } else {
        fail();
      }
    });
  }

  var fills = readJson(fillKey);
  var careAllergy = "";
  var care = readJson(careKey);
  if (typeof care.allergy === "string") careAllergy = clip(care.allergy, 40);

  Array.prototype.forEach.call(root.document.querySelectorAll("[data-fill]"), function (input) {
    var id = input.id;
    if (!id) return;
    var stored = typeof fills[id] === "string" ? fills[id] : "";
    if (!stored && id === "allergy-input" && careAllergy) stored = careAllergy;
    if (stored) input.value = stored;
    input.addEventListener("input", function () {
      var all = readJson(fillKey);
      var next = id === "phone-input" ? clip(input.value, 24) : clip(input.value, 40);
      all[id] = input.value;
      writeJson(fillKey, all);
      if (id === "allergy-input") patchCare({ allergy: next });
    });
  });

  function setFillStatus(message) {
    var live = root.document.getElementById("fill-status");
    if (live) live.textContent = message;
  }

  var clearPhone = root.document.getElementById("clear-phone");
  if (clearPhone) {
    clearPhone.addEventListener("click", function () {
      var phone = root.document.getElementById("phone-input");
      if (phone) phone.value = "";
      var all = readJson(fillKey);
      all["phone-input"] = "";
      writeJson(fillKey, all);
      setFillStatus("已清除这台设备上的电话。");
    });
  }

  var clearFills = root.document.getElementById("clear-fills");
  if (clearFills) {
    clearFills.addEventListener("click", function () {
      ["allergy-input", "phone-input"].forEach(function (id) {
        var input = root.document.getElementById(id);
        if (input) input.value = "";
      });
      var all = readJson(fillKey);
      all["allergy-input"] = "";
      all["phone-input"] = "";
      writeJson(fillKey, all);
      patchCare({ allergy: "" });
      setFillStatus("已清除这台设备上的过敏和电话。住院须知里的过敏也已清掉。");
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
