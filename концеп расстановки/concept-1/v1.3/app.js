/* Поведение страницы «Расставить точки над МЫ». */

/* Всплывающее предложение диагностики */
(() => {
      const popup = document.getElementById('diagnosticOfferPopup');
      if (!popup) return;
      const closeButton = popup.querySelector('.offer-popup__close');
      const storageKey = 'styleOfMindDiagnosticOfferShown_v1';
      let shown = false;
      try {
        if (sessionStorage.getItem(storageKey)) return;
      } catch (_) {}
      const show = () => {
        if (shown) return;
        shown = true;
        popup.hidden = false;
        try { sessionStorage.setItem(storageKey, '1'); } catch (_) {}
      };
      const close = () => { popup.hidden = true; };
      let scrollTimer;
      window.addEventListener('scroll', () => {
        if (shown) return;
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(() => {
          const doc = document.documentElement;
          const maxScroll = doc.scrollHeight - window.innerHeight;
          if (maxScroll > 0 && window.scrollY / maxScroll >= 0.5) show();
        }, 120);
      }, { passive: true });
      window.setTimeout(show, 45000);
      closeButton.addEventListener('click', close);
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !popup.hidden) close();
      });
    })();

/* Галерея фотографий процесса */
(() => {
      const gallery = document.querySelector('.process-photo-gallery');
      if (!gallery) return;

      const track = gallery.querySelector('.process-photo-gallery__track');
      const prev = gallery.querySelector('.process-photo-gallery__arrow--prev');
      const next = gallery.querySelector('.process-photo-gallery__arrow--next');
      if (!track || !prev || !next) return;

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const canScroll = () => track.scrollWidth > track.clientWidth + 2;
      const update = () => {
        const max = Math.max(0, track.scrollWidth - track.clientWidth);
        prev.disabled = max <= 2 || track.scrollLeft <= 2;
        next.disabled = max <= 2 || track.scrollLeft >= max - 2;
      };
      const move = direction => {
        const firstImage = track.querySelector('img');
        const styles = window.getComputedStyle(track);
        const gap = parseFloat(styles.columnGap || styles.gap) || 16;
        const step = firstImage ? firstImage.getBoundingClientRect().width + gap : track.clientWidth * .75;
        track.scrollBy({left: direction * step, behavior: reducedMotion.matches ? 'auto' : 'smooth'});
      };

      prev.addEventListener('click', () => move(-1));
      next.addEventListener('click', () => move(1));
      track.addEventListener('scroll', update, {passive:true});
      window.addEventListener('resize', update);
      if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);

      track.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
        if (event.key === 'Home') { event.preventDefault(); track.scrollTo({left:0, behavior:reducedMotion.matches ? 'auto' : 'smooth'}); }
        if (event.key === 'End') { event.preventDefault(); track.scrollTo({left:track.scrollWidth, behavior:reducedMotion.matches ? 'auto' : 'smooth'}); }
      });

      // Прокрутка следует фактическому расстоянию жеста, без перелистывания по карточкам.
      gallery.addEventListener('wheel', event => {
        if (!canScroll()) return;

        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!delta) return;

        const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1;
        const current = track.scrollLeft;
        const max = Math.max(0, track.scrollWidth - track.clientWidth);
        const distance = Math.max(-current, Math.min(max - current, delta * scale));
        if (Math.abs(distance) < 0.5) return;

        // Используем нативную прокрутку без повторного запуска smooth-анимации.
        event.preventDefault();
        track.scrollBy({left: distance, behavior: 'auto'});
      }, {passive:false});

      let pointerId = null, startX = 0, startScroll = 0, moved = false;
      const stopDragging = event => {
        if (pointerId === null || (event && event.pointerId !== pointerId)) return;
        pointerId = null;
        track.classList.remove('is-dragging');
        update();
      };

      track.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch' || event.button !== 0 || !canScroll()) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startScroll = track.scrollLeft;
        moved = false;
        track.classList.add('is-dragging');
        try { track.setPointerCapture(event.pointerId); } catch (_) {}
      });
      track.addEventListener('pointermove', event => {
        if (pointerId === null || event.pointerId !== pointerId) return;
        const distance = event.clientX - startX;
        if (Math.abs(distance) > 3) moved = true;
        if (moved) {
          event.preventDefault();
          track.scrollLeft = startScroll - distance;
        }
      });
      track.addEventListener('pointerup', stopDragging);
      track.addEventListener('pointercancel', stopDragging);
      track.addEventListener('lostpointercapture', stopDragging);
      // Сбрасываем захват, если окно потеряло фокус во время перетаскивания.
      window.addEventListener('blur', () => stopDragging());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopDragging();
      });
      track.addEventListener('dragstart', event => event.preventDefault());

      update();
    })();

/* Карусель отзывов */
(() => {
      const carousel = document.querySelector('.review-carousel');
      if (!carousel) return;
      const track = carousel.querySelector('.review-carousel__track');
      const prev = carousel.querySelector('.review-carousel__arrow--prev');
      const next = carousel.querySelector('.review-carousel__arrow--next');
      if (!track || !prev || !next) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => {
        const max = Math.max(0, track.scrollWidth - track.clientWidth);
        prev.disabled = max <= 2 || track.scrollLeft <= 2;
        next.disabled = max <= 2 || track.scrollLeft >= max - 2;
      };
      const move = direction => {
        const card = track.querySelector('.review-card');
        const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 16;
        track.scrollBy({left: direction * (card ? card.getBoundingClientRect().width + gap : track.clientWidth * .8), behavior: reducedMotion.matches ? 'auto' : 'smooth'});
      };
      prev.addEventListener('click', () => move(-1));
      next.addEventListener('click', () => move(1));
      track.addEventListener('scroll', update, {passive:true});
      window.addEventListener('resize', update);
      if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
      track.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
        if (event.key === 'Home') { event.preventDefault(); track.scrollTo({left:0, behavior:reducedMotion.matches ? 'auto' : 'smooth'}); }
        if (event.key === 'End') { event.preventDefault(); track.scrollTo({left:track.scrollWidth, behavior:reducedMotion.matches ? 'auto' : 'smooth'}); }
      });
      carousel.addEventListener('wheel', event => {
        if (track.scrollWidth <= track.clientWidth + 2) return;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!delta) return;
        const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1;
        const current = track.scrollLeft, max = Math.max(0, track.scrollWidth - track.clientWidth);
        const distance = Math.max(-current, Math.min(max - current, delta * scale));
        if (Math.abs(distance) < .5) return;
        event.preventDefault();
        track.scrollBy({left:distance, behavior:'auto'});
      }, {passive:false});
      let pointerId = null, startX = 0, startScroll = 0, moved = false;
      const stopDragging = event => {
        if (pointerId === null || (event && event.pointerId !== pointerId)) return;
        pointerId = null;
        track.classList.remove('is-dragging');
        update();
      };
      track.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch' || event.button !== 0 || track.scrollWidth <= track.clientWidth + 2) return;
        pointerId = event.pointerId; startX = event.clientX; startScroll = track.scrollLeft; moved = false;
        track.classList.add('is-dragging');
        try { track.setPointerCapture(event.pointerId); } catch (_) {}
      });
      track.addEventListener('pointermove', event => {
        if (pointerId === null || event.pointerId !== pointerId) return;
        const distance = event.clientX - startX;
        if (Math.abs(distance) > 3) moved = true;
        if (moved) { event.preventDefault(); track.scrollLeft = startScroll - distance; }
      });
      track.addEventListener('pointerup', stopDragging);
      track.addEventListener('pointercancel', stopDragging);
      track.addEventListener('lostpointercapture', stopDragging);
      window.addEventListener('blur', () => stopDragging());
      document.addEventListener('visibilitychange', () => { if (document.hidden) stopDragging(); });
      track.addEventListener('dragstart', event => event.preventDefault());
      update();
    })();


/* Kinescope player: click-to-load, retry and external fallback. */
(() => {
  const preview = document.querySelector('.hero-video-preview');
  if (!preview) return;

  const videoId = 'eWhaw3CwffKhViyhnev9AA';
  const embedUrl = `https://kinescope.io/embed/${videoId}?autoplay=1&playsinline=1`;
  const directUrl = `https://kinescope.io/${videoId}`;
  const container = preview.closest('.hero-art, .hero-v41__portrait') || preview.parentElement;
  if (!container) return;

  let frame = null;
  let fallback = null;
  let loadTimer = null;

  const clearTimer = () => {
    if (loadTimer !== null) {
      window.clearTimeout(loadTimer);
      loadTimer = null;
    }
  };

  const showFallback = () => {
    if (fallback) return;
    fallback = document.createElement('div');
    fallback.className = 'hero-video-fallback';
    fallback.setAttribute('role', 'status');
    fallback.style.cssText = 'position:absolute;inset:auto 8px 8px;z-index:6;padding:12px;border-radius:10px;background:rgba(17,25,35,.96);color:#fff;font:14px/1.45 system-ui,sans-serif;text-align:center;box-shadow:0 4px 18px rgba(0,0,0,.3)';
    fallback.innerHTML = '<p style="margin:0 0 8px">Видео загружается дольше обычного.</p><a href="' + directUrl + '" target="_blank" rel="noopener noreferrer" style="color:#f2d5a0;text-decoration:underline">Открыть видео на Kinescope</a><button type="button" style="display:block;margin:10px auto 0;padding:7px 12px;border:1px solid #f2d5a0;border-radius:6px;background:transparent;color:#fff;cursor:pointer">Повторить загрузку</button>';
    fallback.querySelector('button').addEventListener('click', () => {
      fallback.remove();
      fallback = null;
      if (frame) {
        frame.src = 'about:blank';
        frame.src = embedUrl;
      }
      startFallbackTimer();
    });
    container.appendChild(fallback);
  };

  const startFallbackTimer = () => {
    clearTimer();
    loadTimer = window.setTimeout(showFallback, 12000);
  };

  preview.addEventListener('click', () => {
    if (frame) return;
    preview.disabled = true;

    frame = document.createElement('iframe');
    frame.id = 'hero-kinescope-player';
    frame.className = 'hero-video';
    frame.title = 'Видео Ольги Сусленниковой о системных семейных расстановках';
    frame.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;');
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('loading', 'eager');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-forms');
    frame.src = embedUrl;

    frame.addEventListener('load', clearTimer, { once: true });
    frame.addEventListener('error', showFallback);
    preview.replaceWith(frame);
    startFallbackTimer();
  });
})();

// Navigation menu for the Concept 4.1 hero header.
(() => {
  const toggle = document.querySelector('.menu-toggle-v41');
  const nav = document.querySelector('.site-nav-v41');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    nav.classList.toggle('is-open', !isOpen);
  });
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    });
  });
})();
