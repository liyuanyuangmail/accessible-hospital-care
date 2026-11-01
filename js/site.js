(function () {
  "use strict";

  var key = "ahc-font";
  var allowed = { md: true, lg: true, xl: true };

  function apply(size) {
    if (!allowed[size]) size = "md";
    if (size === "md") document.documentElement.removeAttribute("data-font");
    else document.documentElement.setAttribute("data-font", size);
    try {
      localStorage.setItem(key, size);
    } catch (err) {
      /* Private mode or blocked storage: the choice still applies this visit. */
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-font-size]"), function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-font-size") === size ? "true" : "false");
    });
  }

  var saved = "md";
  try {
    var stored = localStorage.getItem(key);
    if (allowed[stored]) saved = stored;
  } catch (err) {
    saved = "md";
  }
  apply(saved);

  Array.prototype.forEach.call(document.querySelectorAll("[data-font-size]"), function (btn) {
    btn.addEventListener("click", function () {
      apply(btn.getAttribute("data-font-size"));
    });
  });
})();
