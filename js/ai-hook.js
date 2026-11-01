(function () {
  "use strict";

  var root = document.getElementById("ai-sign-language");
  var ns = (window.AccessibleHospitalCare = window.AccessibleHospitalCare || {});

  /* Future phase mounts a sign-language runtime here. Do not load a model in this prototype. */
  ns.aiSignLanguage = {
    id: "ai-sign-language",
    status: "coming-soon",
    label: "即将推出",
    slots: ["register", "triage", "exam", "admit", "ward"],
    mount: function () {
      return root;
    }
  };
})();
