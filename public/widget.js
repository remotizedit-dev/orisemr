(function () {
  "use strict";

  // Find the script tag to extract tenant slug
  var scriptTag =
    document.currentScript ||
    document.querySelector("script[data-tenant]");

  var tenantSlug = scriptTag ? scriptTag.getAttribute("data-tenant") : null;
  if (!tenantSlug) return;

  var scriptSrc = scriptTag.getAttribute("src") || "";
  var baseUrl = "";
  if (scriptSrc.indexOf("http") === 0) {
    var urlObj = new URL(scriptSrc);
    baseUrl = urlObj.origin;
  } else {
    baseUrl = window.location.origin;
  }

  function openBookingModal() {
    // On small screens (< 640px), open in new tab
    if (window.innerWidth < 640) {
      window.open(baseUrl + "/book/" + tenantSlug, "_blank", "noopener");
      return;
    }

    // Check if modal already open
    if (document.getElementById("orisemr-modal-container")) return;

    var overlay = document.createElement("div");
    overlay.id = "orisemr-modal-container";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.55)";
    overlay.style.backdropFilter = "blur(4px)";
    overlay.style.zIndex = "999999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "20px";
    overlay.style.boxSizing = "border-box";

    var frameWrapper = document.createElement("div");
    frameWrapper.style.position = "relative";
    frameWrapper.style.width = "100%";
    frameWrapper.style.maxWidth = "680px";
    frameWrapper.style.height = "85vh";
    frameWrapper.style.maxHeight = "780px";
    frameWrapper.style.backgroundColor = "#ffffff";
    frameWrapper.style.borderRadius = "16px";
    frameWrapper.style.overflow = "hidden";
    frameWrapper.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";

    var closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "12px";
    closeBtn.style.right = "12px";
    closeBtn.style.width = "32px";
    closeBtn.style.height = "32px";
    closeBtn.style.borderRadius = "50%";
    closeBtn.style.border = "none";
    closeBtn.style.backgroundColor = "#f4f4f5";
    closeBtn.style.fontSize = "20px";
    closeBtn.style.lineHeight = "1";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.zIndex = "10";
    closeBtn.onclick = closeModal;

    var iframe = document.createElement("iframe");
    iframe.src = baseUrl + "/book/" + tenantSlug + "?embed=1";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    frameWrapper.appendChild(closeBtn);
    frameWrapper.appendChild(iframe);
    overlay.appendChild(frameWrapper);

    overlay.onclick = function (e) {
      if (e.target === overlay) {
        closeModal();
      }
    };

    document.body.appendChild(overlay);

    function closeModal() {
      var el = document.getElementById("orisemr-modal-container");
      if (el) el.remove();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("message", handleMessage);
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        closeModal();
      }
    }

    function handleMessage(e) {
      if (e.data && e.data.type === "oris:close") {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("message", handleMessage);
  }

  // Attach click listener to [data-orisemr-book]
  document.addEventListener("click", function (e) {
    var target = e.target;
    while (target && target !== document) {
      if (target.hasAttribute && target.hasAttribute("data-orisemr-book")) {
        e.preventDefault();
        openBookingModal();
        return;
      }
      target = target.parentNode;
    }
  });
})();
