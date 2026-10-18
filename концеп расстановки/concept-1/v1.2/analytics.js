/* Аналитика Style of Mind
   Идентификаторы перенесены из предыдущей версии проекта — перед запуском
   проверьте в кабинетах, что счётчики по-прежнему принадлежат этому сайту.
   Яндекс Метрика и GA4 загружаются ТОЛЬКО после согласия на аналитику.
   Для прочих тегов можно настроить GTM; не запускайте прямой GA4 одновременно
   с GA4 через GTM, иначе возможны дубли событий.
*/
(() => {
  'use strict';

  const CONFIG = Object.freeze({
    yandexMetrikaId: '113093974',
    googleAnalyticsId: 'G-L3K3HMRF2Z',
    googleTagManagerId: '', // Заполнять, если используете GTM; см. комментарий выше.
    consentKey: 'olga_cookie_consent',
    consentLifetimeDays: 180
  });

  const CONSENT_ACCEPTED = 'all';
  const CONSENT_ESSENTIAL = 'essential';
  const CONSENT_EVENT = 'olgaConsentChanged';
  const CONSENT_LIFETIME_MS = CONFIG.consentLifetimeDays * 24 * 60 * 60 * 1000;
  let analyticsEnabled = false;
  let yandexLoaded = false;
  let googleLoaded = false;
  let gtmLoaded = false;

  const validConsent = (value) =>
    value === CONSENT_ACCEPTED || value === CONSENT_ESSENTIAL ? value : null;

  function readConsent() {
    let storageValue = null;
    let cookieValue = null;

    try {
      const rawValue = localStorage.getItem(CONFIG.consentKey);
      const expiresAt = Number(localStorage.getItem(CONFIG.consentKey + '_expires'));
      if (validConsent(rawValue) && expiresAt && Date.now() <= expiresAt) {
        storageValue = rawValue;
      } else if (rawValue !== null) {
        localStorage.removeItem(CONFIG.consentKey);
        localStorage.removeItem(CONFIG.consentKey + '_expires');
      }
    } catch (_) {}

    try {
      const escapedKey = CONFIG.consentKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = document.cookie.match(new RegExp('(?:^|; )' + escapedKey + '=([^;]*)'));
      cookieValue = match ? validConsent(decodeURIComponent(match[1])) : null;
    } catch (_) {}

    // При конфликте хранилищ выбираем более строгий вариант.
    if (storageValue === CONSENT_ESSENTIAL || cookieValue === CONSENT_ESSENTIAL) {
      return CONSENT_ESSENTIAL;
    }
    if (storageValue === CONSENT_ACCEPTED || cookieValue === CONSENT_ACCEPTED) {
      return CONSENT_ACCEPTED;
    }
    return null;
  }

  function saveConsent(value) {
    const expiresAt = Date.now() + CONSENT_LIFETIME_MS;
    try {
      localStorage.setItem(CONFIG.consentKey, value);
      localStorage.setItem(CONFIG.consentKey + '_expires', String(expiresAt));
    } catch (_) {}
    try {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = CONFIG.consentKey + '=' + encodeURIComponent(value) +
        '; Max-Age=' + Math.floor(CONSENT_LIFETIME_MS / 1000) +
        '; Path=/; SameSite=Lax' + secure;
    } catch (_) {}
  }

  function clearAnalyticsCookies() {
    const names = document.cookie.split(';')
      .map((item) => item.split('=')[0].trim())
      .filter((name) => /^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_|_gac_|_ym(?:_|$|\d))/.test(name));
    const paths = new Set(['/']);
    let current = '';
    location.pathname.split('/').filter(Boolean).forEach((part) => {
      current += '/' + part;
      paths.add(current);
      paths.add(current + '/');
    });
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    names.forEach((name) => paths.forEach((path) => {
      document.cookie = name + '=; Max-Age=0; Path=' + path + '; SameSite=Lax' + secure;
      try {
        document.cookie = name + '=; Max-Age=0; Path=' + path +
          '; Domain=' + location.hostname + '; SameSite=Lax' + secure;
      } catch (_) {}
    }));
    try {
      [localStorage, sessionStorage].forEach((storage) => {
        const keys = [];
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i);
          if (key && /^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_|_gac_|_ym(?:_|$|\d))/.test(key)) {
            keys.push(key);
          }
        }
        keys.forEach((key) => storage.removeItem(key));
      });
    } catch (_) {}
  }

  function initGoogleAnalytics() {
    if (googleLoaded || !/^G-[A-Z0-9]+$/.test(CONFIG.googleAnalyticsId)) return;
    googleLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' +
      encodeURIComponent(CONFIG.googleAnalyticsId);
    script.onerror = () => {
      googleLoaded = false;
      console.warn('[analytics] Не удалось загрузить Google Analytics.');
    };
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', CONFIG.googleAnalyticsId);
  }

  function initGoogleTagManager() {
    if (gtmLoaded || !/^GTM-[A-Z0-9]+$/.test(CONFIG.googleTagManagerId)) return;
    gtmLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' +
      encodeURIComponent(CONFIG.googleTagManagerId);
    script.onerror = () => {
      gtmLoaded = false;
      console.warn('[analytics] Не удалось загрузить Google Tag Manager.');
    };
    document.head.appendChild(script);
  }

  function initYandexMetrika() {
    if (yandexLoaded || !/^\d+$/.test(CONFIG.yandexMetrikaId)) return;
    yandexLoaded = true;
    window['disableYaCounter' + CONFIG.yandexMetrikaId] = false;
    window.ym = window.ym || function () {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = window.ym.l || Date.now();

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js?id=' +
      encodeURIComponent(CONFIG.yandexMetrikaId);
    script.onerror = () => {
      yandexLoaded = false;
      window['disableYaCounter' + CONFIG.yandexMetrikaId] = true;
      console.warn('[analytics] Не удалось загрузить Яндекс Метрику.');
    };
    document.head.appendChild(script);

    window.ym(CONFIG.yandexMetrikaId, 'init', {
      ssr: true,
      webvisor: false,
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true
    });
  }

  function trackEvent(name, params = {}) {
    if (!analyticsEnabled || !/^[a-zA-Z0-9_]{1,40}$/.test(name)) return;
    try {
      if (CONFIG.yandexMetrikaId && typeof window.ym === 'function') {
        window.ym(CONFIG.yandexMetrikaId, 'reachGoal', name, params);
      }
    } catch (_) {}
    try {
      if (CONFIG.googleAnalyticsId && typeof window.gtag === 'function') {
        window.gtag('event', name, Object.assign({ send_to: CONFIG.googleAnalyticsId }, params));
      }
    } catch (_) {}
    try {
      if (CONFIG.googleTagManagerId && Array.isArray(window.dataLayer)) {
        window.dataLayer.push(Object.assign({ event: name }, params));
      }
    } catch (_) {}
  }

  function bindTrackedEvents() {
    if (document.documentElement.dataset.analyticsEventsBound === 'true') return;
    document.documentElement.dataset.analyticsEventsBound = 'true';
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const bookingLink = target.closest('a[href*="dikidi.ru"]');
      if (bookingLink) {
        trackEvent('booking_click', {
          location: bookingLink.closest('section')?.id || 'unknown'
        });
        return;
      }

      const telegramLink = target.closest('a[href*="t.me/olgastyleofmind"]');
      if (telegramLink) {
        trackEvent('telegram_click', {
          location: telegramLink.closest('section, footer')?.id || 'unknown'
        });
      }
    }, { passive: true });
  }

  function showConsentBanner() {
    if (document.getElementById('analyticsConsentBanner')) return;
    const banner = document.createElement('section');
    banner.id = 'analyticsConsentBanner';
    banner.className = 'analytics-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Настройки аналитических cookies');
    banner.setAttribute('aria-describedby', 'analyticsConsentText');
    banner.innerHTML = `
      <div class="analytics-consent__copy">
        <p id="analyticsConsentText"><strong>Настройки cookies</strong> Аналитика помогает понять, как используют сайт. Яндекс Метрика и Google Analytics запускаются только после вашего согласия. Подробности — в <a href="legal.html#privacy">политике</a> и <a href="legal.html#consent">согласии</a>.</p>
      </div>
      <div class="analytics-consent__actions">
        <button class="analytics-consent__button analytics-consent__button--essential" type="button" data-consent="essential">Только необходимые</button>
        <button class="analytics-consent__button analytics-consent__button--accept" type="button" data-consent="all">Разрешить аналитику</button>
      </div>`;
    document.body.appendChild(banner);
    banner.querySelectorAll('[data-consent]').forEach((button) => {
      button.addEventListener('click', () => {
        setConsent(button.getAttribute('data-consent'));
      });
    });
  }

  function hideConsentBanner() {
    const banner = document.getElementById('analyticsConsentBanner');
    if (banner) banner.remove();
  }

  function setConsent(value) {
    const next = validConsent(value);
    if (!next) return;
    const previous = readConsent();
    saveConsent(next);
    hideConsentBanner();
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, {
      detail: { consent: next, previous }
    }));
  }

  function applyConsent(current = readConsent(), previous = null) {
    const allowed = current === CONSENT_ACCEPTED;
    if (!allowed) {
      const wasEnabled = analyticsEnabled || previous === CONSENT_ACCEPTED;
      analyticsEnabled = false;
      if (CONFIG.yandexMetrikaId) {
        window['disableYaCounter' + CONFIG.yandexMetrikaId] = true;
      }
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied'
        });
      }
      clearAnalyticsCookies();
      if (wasEnabled) {
        window.location.reload();
        return;
      }
      return;
    }

    if (analyticsEnabled) return;
    analyticsEnabled = true;
    initYandexMetrika();
    initGoogleAnalytics();
    // If Google Analytics is set directly, GTM stays disabled to avoid duplicate
    // page views. To use GA4 through GTM, clear googleAnalyticsId first.
    if (!CONFIG.googleAnalyticsId) initGoogleTagManager();
    bindTrackedEvents();
    trackEvent('analytics_ready');
  }

  function addSettingsControl() {
    const legalRow = document.querySelector('.footer-legal-links');
    if (!legalRow || legalRow.querySelector('#analyticsSettingsTrigger')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'analyticsSettingsTrigger';
    button.className = 'footer-analytics-settings';
    button.textContent = 'Cookies';
    button.setAttribute('aria-label', 'Открыть настройки cookies');
    button.title = 'Настройки cookies';
    button.addEventListener('click', () => {
      showConsentBanner();
      const reject = document.querySelector('[data-consent="essential"]');
      if (reject) reject.focus({ preventScroll: true });
    });
    legalRow.appendChild(button);
  }

  function start() {
    addSettingsControl();
    const choice = readConsent();
    if (!choice) showConsentBanner();
    applyConsent(choice);
  }

  window.trackEvent = trackEvent;
  window.olgaAnalytics = {
    config: CONFIG,
    getConsent: readConsent,
    setConsent,
    trackEvent
  };
  window.addEventListener(CONSENT_EVENT, (event) => {
    applyConsent(event.detail?.consent, event.detail?.previous);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
