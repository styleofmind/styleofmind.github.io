/* Consent-gated analytics loader for the static GitHub Pages site.
   Yandex Metrika: configured through window.YM_COUNTER_ID.
   Google Analytics 4: G-L3K3HMRF2Z, loaded only after analytics consent.
   Other GTM-managed tags: GTM-PFM66NP6.
   No analytics vendor script is requested until analytical consent is granted.
*/
(() => {
  'use strict';

  const CONSENT_KEY = 'olga_cookie_consent';
  const CONSENT_TTL_MS = 180 * 24 * 60 * 60 * 1000;
  const GTM_ID = 'GTM-PFM66NP6';
  const GA4_ID = 'G-L3K3HMRF2Z';
  const YM_ID = window.YM_COUNTER_ID;
  let analyticsAllowed = false;
  let gtmRequested = false;
  let gaRequested = false;
  let ymRequested = false;
  let eventsBound = false;
  let googleConsentInitialized = false;

  const validConsent = (value) =>
    value === 'all' || value === 'essential' ? value : null;

  const readConsent = () => {
    let localValue = null;
    let cookieValue = null;
    try {
      const rawValue = localStorage.getItem(CONSENT_KEY);
      let expiresAt = Number(localStorage.getItem(CONSENT_KEY + '_expires'));
      if (validConsent(rawValue)) {
        // Migrate a legacy stored choice once, then enforce a finite lifetime.
        if (!expiresAt) {
          expiresAt = Date.now() + CONSENT_TTL_MS;
          localStorage.setItem(CONSENT_KEY + '_expires', String(expiresAt));
        }
        if (Date.now() <= expiresAt) {
          localValue = rawValue;
        } else {
          localStorage.removeItem(CONSENT_KEY);
          localStorage.removeItem(CONSENT_KEY + '_expires');
        }
      } else if (rawValue !== null) {
        localStorage.removeItem(CONSENT_KEY);
        localStorage.removeItem(CONSENT_KEY + '_expires');
      }
    } catch (_) {}
    try {
      const match = document.cookie.match(/(?:^|; )olga_cookie_consent=([^;]*)/);
      cookieValue = match ? validConsent(decodeURIComponent(match[1])) : null;
    } catch (_) {}

    // A conflicting or partially-written choice is resolved toward no analytics.
    if (localValue === 'essential' || cookieValue === 'essential') return 'essential';
    if (localValue === 'all' || cookieValue === 'all') return 'all';
    return null;
  };
  const setYandexOptOut = (disabled) => {
    if (YM_ID) {
      window['disableYaCounter' + YM_ID] = Boolean(disabled);
    }
  };

  // Remove first-party identifiers left by a previous analytics session.
  // This is best-effort: browser privacy controls and non-first-party storage
  // cannot be cleared by page JavaScript.
  const clearAnalyticsData = () => {
    const names = new Set([
      '_ga', '_gid', '_gat', '_ym_uid', '_ym_d', '_ym_isad',
      '_ym_metrika_enabled', '_ym_ucs', '_ym_fa'
    ]);
    try {
      document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0].trim();
        if (/^(?:_(?:ga(?:_|$)|gid$|gat(?:_|$)|gcl_|gac_|ym(?:_|$|\d))|ytm_(?:tf|tag)_|zz$)/.test(name)) {
          names.add(name);
        }
      });
    } catch (_) {}

    const pathnames = new Set(['/']);
    let currentPath = '';
    location.pathname.split('/').filter(Boolean).forEach((part) => {
      currentPath += '/' + part;
      pathnames.add(currentPath);
      pathnames.add(currentPath + '/');
    });
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    names.forEach((name) => {
      pathnames.forEach((path) => {
        const expired = name + '=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=' + path + '; SameSite=Lax' + secure;
        try { document.cookie = expired; } catch (_) {}
        try { document.cookie = expired + '; Domain=' + location.hostname; } catch (_) {}
      });
    });

    const clearStorage = (storage) => {
      try {
        const keys = [];
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i);
          if (key && /^(?:_(?:ga(?:_|$)|gid$|gat(?:_|$)|gcl_|gac_|ym(?:_|$|\d))|ytm_(?:tf|tag)_|zz$)/.test(key)) {
            keys.push(key);
          }
        }
        keys.forEach((key) => storage.removeItem(key));
      } catch (_) {}
    };
    clearStorage(window.localStorage);
    clearStorage(window.sessionStorage);
  };

  const updateGoogleConsent = (granted) => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    if (!googleConsentInitialized) {
      window.gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied'
      });
      googleConsentInitialized = true;
    }

    window.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: granted ? 'granted' : 'denied'
    });
  };

  const initGoogleAnalytics = () => {
    if (gaRequested || !GA4_ID) return;
    gaRequested = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    script.onerror = () => {
      gaRequested = false;
      console.warn('[analytics] Google Analytics failed to load');
    };
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
  };

  const loadGtm = () => {
    if (gtmRequested || !GTM_ID) return;
    gtmRequested = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID);
    script.onerror = () => {
      gtmRequested = false;
      console.warn('[analytics] Google Tag Manager failed to load');
    };
    document.head.appendChild(script);
  };

  const initYandex = () => {
    if (!YM_ID || ymRequested) return;
    ymRequested = true;
    setYandexOptOut(false);

    window.ym = window.ym || function () {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = window.ym.l || Date.now();

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + encodeURIComponent(YM_ID);
    script.onerror = () => {
      ymRequested = false;
      setYandexOptOut(true);
      console.warn('[analytics] Yandex Metrika failed to load');
    };
    document.head.appendChild(script);

    window.ym(YM_ID, 'init', {
      ssr: true,
      webvisor: false,
      clickmap: true,
      ecommerce: 'dataLayer',
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true
    });
    window.ym.__olgaInitialized = true;
  };

  const track = (name, params = {}) => {
    if (!analyticsAllowed) return;
    try {
      if (typeof window.ym === 'function' && YM_ID) {
        window.ym(YM_ID, 'reachGoal', name, params);
      }
    } catch (_) {}
    try {
      if (GA4_ID && typeof window.gtag === 'function') {
        window.gtag('event', name, Object.assign({ send_to: GA4_ID }, params));
      }
    } catch (_) {}
  };

  const bindEvents = () => {
    if (eventsBound) return;
    eventsBound = true;
    document.addEventListener('click', (event) => {
      const target = event.target;
      const bookingLink = target && target.closest ? target.closest('a[data-booking]') : null;
      if (bookingLink) {
        track('booking_click', {
          location: bookingLink.closest('section')?.id || 'unknown'
        });
      }

      const telegramLink = target && target.closest
        ? target.closest('a[href*="t.me/olgastyleofmind"]')
        : null;
      if (telegramLink) {
        track('telegram_click', {
          location: telegramLink.closest('section,footer')?.id || 'unknown'
        });
      }
    }, { passive: true });
  };

  const applyConsent = () => {
    const granted = readConsent() === 'all';
    if (!granted) {
      const wasAllowed = analyticsAllowed;
      analyticsAllowed = false;
      setYandexOptOut(true);
      if (googleConsentInitialized) updateGoogleConsent(false);
      clearAnalyticsData();
      // A reload tears down already-executed vendor code after a withdrawal.
      if (wasAllowed) window.location.reload();
      return;
    }

    if (analyticsAllowed) return;
    analyticsAllowed = true;
    setYandexOptOut(false);
    updateGoogleConsent(true);
    initYandex();
    initGoogleAnalytics();
    loadGtm();
    bindEvents();
    track('analytics_ready');
  };

  // Keep the Yandex counter disabled before any possible initialization.
  setYandexOptOut(true);
  window.trackEvent = track;
  window.addEventListener('olgaConsentChanged', applyConsent);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyConsent, { once: true });
  } else {
    applyConsent();
  }
})();
