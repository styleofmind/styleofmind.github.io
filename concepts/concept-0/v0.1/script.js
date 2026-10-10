window.YM_COUNTER_ID = 113093974;

document.addEventListener('DOMContentLoaded', function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cookieConsent = document.getElementById('cookieConsent');
  const cookieAccept = document.getElementById('cookieAccept');
  const cookieReject = document.getElementById('cookieReject');
  const cookieSettingsTrigger = document.getElementById('cookieSettingsTrigger');
  const COOKIE_KEY = 'olga_cookie_consent';
  const COOKIE_EXPIRY_KEY = COOKIE_KEY + '_expires';
  const CONSENT_TTL_MS = 180 * 24 * 60 * 60 * 1000;

  const validConsent = function(value){
    return value === 'all' || value === 'essential' ? value : null;
  };
  const getCookie = function(){
    const match = document.cookie.match(/(?:^|; )olga_cookie_consent=([^;]*)/);
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch(e) { return null; }
  };
  const readSavedConsent = function(){
    const cookieValue = validConsent(getCookie());
    let storedValue = null;
    try {
      const rawValue = localStorage.getItem(COOKIE_KEY);
      let expiresAt = Number(localStorage.getItem(COOKIE_EXPIRY_KEY));
      if (validConsent(rawValue)) {
        if (!expiresAt) {
          expiresAt = Date.now() + CONSENT_TTL_MS;
          localStorage.setItem(COOKIE_EXPIRY_KEY, String(expiresAt));
        }
        if (Date.now() <= expiresAt) {
          storedValue = rawValue;
        } else {
          localStorage.removeItem(COOKIE_KEY);
          localStorage.removeItem(COOKIE_EXPIRY_KEY);
        }
      } else if (rawValue !== null) {
        localStorage.removeItem(COOKIE_KEY);
        localStorage.removeItem(COOKIE_EXPIRY_KEY);
      }
    } catch(e) {}

    // Fail closed if the cookie and localStorage contain conflicting choices.
    if (cookieValue === 'essential' || storedValue === 'essential') return 'essential';
    if (cookieValue === 'all' || storedValue === 'all') return 'all';
    return null;
  };
  const saveConsent = function(value){
    try {
      localStorage.setItem(COOKIE_KEY, value);
      localStorage.setItem(COOKIE_EXPIRY_KEY, String(Date.now() + CONSENT_TTL_MS));
    } catch(e) {}
    try {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = COOKIE_KEY + '=' + encodeURIComponent(value) +
        '; max-age=15552000; path=/; SameSite=Lax' + secure;
    } catch(e) {}
  };

  window.cookieConsent = readSavedConsent();
  if (cookieConsent) cookieConsent.hidden = Boolean(window.cookieConsent);

  const openCookieSettings = function(){
    if (!cookieConsent) return;
    cookieConsent.hidden = false;
    cookieReject?.focus();
  };
  cookieSettingsTrigger?.addEventListener('click', openCookieSettings);

  const setConsent = function(value){
    const nextValue = validConsent(value);
    if (!nextValue) return;
    const previousValue = readSavedConsent();
    saveConsent(nextValue);
    window.cookieConsent = nextValue;
    if (cookieConsent) cookieConsent.hidden = true;
    window.dispatchEvent(new CustomEvent('olgaConsentChanged', {
      detail: {consent: nextValue, previous: previousValue}
    }));
    cookieSettingsTrigger?.focus();
  };
  cookieAccept?.addEventListener('click', function(){ setConsent('all'); });
  cookieReject?.addEventListener('click', function(){ setConsent('essential'); });

  const desktopMagic = window.innerWidth >= 768 && !prefersReducedMotion;
  document.documentElement.classList.toggle('desktop-magic', desktopMagic);

  const progress = document.querySelector('.header-progress');
  const updateProgress = function () {
    if (!progress) return;
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    progress.style.transform = 'scaleX(' + Math.min(1, window.scrollY / max) + ')';
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, {passive:true});

  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (scrollTopBtn) {
    const toggleScrollTop = function(){
      const visible = window.scrollY > 300;
      scrollTopBtn.classList.toggle('show', visible);
      scrollTopBtn.setAttribute('aria-hidden', String(!visible));
      scrollTopBtn.tabIndex = visible ? 0 : -1;
    };
    toggleScrollTop();
    window.addEventListener('scroll', toggleScrollTop, {passive:true});
    scrollTopBtn.addEventListener('click', function(){
      window.scrollTo({top:0, behavior:prefersReducedMotion ? 'auto' : 'smooth'});
    });
  }

  if (desktopMagic && window.AOS) {
    AOS.init({duration:760, once:true, offset:90, easing:'ease-out-cubic'});
  }

  if (document.querySelector('.reviews-swiper') && window.Swiper) {
    new Swiper('.reviews-swiper', {
      slidesPerView:1, spaceBetween:16, autoHeight:true,
      navigation:{nextEl:'.swiper-button-next',prevEl:'.swiper-button-prev'},
      pagination:{el:'.swiper-pagination',clickable:true},
      breakpoints:{768:{slidesPerView:2,spaceBetween:24,autoHeight:false},1200:{slidesPerView:2,spaceBetween:28,autoHeight:false}}
    });
  }

  (function(){
    const gallery = document.querySelector('.approach-gallery');
    if (!gallery || !window.Swiper) return;

    const main = gallery.querySelector('.approach-gallery__main');
    const swiperEl = gallery.querySelector('.approach-gallery__swiper');
    const wrapper = gallery.querySelector('.approach-gallery__swiper .swiper-wrapper');
    const thumbs = Array.from(gallery.querySelectorAll('[data-gallery-image]'));
    const prev = gallery.querySelector('.approach-gallery__arrow--prev');
    const next = gallery.querySelector('.approach-gallery__arrow--next');
    if (!main || !swiperEl || !wrapper || !thumbs.length) return;

    // Одна точка управления галереей: Swiper отвечает и за свайп, и за переходы.
    wrapper.innerHTML = '';
    thumbs.forEach(function(thumb){
      const src = thumb.getAttribute('data-gallery-image');
      const label = thumb.getAttribute('data-gallery-label') || '';
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.setAttribute('data-gallery-index', String(thumbs.indexOf(thumb)));

      const link = document.createElement('a');
      link.className = 'glightbox approach-gallery__slide-link';
      link.setAttribute('data-gallery', 'specialist-gallery');
      link.href = src;
      link.setAttribute('aria-label', 'Открыть: ' + label);

      const img = document.createElement('img');
      img.src = src;
      img.alt = label;
      img.draggable = false;
      if (thumbs.indexOf(thumb) > 0) img.loading = 'lazy';

      link.appendChild(img);
      slide.appendChild(link);
      wrapper.appendChild(slide);
    });

    const setThumbState = function(index){
      thumbs.forEach(function(item, i){
        const active = i === index;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      gallery.dataset.currentIndex = String(index);
    };

    const swiper = new Swiper(swiperEl, {
      slidesPerView: 1,
      spaceBetween: 0,
      speed: 420,
      loop: true,
      grabCursor: true,
      resistance: true,
      resistanceRatio: 0.78,
      threshold: 6,
      touchRatio: 1,
      touchAngle: 45,
      watchOverflow: true,
      keyboard: {enabled: true},
      navigation: {
        nextEl: next,
        prevEl: prev
      },
      on: {
        init: function(instance){
          setThumbState(instance.realIndex);
        },
        slideChange: function(instance){
          setThumbState(instance.realIndex);
        }
      }
    });

    thumbs.forEach(function(thumb, index){
      thumb.addEventListener('click', function(){
        swiper.slideToLoop(index);
      });
    });

    gallery.dataset.currentIndex = '0';

    // GLightbox использует те же самые слайды, что и карусель — отдельной логики переходов нет.
    if (window.GLightbox) {
      window.approachLightbox = GLightbox({
        selector: '.approach-gallery .approach-gallery__slide-link',
        touchNavigation: true,
        loop: true,
        zoomable: true,
        openEffect: 'fade',
        closeEffect: 'fade',
        slideEffect: 'fade'
      });
    }
  })();

  // 6. Варианты поз котиков — все 12 вариантов встроены в HTML, без дополнительных сетевых запросов
  // Локальные WebP-позы котиков подключаются по относительным путям.
  const catPoseSources = [
    './assets/cats/cat-01.webp',
    './assets/cats/cat-02.webp',
    './assets/cats/cat-03.webp',
    './assets/cats/cat-04.webp',
    './assets/cats/cat-05.webp',
    './assets/cats/cat-06.webp',
    './assets/cats/cat-07.webp',
    './assets/cats/cat-08.webp',
    './assets/cats/cat-09.webp',
    './assets/cats/cat-10.webp',
    './assets/cats/cat-11.webp',
    './assets/cats/cat-12.webp',
  ];

  function initMagicCat(cat) {
    const images = cat.querySelectorAll('.magic-cat-image');
    if (images.length !== 2 || !catPoseSources.length) return;

    const start = Number(cat.getAttribute('data-cat-start') || 0);
    let poseIndex = ((start % catPoseSources.length) + catPoseSources.length) % catPoseSources.length;
    let active = 0;
    images[0].src = catPoseSources[poseIndex];
    images[1].src = catPoseSources[(poseIndex + 1) % catPoseSources.length];

    function showPose(nextIndex, withMotion) {
      poseIndex = ((nextIndex % catPoseSources.length) + catPoseSources.length) % catPoseSources.length;
      const current = images[active];
      const next = images[1 - active];
      next.src = catPoseSources[poseIndex];
      next.classList.add('is-next');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          next.classList.remove('is-next');
          current.classList.add('is-next');
        });
      });
      active = 1 - active;

      if (withMotion) {
        cat.classList.remove('is-pressed');
        void cat.offsetWidth;
        cat.classList.add('is-pressed');
        clearTimeout(cat._pressTimer);
        cat._pressTimer = setTimeout(function () {
          cat.classList.remove('is-pressed');
        }, 720);
      }
    }

    // Keep the illustration interactive everywhere; only auto-animate when motion is allowed.
    if (!prefersReducedMotion) {
      cat._poseTimer = setInterval(function () {
        if (!document.hidden) showPose(poseIndex + 1, false);
      }, 4200);
    }

    function openEgg() {
      const egg = document.getElementById('catEgg');
      if (!egg) return;
      const message = egg.querySelector('.cat-egg-message');
      const author = egg.querySelector('.cat-egg-author');
      const isMethod = cat.classList.contains('magic-cat--method');
      if (message) message.textContent = cat.getAttribute('data-cat-message') || '';
      if (author) author.textContent = cat.getAttribute('data-cat-author') || '';
      egg.classList.remove('cat-egg--method', 'cat-egg--approach');
      egg.classList.add(isMethod ? 'cat-egg--method' : 'cat-egg--approach');
      egg.hidden = false;
      showPose(poseIndex + 1, true);
      if (window.trackEvent) window.trackEvent(isMethod ? 'cat_method_easter_egg' : 'cat_approach_easter_egg');
      clearTimeout(window.catEggTimer);
      window.catEggTimer = setTimeout(function () { egg.hidden = true; }, 4200);
    }

    cat.style.pointerEvents = 'auto';
    cat.addEventListener('click', openEgg);
    cat.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEgg();
      }
    });
  }

  // Cats are interactive on desktop and mobile, including when reduced motion is enabled.
  document.querySelectorAll('[data-cat-clickable]').forEach(initMagicCat);

  // GSAP-параллакс hero-сфер — мягкий и только desktop
  if (desktopMagic && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to('.hero-orb--green', {
      y: -60, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
    });
    gsap.to('.hero-orb--gold', {
      y: 50, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
    });
    gsap.to('.hero-aura', {
      scale: 1.05, opacity: 0.7, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
    });
  }

  const threads = document.querySelector('.ancestral-threads');
  if (threads) {
    if (desktopMagic && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting){ threads.classList.add('is-visible'); io.disconnect(); }
        });
      }, {threshold:.2});
      io.observe(threads);
    } else if (desktopMagic) {
      threads.classList.add('is-visible');
    }
  }

  (function(){
    const popup = document.getElementById('popup');
    if (!popup) return;
    const closeBtn = popup.querySelector('.popup-close');
    const SHOWN_KEY = 'popup_shown_v3';
    if (sessionStorage.getItem(SHOWN_KEY)) return;
    let shown = false, scrollTimer = null;
    function showPopup(){
      if (shown) return;
      shown = true; popup.hidden = false; sessionStorage.setItem(SHOWN_KEY,'1'); window.trackEvent('open_popup');
    }
    function closePopup(){ popup.hidden = true; window.trackEvent('close_popup'); }
    function maybeShowByScroll(){
      if (shown) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function(){
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const pct = max > 0 ? window.scrollY / max : 0;
        if (pct >= .5) showPopup();
      },100);
    }
    window.addEventListener('scroll', maybeShowByScroll, {passive:true});
    setTimeout(showPopup,45000);
    closeBtn?.addEventListener('click',closePopup);
    document.addEventListener('keydown',function(e){ if(e.key === 'Escape' && !popup.hidden) closePopup(); });
  })();
});


(() => {
  if (!window.PointerEvent) return;
  const carousels = document.querySelectorAll('.process-section .process-figures');
  carousels.forEach((carousel) => {
    const wrap = carousel.closest('.process-figures-wrap');
    const prev = wrap ? wrap.querySelector('.process-gallery-arrow--prev') : null;
    const next = wrap ? wrap.querySelector('.process-gallery-arrow--next') : null;

    const updateArrows = () => {
      if (!prev || !next) return;
      const maxScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
      prev.disabled = carousel.scrollLeft <= 2;
      next.disabled = carousel.scrollLeft >= maxScroll - 2;
    };

    const scrollByStep = (direction) => {
      const step = Math.max(carousel.clientWidth * .72, 290);
      carousel.scrollBy({left: step * direction, behavior: 'smooth'});
    };

    if (prev) prev.addEventListener('click', () => scrollByStep(-1));
    if (next) next.addEventListener('click', () => scrollByStep(1));
    carousel.addEventListener('scroll', updateArrows, {passive:true});
    window.addEventListener('resize', updateArrows);
    requestAnimationFrame(updateArrows);

    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    carousel.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      isDown = true;
      startX = e.clientX;
      startScroll = carousel.scrollLeft;
      carousel.classList.add('is-dragging');
      if (typeof carousel.setPointerCapture === 'function') carousel.setPointerCapture(e.pointerId);
    });

    carousel.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      carousel.scrollLeft = startScroll - (e.clientX - startX);
    });

    const stopDrag = (e) => {
      if (!isDown) return;
      isDown = false;
      carousel.classList.remove('is-dragging');
      try { if (typeof carousel.releasePointerCapture === 'function') carousel.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    carousel.addEventListener('pointerup', stopDrag);
    carousel.addEventListener('pointercancel', stopDrag);
    carousel.addEventListener('mouseleave', stopDrag);

  });
})();
