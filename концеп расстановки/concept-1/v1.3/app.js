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

/* Галерея сертификатов: единое активное состояние для документа и миниатюры */
(() => {
  const section = document.querySelector('.certificates-section');
  if (!section) return;
  const track = section.querySelector('.certificate-carousel__track');
  const slides = [...section.querySelectorAll('.certificate-slide')];
  const prev = section.querySelector('.certificate-carousel__arrow--prev');
  const next = section.querySelector('.certificate-carousel__arrow--next');
  const thumbnails = [...section.querySelectorAll('.certificate-thumbnail')];
  const dialog = section.querySelector('.certificate-lightbox');
  const largeImage = dialog?.querySelector('.certificate-lightbox__image');
  if (!track || !slides.length || !prev || !next || !dialog || !largeImage) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let scrollTimer = 0;
  let programmaticScroll = false;

  const scrollThumbnailIntoView = thumbnail => {
    const container = section.querySelector('.certificate-thumbnails');
    if (!container || !thumbnail) return;
    const containerRect = container.getBoundingClientRect();
    const thumbnailRect = thumbnail.getBoundingClientRect();
    let distance = 0;
    if (thumbnailRect.left < containerRect.left) distance = thumbnailRect.left - containerRect.left - 8;
    else if (thumbnailRect.right > containerRect.right) distance = thumbnailRect.right - containerRect.right + 8;
    if (distance) container.scrollBy({ left: distance, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  };

  const syncActive = index => {
    active = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((slide, i) => {
      const selected = i === active;
      slide.classList.toggle('is-active', selected);
      slide.setAttribute('aria-pressed', String(selected));
    });
    thumbnails.forEach((thumbnail, i) => {
      const selected = i === active;
      thumbnail.classList.toggle('is-active', selected);
      thumbnail.setAttribute('aria-pressed', String(selected));
    });
    prev.disabled = active === 0;
    next.disabled = active === slides.length - 1;
    scrollThumbnailIntoView(thumbnails[active]);
  };

  const setActive = (index, scrollSlide = true) => {
    const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
    syncActive(nextIndex);
    if (scrollSlide) {
      programmaticScroll = true;
      track.scrollTo({
        left: slides[active].offsetLeft,
        behavior: reducedMotion.matches ? 'auto' : 'smooth'
      });
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => { programmaticScroll = false; }, reducedMotion.matches ? 0 : 450);
    }
  };

  const syncFromTrack = () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      const trackCenter = track.getBoundingClientRect().left + track.clientWidth / 2;
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      slides.forEach((slide, index) => {
        const rect = slide.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - trackCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      programmaticScroll = false;
      syncActive(nearestIndex);
    }, 90);
  };

  const showLarge = index => {
    setActive(index);
    const image = slides[active].querySelector('img');
    if (!image) return;
    largeImage.src = image.currentSrc || image.src;
    largeImage.alt = image.alt;
    if (!dialog.open) dialog.showModal();
  };

  slides.forEach((slide, i) => slide.addEventListener('click', () => showLarge(i)));
  thumbnails.forEach((thumbnail, i) => thumbnail.addEventListener('click', () => setActive(i)));
  prev.addEventListener('click', () => setActive(active - 1));
  next.addEventListener('click', () => setActive(active + 1));
  track.addEventListener('scroll', syncFromTrack, { passive: true });
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); setActive(active - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); setActive(active + 1); }
    if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    if (event.key === 'End') { event.preventDefault(); setActive(slides.length - 1); }
  });

  dialog.querySelector('.certificate-lightbox__close')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('.certificate-lightbox__arrow--prev')?.addEventListener('click', () => showLarge(active - 1));
  dialog.querySelector('.certificate-lightbox__arrow--next')?.addEventListener('click', () => showLarge(active + 1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); showLarge(active - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showLarge(active + 1); }
  });

  syncActive(0);
})();


/* Видео в первом экране: сначала выглядит как портретная фотография, плеер загружается по нажатию. */
(() => {
  const preview = document.getElementById('hero-kinescope-preview');
  if (!preview) return;
  preview.addEventListener('click', () => {
    const src = preview.dataset.videoSrc;
    if (!src) return;
    const player = document.createElement('iframe');
    player.className = 'hero-video';
    player.id = 'hero-kinescope-player';
    player.src = src;
    player.title = 'Видео Ольги Сусленниковой о системных семейных расстановках';
    player.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;';
    player.allowFullscreen = true;
    player.loading = 'eager';
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    preview.replaceWith(player);
  }, { once: true });
})();
