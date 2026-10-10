(() => {
  const modalSelector = 'div[class*="dikidi-"][class*="-modal"]:not([data-olga-closed="true"])';
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
    if (titleNode && titleNode.textContent !== titleText) titleNode.textContent = titleText;
    if (header.dataset.widgetId !== widgetId) header.dataset.widgetId = widgetId;
  }

  function scanBookingModals() {
    document.querySelectorAll(modalSelector).forEach(ensureServiceHeader);
  }

  // Capture the requested service before DIKIDI's click handler creates the iframe.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const bookingLink = target && target.closest('a[href*="dikidi.ru"]');
    if (!bookingLink) return;
    const match = (bookingLink.getAttribute('href') || '').match(/#widget=(\d+)/);
    requestedWidgetId = match ? match[1] : '';
  }, true);

  const observer = new MutationObserver(scanBookingModals);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });
  scanBookingModals();
})();
