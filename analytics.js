(function () {
  const guard = "__styleOfMindAnalyticsInitialized";
  if (window[guard]) return;
  window[guard] = true;

  const settings = window.SITE_ANALYTICS || {};
  const googleId = settings.googleAnalyticsId || "";
  const yandexId = settings.yandexMetrikaId || "";
  const storageKey = "styleOfMindAnalyticsConsent_v1";
  const consentLifetime = 180 * 24 * 60 * 60 * 1000;
  const notice = document.getElementById("analyticsConsent");
  const acceptButton = document.getElementById("analyticsConsentAccept");
  const rejectButton = document.getElementById("analyticsConsentReject");
  const settingsButton = document.getElementById("analyticsSettingsOpen");
  const hasAnalytics = Boolean(googleId || yandexId);
  const yandexGoalEvents = new Set([
    "booking_click",
    "telegram_click",
    "video_open",
    "video_complete",
    "diagnostic_offer_view",
    "section_navigation"
  ]);
  const deniedConsent = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };
  const grantedConsent = {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };

  let consent = readConsent();
  let analyticsEnabled = consent === "granted";
  let googleInitialized = false;
  let yandexInitialized = false;
  let behaviorTrackingInitialized = false;

  if (yandexId) {
    window["disableYaCounter" + yandexId] = !analyticsEnabled;
  }

  function readConsent() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (!saved || !["granted", "denied"].includes(saved.value)) return null;
      if (!saved.expiresAt || saved.expiresAt <= Date.now()) {
        window.localStorage.removeItem(storageKey);
        return null;
      }
      return saved.value;
    } catch (_) {
      return null;
    }
  }

  function saveConsent(value) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        value,
        expiresAt: Date.now() + consentLifetime
      }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function setNoticeVisibility(visible) {
    if (notice) notice.hidden = !visible;
  }

  function isTelegramLink(anchor) {
    try {
      const url = new URL(anchor.href, window.location.href);
      return url.protocol === "tg:" ||
        url.hostname === "t.me" ||
        url.hostname === "telegram.me";
    } catch (_) {
      return false;
    }
  }

  function cleanEventParams(params) {
    const clean = {};
    Object.entries(params || {}).forEach(([key, value]) => {
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) return;
      if (/(email|phone|message|text|query|href|url|value|name)/i.test(key)) return;
      if (typeof value === "string" && value.length <= 80) {
        clean[key] = value;
      } else if (typeof value === "number" && Number.isFinite(value)) {
        clean[key] = value;
      } else if (typeof value === "boolean") {
        clean[key] = value;
      }
    });
    return clean;
  }

  function recordEvent(eventName, params) {
    if (!analyticsEnabled) return;
    const safeParams = cleanEventParams(params);

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, safeParams);
    }

    if (yandexId && typeof window.ym === "function") {
      window.ym(yandexId, "params", {
        site_analytics: {
          event_type: eventName,
          ...safeParams
        }
      });
      if (yandexGoalEvents.has(eventName)) {
        window.ym(yandexId, "reachGoal", eventName, safeParams);
      }
    }
  }

  function initializeGoogleAnalytics() {
    if (!googleId || googleInitialized) return;
    googleInitialized = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("consent", "default", deniedConsent);
    window.gtag("consent", "update", grantedConsent);
    window.gtag("js", new Date());
    window.gtag("config", googleId, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(googleId);
    document.head.appendChild(script);
  }

  function initializeYandexMetrika() {
    if (!yandexId || yandexInitialized) return;
    yandexInitialized = true;
    window["disableYaCounter" + yandexId] = false;

    // Telegram URLs contain a prefilled message. Track the CTA with our own goal,
    // but do not send the full destination URL to Metrika link tracking.
    document.querySelectorAll("a[href]").forEach(anchor => {
      if (isTelegramLink(anchor)) {
        anchor.classList.add("ym-disable-tracklink");
      }
    });

    window.ym = window.ym || function () {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = window.ym.l || Date.now();
    window.ym(yandexId, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
      trackHash: false,
      sendTitle: true,
      triggerEvent: true
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    document.head.appendChild(script);
  }

  function getPlacement(element) {
    if (element.closest("#diagnosticOfferPopup")) return "diagnostic_popup";
    if (element.closest(".site-header")) return "header";
    if (element.closest(".site-footer")) return "footer";
    const section = element.closest("section");
    if (section) return section.id || "content_section";
    return "page";
  }

  function startBehaviorTracking() {
    if (behaviorTrackingInitialized) return;
    behaviorTrackingInitialized = true;

    document.addEventListener("click", event => {
      if (!analyticsEnabled || !event.target || !event.target.closest) return;
      const target = event.target.closest("a[href], button, [role='button'], summary");
      if (!target) return;

      const placement = getPlacement(target);
      if (target.matches("a[href]")) {
        let url;
        try {
          url = new URL(target.href, window.location.href);
        } catch (_) {
          return;
        }

        if (isTelegramLink(target)) {
          recordEvent(
            target.hasAttribute("data-telegram-message") ? "booking_click" : "telegram_click",
            { placement }
          );
          return;
        }

        if (url.protocol === "mailto:" || url.protocol === "tel:") {
          recordEvent("contact_link_click", {
            placement,
            contact_type: url.protocol.slice(0, -1)
          });
          return;
        }

        if (target.hasAttribute("download") || /\.(pdf|docx?|xlsx?|zip)$/i.test(url.pathname)) {
          const extension = url.pathname.split(".").pop().toLowerCase();
          recordEvent("file_download", {
            placement,
            file_type: extension.slice(0, 8)
          });
          return;
        }

        if (url.origin === window.location.origin && url.hash) {
          recordEvent("section_navigation", {
            placement,
            section_id: url.hash.slice(1, 64)
          });
          return;
        }

        if (url.origin !== window.location.origin) {
          recordEvent("external_link_click", {
            placement,
            link_domain: url.hostname.slice(0, 80)
          });
        }
        return;
      }

      recordEvent("site_element_click", {
        placement,
        element_type: target.tagName.toLowerCase(),
        element_id: target.id || "no_id"
      });
    }, true);

    const sections = Array.from(document.querySelectorAll("main > section"));
    if ("IntersectionObserver" in window) {
      const viewedSections = new WeakSet();
      const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting || viewedSections.has(entry.target)) return;
          viewedSections.add(entry.target);
          const section = entry.target;
          const sectionId = section.id || section.getAttribute("aria-label") || "section";
          recordEvent("section_view", {
            section_id: String(sectionId).slice(0, 64)
          });
        });
      }, { threshold: 0.1 });
      sections.forEach(section => sectionObserver.observe(section));
    }

    const scrollThresholds = [25, 50, 75, 90];
    const sentScrollThresholds = new Set();
    let scrollFramePending = false;
    function checkScrollDepth() {
      const root = document.documentElement;
      const maxScroll = root.scrollHeight - window.innerHeight;
      const depth = maxScroll > 0
        ? Math.min(100, Math.round((window.scrollY / maxScroll) * 100))
        : 100;
      scrollThresholds.forEach(threshold => {
        if (depth < threshold || sentScrollThresholds.has(threshold)) return;
        sentScrollThresholds.add(threshold);
        recordEvent("scroll_depth", { depth_percent: threshold });
      });
    }
    window.addEventListener("scroll", () => {
      if (scrollFramePending) return;
      scrollFramePending = true;
      window.requestAnimationFrame(() => {
        scrollFramePending = false;
        checkScrollDepth();
      });
    }, { passive: true });
    window.addEventListener("resize", checkScrollDepth, { passive: true });
    checkScrollDepth();

    document.addEventListener("styleofmind:video-playing", () => {
      recordEvent("video_open", { video_id: "hero_video" });
    });
    document.addEventListener("styleofmind:video-ended", () => {
      recordEvent("video_complete", { video_id: "hero_video" });
    });
    document.addEventListener("styleofmind:offer-shown", () => {
      recordEvent("diagnostic_offer_view", { placement: "diagnostic_popup" });
    });
    document.addEventListener("styleofmind:offer-closed", () => {
      recordEvent("diagnostic_offer_close", { placement: "diagnostic_popup" });
    });

    const offerPopup = document.getElementById("diagnosticOfferPopup");
    if (offerPopup && !offerPopup.hidden) {
      recordEvent("diagnostic_offer_view", { placement: "diagnostic_popup" });
    }
  }

  function enableAnalytics() {
    if (!analyticsEnabled) return;
    initializeGoogleAnalytics();
    initializeYandexMetrika();
    startBehaviorTracking();
  }

  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      setNoticeVisibility(true);
      if (rejectButton) rejectButton.focus();
    });
  }

  if (acceptButton) {
    acceptButton.addEventListener("click", () => {
      saveConsent("granted");
      consent = "granted";
      analyticsEnabled = true;
      setNoticeVisibility(false);
      enableAnalytics();
      recordEvent("analytics_consent_granted", { consent_method: "banner" });
    });
  }

  if (rejectButton) {
    rejectButton.addEventListener("click", () => {
      const wasEnabled = analyticsEnabled;
      saveConsent("denied");
      consent = "denied";
      analyticsEnabled = false;
      setNoticeVisibility(false);

      if (typeof window.gtag === "function") {
        window.gtag("consent", "update", deniedConsent);
      }
      if (yandexId) {
        window["disableYaCounter" + yandexId] = true;
      }
      if (wasEnabled) {
        window.location.reload();
      }
    });
  }

  if (!hasAnalytics) return;
  if (analyticsEnabled) {
    enableAnalytics();
  } else {
    setNoticeVisibility(consent === null);
  }
})();
