/* Защита от повторной инициализации: при повторном подключении app.js обработчики не дублируются. */
(function () {
  const key = '__styleOfMindV13AppInitialized';
  if (window[key]) return;
  window[key] = true;

  /* Analytics consent is handled by analytics.js on the main page only. */

  /* Поведение страницы «Расставить точки над МЫ». */

  /* Во время загрузки показываем мягко пульсирующий фавикон, после полной загрузки — статичный. */
  (() => {
    document.querySelectorAll('[data-current-year]').forEach(node => {
      node.textContent = new Date().getFullYear();
    });

    const icon = document.querySelector('link[rel="icon"]');
    if (!icon) return;
    const showStaticIcon = () => {
      icon.href = new URL('favicon.svg', document.baseURI).href;
    };
    if (document.readyState === 'complete') {
      showStaticIcon();
    } else {
      window.addEventListener('load', showStaticIcon, { once: true });
    }
  })();

  /* Telegram: сообщения хранятся читаемым русским текстом в HTML.
   При загрузке страницы кодируем их для параметра text в ссылке Telegram. */

  (() => {
    const telegramLinks = document.querySelectorAll('a[data-telegram-message]');
    telegramLinks.forEach(link => {
      const message = link.dataset.telegramMessage;
      if (!message) return;
      link.href = `https://t.me/olga_styleofmind?text=${encodeURIComponent(message)}`;
    });
  })();

  /* Всплывающее предложение диагностики */
  (() => {
    const popup = document.getElementById('diagnosticOfferPopup');
    if (!popup) return;
    const closeButton = popup.querySelector('.offer-popup__close');
    const storageKey = 'styleOfMindDiagnosticOfferShown_v1';
    let shown = false;
    let videoActive = false;
    let scrollThresholdReached = false;
    let timerElapsed = false;
    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch (_) {}
    const show = () => {
      if (shown || videoActive) return;
      shown = true;
      popup.hidden = false;
      try {
        sessionStorage.setItem(storageKey, '1');
      } catch (_) {}
    };
    const formatsSection = document.querySelector('.formats-section');
    const finalSection = document.querySelector('.final-section');
    const formatsAreVisible = () => {
      if (!formatsSection) return false;
      const rect = formatsSection.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    };
    const finalSectionIsVisible = () => {
      if (!finalSection) return false;
      const rect = finalSection.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    };
    const tryShow = () => {
      if (finalSectionIsVisible()) {
        popup.hidden = true;
        return;
      }
      if (!videoActive && !formatsAreVisible() && (scrollThresholdReached || timerElapsed)) show();
    };
    const close = () => {
      popup.hidden = true;
    };
    document.addEventListener('styleofmind:video-playing', () => {
      videoActive = true;
      popup.hidden = true;
    });
    document.addEventListener('styleofmind:video-ended', () => {
      videoActive = false;
      tryShow();
    });
    let scrollTimer;
    window.addEventListener('scroll', () => {
      if (finalSectionIsVisible()) {
        if (shown) popup.hidden = true;
        return;
      }
      if (shown) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        const doc = document.documentElement;
        const maxScroll = doc.scrollHeight - window.innerHeight;
        if (maxScroll > 0 && window.scrollY / maxScroll >= 0.5) {
          scrollThresholdReached = true;
        }
        tryShow();
      }, 120);
    }, {
      passive: true
    });
    window.setTimeout(() => {
      timerElapsed = true;
      tryShow();
    }, 45000);
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
      track.scrollBy({
        left: direction * step,
        behavior: reducedMotion.matches ? 'auto' : 'smooth'
      });
    };
    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('scroll', update, {
      passive: true
    });
    window.addEventListener('resize', update);
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    track.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        track.scrollTo({
          left: 0,
          behavior: reducedMotion.matches ? 'auto' : 'smooth'
        });
      }
      if (event.key === 'End') {
        event.preventDefault();
        track.scrollTo({
          left: track.scrollWidth,
          behavior: reducedMotion.matches ? 'auto' : 'smooth'
        });
      }
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
      track.scrollBy({
        left: distance,
        behavior: 'auto'
      });
    }, {
      passive: false
    });
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
      try {
        track.setPointerCapture(event.pointerId);
      } catch (_) {}
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
      track.scrollBy({
        left: direction * (card ? card.getBoundingClientRect().width + gap : track.clientWidth * .8),
        behavior: reducedMotion.matches ? 'auto' : 'smooth'
      });
    };
    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('scroll', update, {
      passive: true
    });
    window.addEventListener('resize', update);
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    track.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        track.scrollTo({
          left: 0,
          behavior: reducedMotion.matches ? 'auto' : 'smooth'
        });
      }
      if (event.key === 'End') {
        event.preventDefault();
        track.scrollTo({
          left: track.scrollWidth,
          behavior: reducedMotion.matches ? 'auto' : 'smooth'
        });
      }
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
      track.scrollBy({
        left: distance,
        behavior: 'auto'
      });
    }, {
      passive: false
    });
    let pointerId = null, startX = 0, startScroll = 0, moved = false;
    const stopDragging = event => {
      if (pointerId === null || (event && event.pointerId !== pointerId)) return;
      pointerId = null;
      track.classList.remove('is-dragging');
      update();
    };
    track.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || event.button !== 0 || track.scrollWidth <= track.clientWidth + 2) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScroll = track.scrollLeft;
      moved = false;
      track.classList.add('is-dragging');
      try {
        track.setPointerCapture(event.pointerId);
      } catch (_) {}
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
    window.addEventListener('blur', () => stopDragging());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopDragging();
    });
    track.addEventListener('dragstart', event => event.preventDefault());
    update();
  })();

  /* Галерея сертификатов: единое активное состояние для документа и миниатюры */
  (() => {
    const section = document.querySelector('.certificates-section');
    if (!section) return;
    const track = section.querySelector('.certificate-carousel__track');
    const slides = [...section.querySelectorAll('.certificate-slide')];
    const thumbnails = [...section.querySelectorAll('.certificate-thumbnail')];
    const previousArrow = section.querySelector('.certificate-carousel__arrow--prev');
    const nextArrow = section.querySelector('.certificate-carousel__arrow--next');
    const dialog = section.querySelector('.certificate-lightbox');
    const largeImage = dialog?.querySelector('.certificate-lightbox__image');
    const lightboxPreviousArrow = dialog?.querySelector('.certificate-lightbox__nav--prev');
    const lightboxNextArrow = dialog?.querySelector('.certificate-lightbox__nav--next');
    if (!track || !slides.length || !dialog || !largeImage) return;
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
      if (distance) container.scrollBy({
        left: distance,
        behavior: reducedMotion.matches ? 'auto' : 'smooth'
      });
    };
    const updateLargeImage = () => {
      const slide = slides[active];
      const image = slide?.querySelector('img');
      if (!image) return;
      largeImage.src = slide.dataset.fullSrc || image.currentSrc || image.src;
      largeImage.alt = image.alt;
    };
    const syncActive = index => {
      active = Math.max(0, Math.min(slides.length - 1, index));
      if (lightboxPreviousArrow) lightboxPreviousArrow.disabled = active <= 0;
      if (lightboxNextArrow) lightboxNextArrow.disabled = active >= slides.length - 1;
      slides.forEach((slide, i) => {
        const selected = i === active;
        slide.classList.toggle('is-active', selected);
        slide.setAttribute('aria-pressed', String(selected));
        const image = slide.querySelector('img');
        if (selected && image && image.dataset.carouselSrc) {
          image.src = image.dataset.carouselSrc;
          delete image.dataset.carouselSrc;
        }
      });
      if (previousArrow) previousArrow.disabled = active <= 0;
      if (nextArrow) nextArrow.disabled = active >= slides.length - 1;
      thumbnails.forEach((thumbnail, i) => {
        const selected = i === active;
        thumbnail.classList.toggle('is-active', selected);
        thumbnail.setAttribute('aria-pressed', String(selected));
      });
      const currentLabel = section.querySelector('[data-certificate-current]');
      const totalLabel = section.querySelector('[data-certificate-total]');
      const progress = section.querySelector('.certificate-gallery-status__progress');
      if (currentLabel) currentLabel.textContent = String(active + 1);
      if (totalLabel) totalLabel.textContent = String(slides.length);
      if (progress) {
        progress.max = slides.length;
        progress.value = active + 1;
      }
      scrollThumbnailIntoView(thumbnails[active]);
    };
    const setActive = (index, scrollSlide = true) => {
      const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
      syncActive(nextIndex);
      if (dialog.open) updateLargeImage();
      if (scrollSlide) {
        programmaticScroll = true;
        const slide = slides[active];
        const trackRect = track.getBoundingClientRect();
        const slideRect = slide.getBoundingClientRect();
        const centeredLeft = track.scrollLeft + slideRect.left - trackRect.left
          - (track.clientWidth - slideRect.width) / 2;
        track.scrollTo({
          left: centeredLeft,
          behavior: reducedMotion.matches ? 'auto' : 'smooth'
        });
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(() => {
          programmaticScroll = false;
        }, reducedMotion.matches ? 0 : 450);
      }
    };
    const syncFromTrack = () => {
      if (programmaticScroll) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        const trackRect = track.getBoundingClientRect();
        const trackCenter = trackRect.left + track.clientWidth / 2;
        const nearestIndex = slides.reduce((bestIndex, slide, index) => {
          const slideCenter = slide.getBoundingClientRect().left
            + slide.getBoundingClientRect().width / 2;
          const bestSlide = slides[bestIndex];
          const bestCenter = bestSlide.getBoundingClientRect().left
            + bestSlide.getBoundingClientRect().width / 2;
          return Math.abs(slideCenter - trackCenter) < Math.abs(bestCenter - trackCenter)
            ? index
            : bestIndex;
        }, 0);
        syncActive(nearestIndex);
      }, 90);
    };
    const showLarge = index => {
      setActive(index);
      updateLargeImage();
      if (!dialog.open) dialog.showModal();
    };
    slides.forEach((slide, i) => slide.addEventListener('click', () => showLarge(i)));
    thumbnails.forEach((thumbnail, i) => thumbnail.addEventListener('click', () => setActive(i)));
    previousArrow?.addEventListener('click', () => setActive(active - 1));
    nextArrow?.addEventListener('click', () => setActive(active + 1));
    lightboxPreviousArrow?.addEventListener('click', () => setActive(active - 1));
    lightboxNextArrow?.addEventListener('click', () => setActive(active + 1));
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' && active > 0) {
        event.preventDefault();
        setActive(active - 1);
      } else if (event.key === 'ArrowRight' && active < slides.length - 1) {
        event.preventDefault();
        setActive(active + 1);
      }
    });
    track.addEventListener('scroll', syncFromTrack, {
      passive: true
    });
    track.addEventListener('wheel', event => {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      if (max <= 2) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1;
      const distance = Math.max(-track.scrollLeft, Math.min(max - track.scrollLeft, delta * scale));
      if (Math.abs(distance) < 0.5) return;
      event.preventDefault();
      track.scrollBy({
        left: distance,
        behavior: 'auto'
      });
    }, {
      passive: false
    });
    dialog.querySelector('.certificate-lightbox__close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    syncActive(0);
  })();

  /* Видео в первом экране: плеер загружается по нажатию и сообщает о завершении просмотра. */
  (() => {
    const preview = document.getElementById('hero-kinescope-preview');
    if (!preview) return;
    preview.addEventListener('click', () => {
      const src = preview.dataset.videoSrc;
      if (!src) return;

      // Сразу блокируем предложение, не дожидаясь загрузки и старта плеера.
      document.dispatchEvent(new Event('styleofmind:video-playing'));

      // Подключаем официальный Kinescope IFrame API для события Ended.
      window.onKinescopeIframeAPIReady = playerFactory => {
        playerFactory.on(playerFactory.Events.Created, ({ data: playerInstance }) => {
          playerInstance.on(playerInstance.Events.Ended, () => {
            document.dispatchEvent(new Event('styleofmind:video-ended'));
          });
        });
      };

      const playerUrl = new URL(src, document.baseURI);
      playerUrl.searchParams.set('enableIframeApi', '');
      const player = document.createElement('iframe');
      player.className = 'hero-video';
      player.id = 'hero-kinescope-player';
      player.src = playerUrl.href;
      player.title = 'Видео Ольги Сусленниковой о системных семейных расстановках';
      player.allow =
        'autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;';
      player.allowFullscreen = true;
      player.loading = 'eager';
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      preview.replaceWith(player);

      const apiScript = document.createElement('script');
      apiScript.src = 'https://player.kinescope.io/latest/iframe.player.js?auto';
      apiScript.async = true;
      document.head.appendChild(apiScript);
    }, {
      once: true
    });
  })();

  /* Close the compact navigation after an in-page destination is selected. */
  (() => {
    const mobileMenu = document.querySelector('.mobile-menu');
    if (!mobileMenu) return;
    mobileMenu.querySelectorAll('nav a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.open = false;
      });
    });
  })();
})();
