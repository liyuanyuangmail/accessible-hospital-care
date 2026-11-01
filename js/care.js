/* On-device inpatient drafts for 即时可知.
   Checklists, a shift card, and a short family note stay in localStorage.
   Nothing here records audio or sends data. */
(function (root) {
  "use strict";

  var CARE_KEY = "ahc-care";
  var FILL_KEY = "ahc-fills";
  var GUIDE_KEY = "ahc-understood";

  var MED_KEYS = ["med-name", "med-when", "med-allergy", "med-own"];
  var WARD_KEYS = ["ward-bed", "ward-bell", "ward-toilet", "ward-meal", "ward-visit", "ward-night"];
  var CHECK_LABEL = {
    "med-name": "吃药前核对名字和腕带",
    "med-when": "饭前还是饭后",
    "med-allergy": "把过敏告诉护士",
    "med-own": "自己带来的药已经给护士看过",
    "ward-bed": "床号",
    "ward-bell": "呼叫铃",
    "ward-toilet": "卫生间方向",
    "ward-meal": "今天的吃饭时间",
    "ward-visit": "探视时间",
    "ward-night": "夜里怎么叫护士"
  };
  var DIETS = ["还没确认，请护士写下来", "普通饮食", "糖尿病饮食", "低盐", "流食或半流食"];
  var COMMS = ["请用文字，写短句。", "请打字，把屏幕转给我。", "我可以看口型。请面对我，同时写下来。"];
  var WHENS = ["饭前", "饭后", "睡前", "请护士写时间"];
  var FEELINGS = ["", "还好", "不舒服", "这里疼", "想休息", "想让家属来"];

  function clip(value, max) {
    var text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length > max) text = text.slice(0, max);
    return text;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function emptyState() {
    var checks = {};
    MED_KEYS.concat(WARD_KEYS).forEach(function (key) { checks[key] = false; });
    return {
      bed: "",
      allergy: "",
      diet: DIETS[0],
      comm: COMMS[0],
      checks: checks,
      meds: [],
      notes: [],
      familyFeeling: "",
      familyAsk: ""
    };
  }

  function oneOf(value, list, fallback) {
    return list.indexOf(value) >= 0 ? value : fallback;
  }

  function cleanMed(item) {
    if (!item || typeof item !== "object") return null;
    var name = clip(item.name, 40);
    if (!name) return null;
    return {
      id: clip(item.id || uid(), 24),
      name: name,
      when: oneOf(item.when, WHENS, "请护士写时间"),
      checked: !!item.checked
    };
  }

  function cleanNote(item) {
    if (!item || typeof item !== "object") return null;
    var text = clip(item.text, 120);
    if (!text) return null;
    var at = typeof item.at === "string" && item.at ? item.at : new Date().toISOString();
    return { id: clip(item.id || uid(), 24), text: text, at: at };
  }

  function normalize(raw) {
    var base = emptyState();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
    base.bed = clip(raw.bed, 20);
    base.allergy = clip(raw.allergy, 40);
    base.diet = oneOf(raw.diet, DIETS, DIETS[0]);
    base.comm = oneOf(raw.comm, COMMS, COMMS[0]);
    base.familyFeeling = oneOf(raw.familyFeeling, FEELINGS, "");
    base.familyAsk = clip(raw.familyAsk, 120);
    if (raw.checks && typeof raw.checks === "object") {
      MED_KEYS.concat(WARD_KEYS).forEach(function (key) {
        base.checks[key] = !!raw.checks[key];
      });
    }
    if (Array.isArray(raw.meds)) {
      base.meds = raw.meds.map(cleanMed).filter(Boolean).slice(0, 12);
    }
    if (Array.isArray(raw.notes)) {
      base.notes = raw.notes.map(cleanNote).filter(Boolean).slice(0, 20);
    }
    return base;
  }

  function guideProgress() {
    try {
      var store = root.sessionStorage;
      if (!store) return 0;
      var raw = JSON.parse(store.getItem(GUIDE_KEY) || "[]");
      if (!Array.isArray(raw)) return 0;
      var seen = {};
      raw.forEach(function (n) {
        var step = parseInt(n, 10);
        if (step >= 1 && step <= 5) seen[step] = true;
      });
      return Object.keys(seen).length;
    } catch (err) {
      return 0;
    }
  }

  function countDone(data, keys) {
    return keys.filter(function (key) { return data.checks[key]; }).length;
  }

  function missingLabels(data, keys) {
    return keys.filter(function (key) { return !data.checks[key]; }).map(function (key) {
      return CHECK_LABEL[key];
    });
  }

  function statusParts(data) {
    return [
      { k: "入院指引", v: guideProgress() + "/5 已看懂" },
      { k: "用药核对", v: countDone(data, MED_KEYS) + "/4 已勾选" },
      { k: "病区核对", v: countDone(data, WARD_KEYS) + "/6 已勾选" },
      { k: "床号", v: data.bed ? "已写上" : "还没写" }
    ];
  }

  function bedCardText(data) {
    return [
      "我听不见。",
      data.comm || COMMS[0],
      "床号：" + (data.bed || "请和我一起看腕带"),
      "过敏：" + (data.allergy || "请先问我，再给药"),
      "饮食：" + (data.diet || DIETS[0]),
      "呼叫铃我可以自己按，不用出声。"
    ].join("\n");
  }

  function handoverText(data) {
    var medLeft = missingLabels(data, MED_KEYS);
    var wardLeft = missingLabels(data, WARD_KEYS);
    var lines = [
      "换班请看这张卡",
      "我听不见。" + (data.comm || COMMS[0]),
      "床号：" + (data.bed || "还没写。请和我一起看腕带。"),
      "过敏：" + (data.allergy || "还没写。请先问我，再给药。"),
      "饮食：" + (data.diet || DIETS[0])
    ];
    if (!medLeft.length) lines.push("用药核对：" + MED_KEYS.length + " 项都已在这台设备上勾选。");
    else lines.push("用药还没勾：" + medLeft.join("、") + "。");
    if (data.meds.length) {
      lines.push("记下的药：");
      data.meds.forEach(function (med) {
        lines.push("- " + med.name + "，" + med.when + "，" + (med.checked ? "已请护士核对" : "还没核对"));
      });
    } else {
      lines.push("今天还没记下药名。请写给我。");
    }
    if (!wardLeft.length) lines.push("病区核对：" + WARD_KEYS.length + " 项都已在这台设备上勾选。");
    else lines.push("病区还没确认：" + wardLeft.join("、") + "。");
    if (data.notes.length) lines.push("我最后写给护士：" + data.notes[0].text);
    lines.push("请下一班继续用文字，写短句。这张卡不是医院的正式病历。");
    return lines.join("\n");
  }

  function familyText(data) {
    return [
      "给家属。请用文字看，不要只打电话。",
      "床号：" + (data.bed || "还没写"),
      "我现在：" + (data.familyFeeling || "还没选"),
      data.familyAsk ? "我想说：" + data.familyAsk : "今天还没写想说的话。请用文字问我。",
      "请打字回复我。"
    ].join("\n");
  }

  function readStore() {
    try {
      var store = root.localStorage;
      if (!store) return emptyState();
      return normalize(JSON.parse(store.getItem(CARE_KEY) || "null"));
    } catch (err) {
      return emptyState();
    }
  }

  function writeStore(data) {
    try {
      if (!root.localStorage) return;
      root.localStorage.setItem(CARE_KEY, JSON.stringify(data));
      var fills = {};
      try {
        fills = JSON.parse(root.localStorage.getItem(FILL_KEY) || "{}") || {};
      } catch (err) {
        fills = {};
      }
      if (!fills || typeof fills !== "object" || Array.isArray(fills)) fills = {};
      fills["allergy-input"] = data.allergy;
      root.localStorage.setItem(FILL_KEY, JSON.stringify(fills));
    } catch (err) {
      /* Ignore quota or private-mode failures. The screen still updates. */
    }
  }

  function borrowAllergy(data) {
    if (data.allergy || !root.localStorage) return data;
    try {
      var fills = JSON.parse(root.localStorage.getItem(FILL_KEY) || "{}");
      if (fills && typeof fills["allergy-input"] === "string" && fills["allergy-input"].trim()) {
        data.allergy = clip(fills["allergy-input"], 40);
      }
    } catch (err) {
      /* Keep the care draft as stored. */
    }
    return data;
  }

  function formatWhen(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    var hh = String(date.getHours()).padStart(2, "0");
    var mm = String(date.getMinutes()).padStart(2, "0");
    return (date.getMonth() + 1) + "月" + date.getDate() + "日 " + hh + ":" + mm;
  }

  function say(message) {
    var live = root.document && root.document.getElementById("care-status-live");
    if (live) live.textContent = message;
  }

  function renderStatus(data) {
    var doc = root.document;
    if (!doc) return;
    var mount = doc.getElementById("care-status-mount");
    if (!mount) return;
    mount.textContent = "";
    statusParts(data).forEach(function (part) {
      var item = doc.createElement("li");
      var chip = doc.createElement("span");
      chip.className = "status-chip";
      var name = doc.createElement("span");
      name.className = "status-k";
      name.textContent = part.k;
      var value = doc.createElement("span");
      value.className = "status-v";
      value.textContent = part.v;
      chip.appendChild(name);
      chip.appendChild(value);
      item.appendChild(chip);
      mount.appendChild(item);
    });
  }

  function setText(id, text) {
    var node = root.document.getElementById(id);
    if (node) node.textContent = text;
  }

  function button(label, attrs) {
    var node = root.document.createElement("button");
    node.type = "button";
    node.className = "btn";
    node.textContent = label;
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function renderMeds(data) {
    var doc = root.document;
    var list = doc.getElementById("med-list");
    if (!list) return;
    list.textContent = "";
    if (!data.meds.length) {
      var empty = doc.createElement("p");
      empty.className = "hint";
      empty.textContent = "还没有记下药名。写上护士给你的药名，再出示核对。";
      list.appendChild(empty);
      return;
    }
    data.meds.forEach(function (med) {
      var item = doc.createElement("article");
      item.className = "mini-item" + (med.checked ? " is-done" : "");
      var title = doc.createElement("h3");
      title.textContent = med.name;
      var meta = doc.createElement("p");
      meta.textContent = med.when + " · " + (med.checked ? "已请护士核对" : "还没核对");
      var actions = doc.createElement("div");
      actions.className = "row-actions";
      actions.appendChild(button(med.checked ? "改回未核对" : "标成已核对", {
        "data-med-toggle": med.id
      }));
      actions.appendChild(button("出示给药核对", {
        "data-med-show": med.id,
        class: "btn btn-primary"
      }));
      var showBtn = actions.lastChild;
      showBtn.className = "btn btn-primary";
      actions.appendChild(button("删除", { "data-med-delete": med.id, "aria-label": "删除药品 " + med.name }));
      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function renderNotes(data) {
    var doc = root.document;
    var list = doc.getElementById("note-list");
    if (!list) return;
    list.textContent = "";
    if (!data.notes.length) {
      var empty = doc.createElement("p");
      empty.className = "hint";
      empty.textContent = "还没有留下句子。写一句，出示给护士，也可以留在这台设备上。";
      list.appendChild(empty);
      return;
    }
    data.notes.forEach(function (note) {
      var item = doc.createElement("article");
      item.className = "mini-item";
      var title = doc.createElement("h3");
      title.textContent = note.text;
      var meta = doc.createElement("p");
      meta.className = "hint";
      meta.textContent = formatWhen(note.at);
      var actions = doc.createElement("div");
      actions.className = "row-actions";
      var showBtn = button("再出示", { "data-note-show": note.id });
      showBtn.className = "btn btn-primary";
      actions.appendChild(showBtn);
      actions.appendChild(button("删除", { "data-note-delete": note.id, "aria-label": "删除这句话：" + note.text }));
      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function paintChecks(data) {
    Array.prototype.forEach.call(root.document.querySelectorAll("[data-check]"), function (box) {
      var key = box.getAttribute("data-check");
      var on = !!data.checks[key];
      box.checked = on;
      var row = box.closest(".check-row");
      if (row) row.classList.toggle("is-done", on);
      var state = row && row.querySelector(".check-state");
      if (state) state.textContent = on ? "已勾选" : "未勾选";
    });
  }

  function applyForm(data) {
    var doc = root.document;
    function setValue(id, value) {
      var node = doc.getElementById(id);
      if (node && node.value !== value) node.value = value;
    }
    setValue("care-bed", data.bed);
    setValue("care-allergy", data.allergy);
    setValue("care-diet", data.diet);
    setValue("care-comm", data.comm);
    setValue("care-feeling", data.familyFeeling);
    setValue("care-family-ask", data.familyAsk);
    paintChecks(data);
  }

  function refresh(data) {
    renderStatus(data);
    setText("bed-card-preview", bedCardText(data));
    setText("handover-preview", handoverText(data));
    setText("family-preview", familyText(data));
    renderMeds(data);
    renderNotes(data);
    paintChecks(data);
  }

  function show(text) {
    var api = root.AccessibleHospitalCare;
    if (api && typeof api.showCard === "function" && api.showCard(text, false)) return;
    say("这台设备暂时不能弹出大字。请直接把下面的文字转给对方看。");
  }

  function mount() {
    var doc = root.document;
    if (!doc) return;
    var state = borrowAllergy(readStore());
    renderStatus(state);

    if (!doc.getElementById("care-app")) return;
    applyForm(state);
    refresh(state);

    function commit(next, message) {
      state = normalize(next);
      writeStore(state);
      refresh(state);
      if (message) say(message);
    }

    function onField(id, key, max) {
      var node = doc.getElementById(id);
      if (!node) return;
      node.addEventListener("input", function () {
        var next = normalize(state);
        next[key] = clip(node.value, max);
        commit(next);
      });
    }

    onField("care-bed", "bed", 20);
    onField("care-allergy", "allergy", 40);
    onField("care-family-ask", "familyAsk", 120);

    ["care-diet", "care-comm", "care-feeling"].forEach(function (id) {
      var node = doc.getElementById(id);
      if (!node) return;
      node.addEventListener("change", function () {
        var next = normalize(state);
        if (id === "care-diet") next.diet = node.value;
        if (id === "care-comm") next.comm = node.value;
        if (id === "care-feeling") next.familyFeeling = node.value;
        commit(next, "已留在这台设备上。");
      });
    });

    Array.prototype.forEach.call(doc.querySelectorAll("[data-check]"), function (box) {
      box.addEventListener("change", function () {
        var key = box.getAttribute("data-check");
        var next = normalize(state);
        next.checks[key] = box.checked;
        commit(next, (box.checked ? "已勾选：" : "已取消：") + (CHECK_LABEL[key] || ""));
      });
    });

    var addMed = doc.getElementById("add-med");
    if (addMed) {
      addMed.addEventListener("click", function () {
        var nameInput = doc.getElementById("med-name");
        var whenInput = doc.getElementById("med-when");
        var name = clip(nameInput ? nameInput.value : "", 40);
        if (!name) {
          say("请先写药名。");
          if (nameInput) nameInput.focus();
          return;
        }
        if (state.meds.length >= 12) {
          say("最多记 12 条。请先删掉一条。");
          return;
        }
        var next = normalize(state);
        next.meds.unshift({
          id: uid(),
          name: name,
          when: whenInput ? whenInput.value : "请护士写时间",
          checked: false
        });
        if (nameInput) nameInput.value = "";
        commit(next, "已记下药名。可以出示给护士核对。");
      });
    }

    var medList = doc.getElementById("med-list");
    if (medList) {
      medList.addEventListener("click", function (event) {
        var target = event.target.closest("button");
        if (!target) return;
        var toggle = target.getAttribute("data-med-toggle");
        var showId = target.getAttribute("data-med-show");
        var removeId = target.getAttribute("data-med-delete");
        if (showId) {
          var found = null;
          state.meds.forEach(function (med) { if (med.id === showId) found = med; });
          if (found) show("请核对这是不是我的药：" + found.name + "，" + found.when + "。请写下来。");
          return;
        }
        var next = normalize(state);
        if (toggle) {
          next.meds = next.meds.map(function (med) {
            if (med.id === toggle) med.checked = !med.checked;
            return med;
          });
          commit(next, "已更新这条药的核对状态。");
        }
        if (removeId) {
          next.meds = next.meds.filter(function (med) { return med.id !== removeId; });
          commit(next, "已删除这条药名。");
        }
      });
    }

    var addNote = doc.getElementById("add-note");
    var showNote = doc.getElementById("show-note");
    function currentNote() {
      var input = doc.getElementById("note-draft");
      return clip(input ? input.value : "", 120);
    }
    if (showNote) {
      showNote.addEventListener("click", function () {
        var text = currentNote();
        if (!text) {
          say("请先写一句给护士的话。");
          var input = doc.getElementById("note-draft");
          if (input) input.focus();
          return;
        }
        show(text);
      });
    }
    if (addNote) {
      addNote.addEventListener("click", function () {
        var text = currentNote();
        if (!text) {
          say("请先写一句给护士的话。");
          return;
        }
        var next = normalize(state);
        next.notes.unshift({ id: uid(), text: text, at: new Date().toISOString() });
        next.notes = next.notes.slice(0, 20);
        var input = doc.getElementById("note-draft");
        if (input) input.value = "";
        commit(next, "这句话已留在这台设备上。");
      });
    }

    var noteList = doc.getElementById("note-list");
    if (noteList) {
      noteList.addEventListener("click", function (event) {
        var target = event.target.closest("button");
        if (!target) return;
        var showId = target.getAttribute("data-note-show");
        var removeId = target.getAttribute("data-note-delete");
        if (showId) {
          var found = null;
          state.notes.forEach(function (note) { if (note.id === showId) found = note; });
          if (found) show(found.text);
          return;
        }
        if (removeId) {
          var next = normalize(state);
          next.notes = next.notes.filter(function (note) { return note.id !== removeId; });
          commit(next, "已删除这句话。");
        }
      });
    }

    var showBed = doc.getElementById("show-bed-card");
    if (showBed) showBed.addEventListener("click", function () { show(bedCardText(state)); });
    var showHandover = doc.getElementById("show-handover");
    if (showHandover) showHandover.addEventListener("click", function () { show(handoverText(state)); });
    var showFamily = doc.getElementById("show-family");
    if (showFamily) showFamily.addEventListener("click", function () { show(familyText(state)); });

    var clearBtn = doc.getElementById("clear-care");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        try {
          if (root.localStorage) {
            root.localStorage.removeItem(CARE_KEY);
            var fills = {};
            try {
              fills = JSON.parse(root.localStorage.getItem(FILL_KEY) || "{}") || {};
            } catch (err) {
              fills = {};
            }
            if (!fills || typeof fills !== "object" || Array.isArray(fills)) fills = {};
            fills["allergy-input"] = "";
            fills["phone-input"] = "";
            root.localStorage.setItem(FILL_KEY, JSON.stringify(fills));
          }
        } catch (err) {
          /* Still reset the screen. */
        }
        state = emptyState();
        ["care-bed", "care-allergy", "care-family-ask", "med-name", "note-draft"].forEach(function (id) {
          var node = doc.getElementById(id);
          if (node) node.value = "";
        });
        applyForm(state);
        refresh(state);
        say("已清除这台设备上的床位卡、核对、药名、句子和电话。入院五步的进度还在。");
      });
    }
  }

  var api = {
    clip: clip,
    emptyState: emptyState,
    normalize: normalize,
    statusParts: statusParts,
    bedCardText: bedCardText,
    handoverText: handoverText,
    familyText: familyText,
    mount: mount
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root.document) mount();
})(typeof window !== "undefined" ? window : globalThis);
