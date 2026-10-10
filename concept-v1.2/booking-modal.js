(() => {
  const modalSelector = 'div[class*="dikidi-"][class*="-modal"]:not([data-olga-closed="true"])';
  const closeSelector = 'div[class*="dikidi-"][class*="-close"]';
  const scrollProperties = [
    'overflow', 'overflow-x', 'overflow-y',
    'padding-right', 'margin-right', 'position', 'top', 'width', 'left'
  ];
  let scrollStyleSnapshot = null;

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
    if (bookingLink) captureScrollStyles();
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
