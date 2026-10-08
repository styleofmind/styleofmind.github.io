(() => {
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');

  const closeMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuToggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };

  menuToggle?.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    mobileMenu.setAttribute('aria-hidden', String(!open));
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });

  mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

  const onScroll = () => {
    header?.classList.toggle('scrolled', window.scrollY > 20);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Keep FAQ behavior clean: opening one closes the others.
  document.querySelectorAll('.faq-list details').forEach(detail => {
    detail.addEventListener('toggle', () => {
      if (!detail.open) return;
      document.querySelectorAll('.faq-list details').forEach(other => {
        if (other !== detail) other.open = false;
      });
    });
  });

  // Simple mobile/desktop review slider.
  const slider = document.querySelector('[data-slider]');
  const reviewCards = [...document.querySelectorAll('.review-card')];
  const prev = document.querySelector('.slider-button.prev');
  const next = document.querySelector('.slider-button.next');
  let active = 0;

  const renderReviews = () => {
    if (!slider || reviewCards.length === 0) return;
    if (window.innerWidth > 1000) {
      reviewCards.forEach(card => card.style.display = '');
      return;
    }
    reviewCards.forEach((card, index) => {
      card.style.display = index === active ? '' : 'none';
    });
  };

  prev?.addEventListener('click', () => {
    active = (active - 1 + reviewCards.length) % reviewCards.length;
    renderReviews();
  });

  next?.addEventListener('click', () => {
    active = (active + 1) % reviewCards.length;
    renderReviews();
  });

  window.addEventListener('resize', renderReviews);
  renderReviews();

  // Reveal sections when they enter the viewport.
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.13 });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('in-view'));
  }
})();
