(function () {
  const guard = "__styleOfMindAnalyticsInitialized";
  if (window[guard]) return;
  window[guard] = true;

  const settings = window.SITE_ANALYTICS || {};
  const yandexId = settings.yandexMetrikaId || "";
  const storageKey = "styleOfMindAnalyticsConsent_v1";
  const consentLifetime = 180 * 24 * 60 * 60 * 1000;
  const notice = document.getElementById("analyticsConsent");
  const fullButton = document.getElementById("analyticsConsentFull");
  const basicButton = document.getElementById("analyticsConsentBasic");
  const closeButton = document.getElementById("analyticsConsentClose");
  const settingsButton = document.getElementById("analyticsSettingsOpen");
  const hasAnalytics = Boolean(yandexId);

  // These names must match JavaScript goals created in Yandex Metrika.
  const yandexGoalEvents = new Set([
    "booking_cta_click",
    "booking_menu_open",
    "booking_channel_max",
    "booking_channel_telegram",
    "booking_channel_whatsapp",
    "contact_menu_open",
    "contact_channel_max",
    "contact_channel_telegram",
    "contact_channel_whatsapp",
    "telegram_blog_click",
    "contact_email_click",
    "contact_phone_click",
    "site_engaged_60s",
    "scroll_depth_50",
    "scroll_depth_75",
    "scroll_depth_90",
    "section_navigation",
    "video_play",
    "video_complete",
    "diagnostic_offer_view"
  ]);

  let consent = readConsent();
  let analyticsLevel = consent || "basic";
  let analyticsEnabled = analyticsLevel === "behavior" || analyticsLevel === "full";
  let yandexInitialized = false;
  let behaviorTrackingInitialized = false;

  function readConsent() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (!saved || !["granted", "denied", "basic", "behavior", "full", "off"].includes(saved.value)) return null;
      if (!saved.expiresAt || saved.expiresAt <= Date.now()) {
        window.localStorage.removeItem(storageKey);
        return null;
      }
      if (saved.value === "granted") return "full";
      if (saved.value === "denied") return "off";
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

  function parseUrl(anchor) {
    try {
      return new URL(anchor.href, window.location.href);
    } catch (_) {
      return null;
    }
  }

  function cleanUtmParameters() {
    const url = new URL(window.location.href);
    let changed = false;
    Array.from(url.searchParams.keys()).forEach(key => {
      if (key.toLowerCase().startsWith("utm_")) {
        url.searchParams.delete(key);
        changed = true;
      }
    });
    if (!changed) return;

    const cleanUrl = url.pathname + url.search + url.hash;
    window.history.replaceState(window.history.state, document.title, cleanUrl);
  }

  function isTelegramLink(anchor) {
    const url = parseUrl(anchor);
    return Boolean(url && (
      url.protocol === "tg:" ||
      url.hostname === "t.me" ||
      url.hostname === "telegram.me"
    ));
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

  function initializeYandexMetrika() {
    if (!yandexId || yandexInitialized) return;
    yandexInitialized = true;
    const fullAnalyticsEnabled = analyticsLevel === "full";

    // Do not let automatic link tracking collect Telegram URLs with prepared messages.
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
      clickmap: fullAnalyticsEnabled,
      trackLinks: fullAnalyticsEnabled,
      accurateTrackBounce: fullAnalyticsEnabled,
      webvisor: fullAnalyticsEnabled,
      trackHash: false,
      sendTitle: true,
      triggerEvent: true
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    document.head.appendChild(script);

    // Wait until the counter is initialized and has processed the landing URL.
    window.ym(yandexId, "getClientID", function () {
      cleanUtmParameters();
    });
  }

  function getPlacement(element) {
    if (element.closest("#diagnosticOfferPopup")) return "diagnostic_popup";
    if (element.closest("#contactMenu")) return "floating_contact";
    if (element.closest(".mobile-menu")) return "mobile_menu";
    if (element.closest(".site-header")) return "header";
    if (element.closest(".site-footer")) return "footer";
    const section = element.closest("section");
    if (section) return section.id || "content_section";
    return "page";
  }

  function getContactChannel(anchor, url) {
    const channel = anchor.dataset.contactChannel;
    if (channel === "max" || channel === "telegram" || channel === "whatsapp") {
      return channel;
    }

    const contactGroup = anchor.closest('.mobile-menu__group[aria-label="Связаться со мной"]');
    if (!contactGroup || !url) return "";

    if (url.hostname === "max.ru") return "max";
    if (url.hostname === "wa.me" || url.hostname === "api.whatsapp.com") return "whatsapp";
    if (url.hostname === "t.me" || url.hostname === "telegram.me") return "telegram";
    return "";
  }

  function isTelegramBlogLink(anchor) {
    if (anchor.dataset.analyticsEvent === "telegram_blog_click") return true;
    if (anchor.closest('.mobile-menu__group[aria-label="Мои блоги"]')) return true;
    return Boolean(
      anchor.closest(".footer-legal") &&
      /telegram/i.test(anchor.textContent || "")
    );
  }

  function startActiveTimeTracking() {
    let activeMilliseconds = 0;
    let activeStartedAt = document.visibilityState === "visible" ? performance.now() : null;
    let goalSent = false;

    function updateActiveTime(restart) {
      const now = performance.now();
      if (activeStartedAt !== null) {
        activeMilliseconds += now - activeStartedAt;
        activeStartedAt = null;
      }

      if (!goalSent && activeMilliseconds >= 60000) {
        goalSent = true;
        recordEvent("site_engaged_60s", {
          active_seconds: 60,
          engagement_type: "foreground_time"
        });
      }

      if (restart && document.visibilityState === "visible" && !goalSent) {
        activeStartedAt = now;
      }
    }

    document.addEventListener("visibilitychange", () => {
      updateActiveTime(true);
    });

    window.setInterval(() => {
      if (document.visibilityState === "visible") {
        updateActiveTime(true);
      }
    }, 1000);

    window.addEventListener("pagehide", () => {
      updateActiveTime(false);
    }, { once: true });
  }

  function startBehaviorTracking() {
    if (behaviorTrackingInitialized) return;
    behaviorTrackingInitialized = true;

    const contactMenu = document.getElementById("contactMenu");
    if (contactMenu) {
      contactMenu.addEventListener("toggle", () => {
        if (contactMenu.open) {
          recordEvent("contact_menu_open", { placement: "floating_contact" });
        }
      });
    }

    document.addEventListener("click", event => {
      if (!analyticsEnabled || !event.target || !event.target.closest) return;
      const target = event.target.closest("a[href], button, [role='button'], summary");
      if (!target) return;

      const placement = getPlacement(target);

      if (target.hasAttribute("data-booking-menu-trigger")) {
        recordEvent("booking_cta_click", {
          placement,
          cta_id: target.id || "unnamed"
        });
        recordEvent("booking_menu_open", {
          placement,
          cta_id: target.id || "unnamed"
        });
        return;
      }

      if (target.matches("a[data-booking-channel]")) {
        const channel = target.dataset.bookingChannel;
        if (["max", "telegram", "whatsapp"].includes(channel)) {
          recordEvent("booking_channel_" + channel, { placement });
        }
        return;
      }

      if (target.matches("a[href]")) {
        const url = parseUrl(target);
        if (!url) return;

        if (isTelegramBlogLink(target)) {
          recordEvent("telegram_blog_click", { placement });
          return;
        }

        const channel = getContactChannel(target, url);
        if (channel) {
          recordEvent("contact_channel_" + channel, { placement });
          return;
        }

        if (isTelegramLink(target)) {
          recordEvent("telegram_click", { placement });
          return;
        }

        if (url.protocol === "mailto:") {
          recordEvent("contact_email_click", { placement });
          return;
        }
        if (url.protocol === "tel:") {
          recordEvent("contact_phone_click", { placement });
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

    function checkScrollDepth() {
      const root = document.documentElement;
      const maxScroll = root.scrollHeight - window.innerHeight;
      const depth = maxScroll > 0
        ? Math.min(100, Math.round((window.scrollY / maxScroll) * 100))
        : 100;

      scrollThresholds.forEach(threshold => {
        if (depth < threshold || sentScrollThresholds.has(threshold)) return;
        sentScrollThresholds.add(threshold);
        const eventName = "scroll_depth_" + threshold;
        recordEvent(eventName, { depth_percent: threshold });
      });
    }

    let scrollFramePending = false;
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
      recordEvent("video_play", { video_id: "hero_video" });
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

    startActiveTimeTracking();
  }

  function enableAnalytics() {
    initializeYandexMetrika();
    if (analyticsEnabled) startBehaviorTracking();
  }

  function chooseAnalyticsLevel(level) {
    saveConsent(level);
    consent = level;
    analyticsLevel = level;
    analyticsEnabled = level === "behavior" || level === "full";
    window.location.reload();
  }

  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      setNoticeVisibility(true);
      if (basicButton) basicButton.focus();
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", () => chooseAnalyticsLevel("off"));
  }

  if (basicButton) {
    basicButton.addEventListener("click", () => chooseAnalyticsLevel("basic"));
  }


  if (fullButton) {
    fullButton.addEventListener("click", () => chooseAnalyticsLevel("full"));
  }

  if (!hasAnalytics) return;
  if (analyticsLevel !== "off") enableAnalytics();
  else cleanUtmParameters();
  setNoticeVisibility(consent === null);
})();
