(() => {
  const modalSelector = 'div[class*="dikidi-"][class*="-modal"]:not([data-olga-closed="true"])';
  const closeSelector = 'div[class*="dikidi-"][class*="-close"]';
  const scrollProperties = [
    'overflow', 'overflow-x', 'overflow-y',
    'padding-right', 'margin-right', 'position', 'top', 'width', 'left'
  ];
  let scrollStyleSnapshot = null;
  let requestedWidgetId = '';
  const serviceTitles = Object.freeze({
    '219958': 'Индивидуальная расстановка на фигурках',
    '219959': 'Групповая расстановка онлайн в Zoom',
    '219960': 'Групповая расстановка очно в Санкт-Петербурге',
    '219957': 'Первая диагностическая сессия онлайн в Zoom',
    '218868': 'Онлайн-запись'
  });

  function getWidgetId(modal) {
    const frame = modal && modal.querySelector('iframe[src*="dikidi.ru"]');
    const source = frame ? frame.getAttribute('src') || '' : '';
    const match = source.match(/[?&]widget=(\d+)/);
    return match ? match[1] : requestedWidgetId;
  }

  function ensureServiceHeader(modal) {
    if (!modal || modal.getAttribute('data-olga-closed') === 'true') return;
    const dialog = modal.querySelector('div[class*="-dialog"]');
    const frame = dialog && dialog.querySelector('iframe');
    if (!dialog || !frame) return;

    let header = dialog.querySelector(':scope > .olga-dikidi-header');
    if (!header) {
      dialog.classList.add('olga-dikidi-dialog');
      header = document.createElement('div');
      header.className = 'olga-dikidi-header';
      header.setAttribute('aria-live', 'polite');
      const eyebrow = document.createElement('span');
      eyebrow.className = 'olga-dikidi-header__eyebrow';
      eyebrow.textContent = 'ЗАПИСЬ НА УСЛУГУ';
      const title = document.createElement('strong');
      title.className = 'olga-dikidi-header__title';
      header.append(eyebrow, title);
      dialog.insertBefore(header, frame);
    }

    const widgetId = getWidgetId(modal);
    const titleText = serviceTitles[widgetId] || 'Онлайн-запись';
    const titleNode = header.querySelector('.olga-dikidi-header__title');
    // Avoid writing the same text repeatedly: the observer watches child changes.
    if (titleNode.textContent !== titleText) titleNode.textContent = titleText;
    if (header.dataset.widgetId !== widgetId) header.dataset.widgetId = widgetId;
  }

  function scanBookingModals() {
    document.querySelectorAll(modalSelector).forEach(ensureServiceHeader);
  }

  const modalObserver = new MutationObserver(scanBookingModals);
  if (document.documentElement) {
    modalObserver.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['src']
    });
  }
  scanBookingModals();

  function captureScrollStyles() {
    const hadBookingClass = document.documentElement.classList.contains('booking-modal-open');
    scrollStyleSnapshot = [document.documentElement, document.body].map((element) => ({
      element,
      properties: scrollProperties.map((property) => ({
        property,
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property)
      }))
    }));
    scrollStyleSnapshot.hadBookingClass = hadBookingClass;
    document.documentElement.classList.add('booking-modal-open');
  }

  function restoreScrollStyles() {
    if (!scrollStyleSnapshot) return;
    scrollStyleSnapshot.forEach(({ element, properties }) => {
      properties.forEach(({ property, value, priority }) => {
        if (value) element.style.setProperty(property, value, priority);
        else element.style.removeProperty(property);
      });
    });
    const hadBookingClass = scrollStyleSnapshot.hadBookingClass;
    if (hadBookingClass) document.documentElement.classList.add('booking-modal-open');
    else document.documentElement.classList.remove('booking-modal-open');
    scrollStyleSnapshot = null;
  }

  function closeModal(modal) {
    if (!modal) return;
    // Keep the iframe attached: DIKIDI may finish an async message after close.
    // Mark it closed so a later booking opens and targets only the new modal.
    modal.setAttribute('data-olga-closed', 'true');
    modal.style.setProperty('display', 'none', 'important');
    restoreScrollStyles();
  }

  // Snapshot original scroll styles before DIKIDI locks page scrolling.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const bookingLink = target && target.closest('a[href*="dikidi.ru"]');
    if (bookingLink) {
      const match = (bookingLink.getAttribute('href') || '').match(/#widget=(\d+)/);
      requestedWidgetId = match ? match[1] : '';
      captureScrollStyles();
    }
  }, true);

  // Use a predictable close handler because DIKIDI's own close icon may leave
  // page scroll locking behind on some viewport sizes.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const closeButton = target && target.closest(closeSelector);
    if (!closeButton) return;
    const modal = closeButton.closest(modalSelector);
    if (!modal) return;
    event.preventDefault();
    event.stopPropagation();
    closeModal(modal);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const modals = document.querySelectorAll(modalSelector);
    const modal = modals[modals.length - 1];
    if (!modal) return;
    event.preventDefault();
    closeModal(modal);
  }, true);
})();
