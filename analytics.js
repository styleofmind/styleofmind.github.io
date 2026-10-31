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

  function limitYandexLinkTracking() {
    document.querySelectorAll("a[href]").forEach(anchor => {
      if (!isTelegramLink(anchor)) {
        anchor.classList.add("ym-disable-tracklink");
      }
    });
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
    window.gtag("config", googleId);

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
    limitYandexLinkTracking();

    window.ym = window.ym || function () {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = window.ym.l || Date.now();
    window.ym(yandexId, "init", {
      clickmap: false,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: false
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    document.head.appendChild(script);
  }

  function enableAnalytics() {
    if (!analyticsEnabled) return;
    initializeGoogleAnalytics();
    initializeYandexMetrika();
  }

  document.addEventListener("click", event => {
    if (!analyticsEnabled) return;
    const anchor = event.target.closest && event.target.closest("a[href]");
    if (!anchor || !isTelegramLink(anchor)) return;

    const eventName = anchor.hasAttribute("data-telegram-message")
      ? "booking_click"
      : "telegram_click";
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, {
        link_type: eventName === "booking_click" ? "booking" : "channel"
      });
    }
  }, true);

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
