// Endrer kun utseendet på eksisterende Lukk-knapper.
// Vi erstatter ikke knappelementene, slik at alle eksisterende klikklyttere bevares.
(() => {
  const decorate = (root) => {
    const cards = [];
    if (root.nodeType === 1 && root.matches?.('.modal .modal-card')) cards.push(root);
    if (root.querySelectorAll) cards.push(...root.querySelectorAll('.modal .modal-card'));
    for (const card of cards) {
      for (const button of card.querySelectorAll('button')) {
        if (button.classList.contains('modal-close-icon')) continue;
        if (button.id === 'proveplanClose') continue; // Har allerede et kryss.
        const label = button.textContent.trim().replace(/\s+/g, ' ');
        if (label !== 'Lukk') continue;
        button.classList.add('modal-close-icon');
        button.setAttribute('aria-label', 'Lukk vinduet');
        button.setAttribute('title', 'Lukk');
        button.textContent = '✕';
      }
    }
  };
  const start = () => {
    decorate(document);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node.nodeType === 1) decorate(node);
      }
    });
    observer.observe(document.body, {childList:true, subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
