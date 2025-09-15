export function handleToggleNavigation() {
  const navigationDrawer = document.getElementById('navigation-drawer');
  const moviePlayerBar = document.querySelector('.movie-player-bar');
  const mainContainer = document.querySelector('.container');
  const toggleButton = document.getElementById('nav-toggle-button');
  const toggleIcon = toggleButton?.querySelector('md-icon');
  const phyloHud = document.querySelector('.phylo-hud');

  if (navigationDrawer && moviePlayerBar && mainContainer) {
    const isHidden = navigationDrawer.style.transform === 'translateX(-100%)';

    if (isHidden) {
      // Show navigation
      navigationDrawer.style.transform = 'translateX(0)';
      moviePlayerBar.classList.remove('nav-hidden');
      mainContainer.style.marginLeft = 'var(--navigation-drawer-width)';
      if (toggleIcon) toggleIcon.textContent = 'menu_open';
      
      // Update HUD position for visible navigation
      if (phyloHud) phyloHud.classList.add('nav-visible');
    } else {
      // Hide navigation
      navigationDrawer.style.transform = 'translateX(-100%)';
      moviePlayerBar.classList.add('nav-hidden');
      mainContainer.style.marginLeft = '0';
      if (toggleIcon) toggleIcon.textContent = 'menu';
      
      // Update HUD position for hidden navigation
      if (phyloHud) phyloHud.classList.remove('nav-visible');
    }
  }
}

