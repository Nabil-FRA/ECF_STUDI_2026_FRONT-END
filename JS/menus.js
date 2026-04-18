// page menus.js
// gestion de la liste des menus avec filtres
// fait par moi le 15/04/2026

// variables globales
let tousLesMenus = []; // tous les menus chargés depuis l'API
let menusFiltres = []; // menus après filtrage
let pageCourante = 1;
const MENUS_PAR_PAGE = 9; // 3x3 sur desktop

// ---- fonctions utilitaires ----

// pour éviter les injections xss
function echapper(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// formate un prix en euros
function formatPrix(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant);
}

// affiche une alerte
function afficherAlerte(msg, type) {
  const zone = document.getElementById('alert-global');
  zone.innerHTML = `
    <div class="alert alert-${type} alert-dismissible" role="alert">
      ${echapper(msg)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer l'alerte"></button>
    </div>
  `;
}

// ---- chargement des menus ----
async function chargerMenus() {
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const grid = document.getElementById('menus-grid');

  loadingState.classList.remove('d-none');
  emptyState.classList.add('d-none');
  grid.innerHTML = '';

  try {
    const data = await fetchAPI('/menus');
    tousLesMenus = data.menus || [];

    console.log('menus chargés:', tousLesMenus.length);

    // j'applique les filtres (au début aucun filtre donc tous les menus)
    appliquerFiltres();

  } catch(e) {
    console.error('erreur chargement menus', e);
    afficherAlerte('Impossible de charger les menus. Veuillez réessayer.', 'danger');
    loadingState.classList.add('d-none');
  }
}

// ---- appliquer les filtres ----
function appliquerFiltres() {
  console.log('application des filtres...');

  // je récupère les valeurs des filtres
  const recherche = document.getElementById('recherche').value.trim().toLowerCase();
  const prixMax = parseInt(document.getElementById('prix-max').value);
  const nbPersonnes = document.getElementById('nb-personnes').value;
  const tri = document.getElementById('tri').value;

  // thèmes sélectionnés
  const themesChecked = [];
  document.querySelectorAll('input[name="theme"]:checked').forEach(function(cb) {
    if (cb.value) themesChecked.push(cb.value);
  });

  // régimes sélectionnés
  const regimesChecked = [];
  document.querySelectorAll('input[name="regime"]:checked').forEach(function(cb) {
    if (cb.value) regimesChecked.push(cb.value);
  });

  // je filtre les menus
  menusFiltres = tousLesMenus.filter(function(menu) {
    // filtre recherche
    if (recherche && !menu.titre.toLowerCase().includes(recherche)) {
      return false;
    }

    // filtre prix
    if (menu.prix_base > prixMax) {
      return false;
    }

    // filtre nb personnes
    if (nbPersonnes && menu.nb_personnes_min > parseInt(nbPersonnes)) {
      return false;
    }

    // filtre thème (si au moins un thème coché)
    if (themesChecked.length > 0 && !themesChecked.includes(menu.theme)) {
      return false;
    }

    // filtre régime
    if (regimesChecked.length > 0 && !regimesChecked.includes(menu.regime)) {
      return false;
    }

    return true;
  });

  // je trie les menus
  menusFiltres.sort(function(a, b) {
    switch(tri) {
      case 'prix-asc':
        return a.prix_base - b.prix_base;
      case 'prix-desc':
        return b.prix_base - a.prix_base;
      case 'nom-asc':
        return a.titre.localeCompare(b.titre);
      case 'nom-desc':
        return b.titre.localeCompare(a.titre);
      case 'populaire':
      default:
        // on suppose qu'il y a un champ popularite ou on garde l'ordre d'origine
        return (b.popularite || 0) - (a.popularite || 0);
    }
  });

  console.log('menus après filtrage:', menusFiltres.length);

  // je reviens à la page 1
  pageCourante = 1;

  // j'affiche les résultats
  afficherMenus();
}

// ---- afficher les menus ----
function afficherMenus() {
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const grid = document.getElementById('menus-grid');
  const nbResultats = document.getElementById('nb-resultats');

  loadingState.classList.add('d-none');

  // mise à jour du compteur
  nbResultats.textContent = menusFiltres.length;

  // si aucun résultat
  if (menusFiltres.length === 0) {
    emptyState.classList.remove('d-none');
    grid.innerHTML = '';
    document.getElementById('pagination').classList.add('d-none');
    return;
  }

  emptyState.classList.add('d-none');

  // pagination
  const debut = (pageCourante - 1) * MENUS_PAR_PAGE;
  const fin = debut + MENUS_PAR_PAGE;
  const menusPage = menusFiltres.slice(debut, fin);

  // génération du HTML des cards
  let html = '';
  menusPage.forEach(function(menu) {
    html += genererCardMenu(menu);
  });

  grid.innerHTML = html;

  // mise à jour de la pagination
  afficherPagination();
}

// ---- générer une card menu ----
function genererCardMenu(menu) {
  // badge pour le régime
  let badgeRegime = '';
  if (menu.regime === 'vegetarien') {
    badgeRegime = '<span class="badge bg-success">Végétarien</span>';
  } else if (menu.regime === 'vegan') {
    badgeRegime = '<span class="badge bg-success">Végan</span>';
  } else if (menu.regime === 'sans-gluten') {
    badgeRegime = '<span class="badge bg-info">Sans gluten</span>';
  }

  // badge stock
  let badgeStock = '';
  if (menu.stock !== undefined && menu.stock <= 0) {
    badgeStock = '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Épuisé</span>';
  } else if (menu.stock !== undefined && menu.stock <= 3) {
    badgeStock = '<span class="badge bg-warning text-dark position-absolute top-0 end-0 m-2">Stock limité</span>';
  }

  // image placeholder si pas d'image
  const image = menu.image || '../images/placeholder-menu.jpg';

  return `
    <article class="col" role="listitem">
      <div class="card menu-card h-100">
        <div class="menu-card-img-wrapper">
          <img
            src="${echapper(image)}"
            class="card-img-top menu-card-img"
            alt="${echapper(menu.titre)}"
            loading="lazy"
          >
          ${badgeStock}
        </div>
        <div class="card-body d-flex flex-column">
          <div class="menu-card-badges mb-2">
            <span class="badge bg-secondary">${echapper(menu.theme)}</span>
            ${badgeRegime}
          </div>
          <h3 class="card-title h5">${echapper(menu.titre)}</h3>
          <p class="card-text text-muted small flex-grow-1">
            ${echapper(menu.description_courte || '')}
          </p>
          <div class="menu-card-meta">
            <span class="menu-card-personnes">
              <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                <path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
                <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
              </svg>
              ${menu.nb_personnes_min} pers. min
            </span>
            <span class="menu-card-prix">${formatPrix(menu.prix_base)}</span>
          </div>
        </div>
        <div class="card-footer bg-transparent border-0 pt-0">
          <a href="menu-detail.html?id=${menu.id}" class="btn btn-primary w-100">
            Voir le menu
          </a>
        </div>
      </div>
    </article>
  `;
}

// ---- pagination ----
function afficherPagination() {
  const paginationNav = document.getElementById('pagination');
  const paginationUl = paginationNav.querySelector('ul');

  const totalPages = Math.ceil(menusFiltres.length / MENUS_PAR_PAGE);

  if (totalPages <= 1) {
    paginationNav.classList.add('d-none');
    return;
  }

  paginationNav.classList.remove('d-none');

  let html = '';

  // bouton précédent
  html += `
    <li class="page-item ${pageCourante === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${pageCourante - 1}" aria-label="Page précédente">
        <span aria-hidden="true">&laquo;</span>
      </a>
    </li>
  `;

  // numéros de page
  for (let i = 1; i <= totalPages; i++) {
    // je n'affiche pas toutes les pages si y en a trop
    if (totalPages > 7) {
      if (i !== 1 && i !== totalPages && Math.abs(i - pageCourante) > 1) {
        if (i === 2 || i === totalPages - 1) {
          html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        continue;
      }
    }

    html += `
      <li class="page-item ${i === pageCourante ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}" ${i === pageCourante ? 'aria-current="page"' : ''}>
          ${i}
        </a>
      </li>
    `;
  }

  // bouton suivant
  html += `
    <li class="page-item ${pageCourante === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${pageCourante + 1}" aria-label="Page suivante">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>
  `;

  paginationUl.innerHTML = html;
}

// ---- gestion clic pagination ----
function initPagination() {
  document.getElementById('pagination').addEventListener('click', function(e) {
    e.preventDefault();

    const link = e.target.closest('a[data-page]');
    if (!link) return;

    const page = parseInt(link.dataset.page);
    const totalPages = Math.ceil(menusFiltres.length / MENUS_PAR_PAGE);

    if (page < 1 || page > totalPages) return;

    pageCourante = page;
    afficherMenus();

    // scroll vers le haut de la grille
    document.getElementById('menus-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// ---- gestion du slider de prix ----
function initSliderPrix() {
  const slider = document.getElementById('prix-max');
  const valueDisplay = document.getElementById('prix-max-value');

  slider.addEventListener('input', function() {
    valueDisplay.textContent = this.value + ' €';
  });
}

// ---- gestion des checkboxes "Tous" ----
function initCheckboxTous() {
  // pour les thèmes
  const themeTous = document.getElementById('theme-tous');
  const themesAutres = document.querySelectorAll('input[name="theme"]:not(#theme-tous)');

  themeTous.addEventListener('change', function() {
    if (this.checked) {
      themesAutres.forEach(cb => cb.checked = false);
    }
  });

  themesAutres.forEach(function(cb) {
    cb.addEventListener('change', function() {
      if (this.checked) {
        themeTous.checked = false;
      }
      // si aucun n'est coché, on recoche "Tous"
      const auMoinsUnCoche = Array.from(themesAutres).some(c => c.checked);
      if (!auMoinsUnCoche) {
        themeTous.checked = true;
      }
    });
  });

  // pareil pour les régimes
  const regimeTous = document.getElementById('regime-tous');
  const regimesAutres = document.querySelectorAll('input[name="regime"]:not(#regime-tous)');

  regimeTous.addEventListener('change', function() {
    if (this.checked) {
      regimesAutres.forEach(cb => cb.checked = false);
    }
  });

  regimesAutres.forEach(function(cb) {
    cb.addEventListener('change', function() {
      if (this.checked) {
        regimeTous.checked = false;
      }
      const auMoinsUnCoche = Array.from(regimesAutres).some(c => c.checked);
      if (!auMoinsUnCoche) {
        regimeTous.checked = true;
      }
    });
  });
}

// ---- réinitialiser les filtres ----
function reinitialiserFiltres() {
  document.getElementById('recherche').value = '';
  document.getElementById('prix-max').value = 100;
  document.getElementById('prix-max-value').textContent = '100 €';
  document.getElementById('nb-personnes').value = '';
  document.getElementById('tri').value = 'populaire';

  // reset checkboxes
  document.getElementById('theme-tous').checked = true;
  document.querySelectorAll('input[name="theme"]:not(#theme-tous)').forEach(cb => cb.checked = false);
  document.getElementById('regime-tous').checked = true;
  document.querySelectorAll('input[name="regime"]:not(#regime-tous)').forEach(cb => cb.checked = false);

  appliquerFiltres();
  console.log('filtres réinitialisés');
}

// ---- initialisation ----
document.addEventListener('DOMContentLoaded', async function() {
  console.log('--- initialisation menus.js ---');

  // 1. charger les menus
  await chargerMenus();

  // 2. init slider prix
  initSliderPrix();

  // 3. init checkboxes "Tous"
  initCheckboxTous();

  // 4. init pagination
  initPagination();

  // 5. événements filtres
  document.getElementById('btn-appliquer-filtres').addEventListener('click', appliquerFiltres);
  document.getElementById('btn-reinitialiser').addEventListener('click', reinitialiserFiltres);
  document.getElementById('btn-reset-filtres').addEventListener('click', reinitialiserFiltres);

  // 6. recherche en appuyant sur Entrée
  document.getElementById('recherche').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      appliquerFiltres();
    }
  });

  // 7. bouton recherche
  document.getElementById('recherche-btn').addEventListener('click', appliquerFiltres);

  // 8. tri instantané
  document.getElementById('tri').addEventListener('change', appliquerFiltres);

  console.log('menus.js initialisé');
});