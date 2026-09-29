function initNavToggle() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('primary-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Close the dropdown if the viewport is resized back to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 560 && links.classList.contains('open')) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

document.addEventListener('DOMContentLoaded', initNavToggle);
