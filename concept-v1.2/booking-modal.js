(() => {
  const modalSelector = 'div[class*="dikidi-"][class*="-modal"]';
  const closeSelector = 'div[class*="dikidi-"][class*="-close"]';

  function closeModal(modal) {
    if (!modal) return;
    modal.remove();
    // DIKIDI locks background scrolling while its dialog is open.
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow-y');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-y');
  }

  // The DIKIDI widget's close icon can be unreliable on some layouts.
  document.addEventListener('click', (event) => {
    const closeButton = event.target instanceof Element
      ? event.target.closest(closeSelector)
      : null;
    if (!closeButton) return;

    const modal = closeButton.closest(modalSelector);
    if (!modal) return;

    event.preventDefault();
    event.stopPropagation();
    closeModal(modal);
  }, true);

  // Escape closes the most recently opened booking dialog.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const modals = document.querySelectorAll(modalSelector);
    const modal = modals[modals.length - 1];
    if (!modal) return;
    event.preventDefault();
    closeModal(modal);
  }, true);
})();
