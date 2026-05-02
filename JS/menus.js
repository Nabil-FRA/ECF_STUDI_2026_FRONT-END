// menus.js
// gestion de la liste des menus avec filtres
// corrigé : IDs synchronisés avec menus.html
// corrigé : fourchette de prix (min + max)
// corrigé : bouton toggle filtres mobile câblé

// variables globales
var tousLesMenus = [];
var menusFiltres = [];
var pageCourante = 1;
var MENUS_PAR_PAGE = 9; // 3x3 sur desktop

// ---- fonctions utilitaires ----

function echapper(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrix(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant);
}

// ---- chargement des menus ----
async function chargerMenus() {
  var chargement = document.getElementById('menus-chargement');
  var vide = document.getElementById('menus-vide');
  var container = document.getElementById('menus-container');

  chargement.classList.remove('d-none');
  vide.classList.add('d-none');
  container.innerHTML = '';

  try {
    var data = await fetchAPI('/menus');
    // L'API retourne un tableau directement (pas { menus: [] })
    tousLesMenus = Array.isArray(data) ? data : (data.menus || data || []);

    console.log('menus chargés:', tousLesMenus.length);

    // on applique les filtres (au début aucun filtre = tous les menus)
    appliquerFiltres();

  } catch(e) {
    console.error('erreur chargement menus', e);
    chargement.classList.add('d-none');

    // on affiche un toast si la fonction existe
    if (typeof afficherToast === 'function') {
      afficherToast('Impossible de charger les menus.', 'danger');
    }
  }
}

// ---- appliquer les filtres ----
// IDs synchronisés avec menus.html :
//   filtre-recherche, filtre-prix-min, filtre-prix-max,
//   filtre-theme, filtre-regime, filtre-personnes
function appliquerFiltres() {
  console.log('application des filtres...');

  // recherche texte
  var rechercheEl = document.getElementById('filtre-recherche');
  var recherche = rechercheEl ? rechercheEl.value.trim().toLowerCase() : '';

  // fourchette de prix
  var prixMinEl = document.getElementById('filtre-prix-min');
  var prixMaxEl = document.getElementById('filtre-prix-max');
  var prixMin = prixMinEl ? parseInt(prixMinEl.value) : 0;
  var prixMax = prixMaxEl ? parseInt(prixMaxEl.value) : 100;

  // thème (select)
  var themeEl = document.getElementById('filtre-theme');
  var themeChoisi = themeEl ? themeEl.value : '';

  // régime (select)
  var regimeEl = document.getElementById('filtre-regime');
  var regimeChoisi = regimeEl ? regimeEl.value : '';

  // nombre de personnes
  var personnesEl = document.getElementById('filtre-personnes');
  var nbPersonnes = personnesEl ? personnesEl.value : '';

  // on filtre
  menusFiltres = tousLesMenus.filter(function(menu) {
    // filtre recherche (sur le titre et la description)
    if (recherche) {
      var titre = (menu.titre || '').toLowerCase();
      var desc = (menu.description_courte || menu.description || '').toLowerCase();
      if (!titre.includes(recherche) && !desc.includes(recherche)) {
        return false;
      }
    }

    // filtre fourchette de prix (API : prix_par_personne)
    var prixMenu = menu.prix_par_personne || menu.prix_base || 0;
    if (prixMenu < prixMin || prixMenu > prixMax) {
      return false;
    }

    // filtre thème (API : theme.libelle)
    var themeLibelle = (menu.theme && menu.theme.libelle) ? menu.theme.libelle : (menu.theme || '');
    if (themeChoisi && themeLibelle !== themeChoisi) {
      return false;
    }

    // filtre régime (API : regime.libelle)
    var regimeLibelle = (menu.regime && menu.regime.libelle) ? menu.regime.libelle : (menu.regime || '');
    if (regimeChoisi && regimeLibelle !== regimeChoisi) {
      return false;
    }

    // filtre nb personnes (API : nombre_personne_minimum)
    var nbMin = menu.nombre_personne_minimum || menu.nb_personnes_min || 0;
    if (nbPersonnes && nbMin > parseInt(nbPersonnes)) {
      return false;
    }

    return true;
  });

  console.log('menus après filtrage:', menusFiltres.length);

  // retour page 1
  pageCourante = 1;

  // afficher
  afficherMenus();
}

// ---- afficher les menus ----
function afficherMenus() {
  var chargement = document.getElementById('menus-chargement');
  var vide = document.getElementById('menus-vide');
  var container = document.getElementById('menus-container');
  var countEl = document.getElementById('menus-count');

  chargement.classList.add('d-none');

  // compteur de résultats
  if (countEl) {
    countEl.textContent = menusFiltres.length + ' menu' + (menusFiltres.length > 1 ? 's' : '') + ' trouvé' + (menusFiltres.length > 1 ? 's' : '');
  }

  // aucun résultat
  if (menusFiltres.length === 0) {
    vide.classList.remove('d-none');
    container.innerHTML = '';
    return;
  }

  vide.classList.add('d-none');

  // pagination
  var debut = (pageCourante - 1) * MENUS_PAR_PAGE;
  var fin = debut + MENUS_PAR_PAGE;
  var menusPage = menusFiltres.slice(debut, fin);

  // génération HTML
  var html = '';
  menusPage.forEach(function(menu) {
    html += genererCardMenu(menu);
  });

  container.innerHTML = html;
}

// ---- générer une card menu ----
function genererCardMenu(menu) {
  // Normalisation des champs API (prix_par_personne, nombre_personne_minimum, quantite_restante)
  var prixBase      = menu.prix_par_personne || menu.prix_base || 0;
  var nbMin         = menu.nombre_personne_minimum || menu.nb_personnes_min || 0;
  var stock         = (menu.quantite_restante !== undefined) ? menu.quantite_restante : menu.stock;
  var themeLibelle  = (menu.theme && menu.theme.libelle) ? menu.theme.libelle : (menu.theme || '');
  var regimeLibelle = (menu.regime && menu.regime.libelle) ? menu.regime.libelle : (menu.regime || '');
  var description   = menu.description || menu.description_courte || '';

  // badge régime
  var badgeRegime = '';
  var regimeLower = regimeLibelle.toLowerCase();
  if (regimeLower.includes('v') && regimeLower.includes('tarien')) {
    badgeRegime = '<span class="badge bg-success">Végétarien</span>';
  } else if (regimeLower.includes('gan')) {
    badgeRegime = '<span class="badge bg-success">Végan</span>';
  } else if (regimeLower.includes('gluten')) {
    badgeRegime = '<span class="badge bg-info">Sans gluten</span>';
  }

  // badge stock (API : quantite_restante)
  var badgeStock = '';
  if (stock !== undefined && stock !== null && stock <= 0) {
    badgeStock = '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Épuisé</span>';
  } else if (stock !== undefined && stock !== null && stock <= 3) {
    badgeStock = '<span class="badge bg-warning text-dark position-absolute top-0 end-0 m-2">Stock limité</span>';
  }

  var image = menu.image || (menu.images && menu.images[0] && menu.images[0].url) || '../images/placeholder-menu.jpg';

  return '<article class="col-md-6 col-lg-4">' +
    '<div class="card menu-card h-100">' +
      '<div class="menu-card-img-wrapper">' +
        '<img src="' + echapper(image) + '" class="card-img-top menu-card-img" alt="' + echapper(menu.titre) + '" loading="lazy">' +
        badgeStock +
      '</div>' +
      '<div class="card-body d-flex flex-column">' +
        '<div class="menu-card-badges mb-2">' +
          '<span class="badge bg-secondary">' + echapper(themeLibelle) + '</span> ' +
          badgeRegime +
        '</div>' +
        '<h3 class="card-title h5">' + echapper(menu.titre) + '</h3>' +
        '<p class="card-text text-muted small flex-grow-1">' + echapper(description) + '</p>' +
        '<div class="menu-card-meta">' +
          '<span class="menu-card-personnes">' +
            '<i class="bi bi-people" aria-hidden="true"></i> ' +
            nbMin + ' pers. min' +
          '</span>' +
          '<span class="menu-card-prix">' + formatPrix(prixBase) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="card-footer bg-transparent border-0 pt-0">' +
        '<a href="menu-detail.html?id=' + menu.id + '" class="btn btn-primary w-100">Voir le menu</a>' +
      '</div>' +
    '</div>' +
  '</article>';
}

// ---- réinitialiser les filtres ----
function reinitialiserFiltres() {
  var rechercheEl = document.getElementById('filtre-recherche');
  var prixMinEl = document.getElementById('filtre-prix-min');
  var prixMaxEl = document.getElementById('filtre-prix-max');
  var themeEl = document.getElementById('filtre-theme');
  var regimeEl = document.getElementById('filtre-regime');
  var personnesEl = document.getElementById('filtre-personnes');

  if (rechercheEl) rechercheEl.value = '';
  if (prixMinEl) { prixMinEl.value = 0; }
  if (prixMaxEl) { prixMaxEl.value = 100; }
  if (themeEl) themeEl.value = '';
  if (regimeEl) regimeEl.value = '';
  if (personnesEl) personnesEl.value = '';

  // mettre à jour les affichages de prix
  mettreAJourAffichagePrix();

  appliquerFiltres();
  console.log('filtres réinitialisés');
}

// ---- mettre à jour l'affichage des sliders de prix ----
function mettreAJourAffichagePrix() {
  var prixMinEl = document.getElementById('filtre-prix-min');
  var prixMaxEl = document.getElementById('filtre-prix-max');
  var prixMinVal = document.getElementById('prix-min-val');
  var prixMaxVal = document.getElementById('prix-max-val');

  if (prixMinEl && prixMinVal) {
    prixMinVal.textContent = prixMinEl.value + ' €';
  }
  if (prixMaxEl && prixMaxVal) {
    prixMaxVal.textContent = prixMaxEl.value + ' €';
  }
}

// ---- toggle filtres mobile ----
function initToggleFiltres() {
  var btnToggle = document.getElementById('filters-toggle');
  var panneauFiltres = document.getElementById('filters-panel');

  if (!btnToggle || !panneauFiltres) return;

  btnToggle.addEventListener('click', function() {
    var estOuvert = btnToggle.getAttribute('aria-expanded') === 'true';

    if (estOuvert) {
      // on ferme
      panneauFiltres.classList.add('d-none');
      panneauFiltres.classList.remove('d-block');
      btnToggle.setAttribute('aria-expanded', 'false');
      btnToggle.innerHTML = '<i class="bi bi-funnel" aria-hidden="true"></i> Filtres';
    } else {
      // on ouvre
      panneauFiltres.classList.remove('d-none');
      panneauFiltres.classList.add('d-block');
      btnToggle.setAttribute('aria-expanded', 'true');
      btnToggle.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i> Fermer';
    }
  });

  console.log('toggle filtres mobile initialisé');
}

// ---- initialisation ----
document.addEventListener('DOMContentLoaded', async function() {
  console.log('--- initialisation menus.js ---');

  // 1. charger les menus
  await chargerMenus();

  // 2. toggle filtres mobile
  initToggleFiltres();

  // 3. événements sliders prix
  var prixMinEl = document.getElementById('filtre-prix-min');
  var prixMaxEl = document.getElementById('filtre-prix-max');

  if (prixMinEl) {
    prixMinEl.addEventListener('input', function() {
      mettreAJourAffichagePrix();
      // s'assurer que min ne dépasse pas max
      if (prixMaxEl && parseInt(prixMinEl.value) > parseInt(prixMaxEl.value)) {
        prixMaxEl.value = prixMinEl.value;
        mettreAJourAffichagePrix();
      }
    });
    // appliquer les filtres quand on relâche le slider
    prixMinEl.addEventListener('change', appliquerFiltres);
  }

  if (prixMaxEl) {
    prixMaxEl.addEventListener('input', function() {
      mettreAJourAffichagePrix();
      // s'assurer que max ne descend pas sous min
      if (prixMinEl && parseInt(prixMaxEl.value) < parseInt(prixMinEl.value)) {
        prixMinEl.value = prixMaxEl.value;
        mettreAJourAffichagePrix();
      }
    });
    prixMaxEl.addEventListener('change', appliquerFiltres);
  }

  // 4. événements selects (filtrage instantané)
  var themeEl = document.getElementById('filtre-theme');
  var regimeEl = document.getElementById('filtre-regime');

  if (themeEl) themeEl.addEventListener('change', appliquerFiltres);
  if (regimeEl) regimeEl.addEventListener('change', appliquerFiltres);

  // 5. événement nombre de personnes (filtrage à la saisie)
  var personnesEl = document.getElementById('filtre-personnes');
  if (personnesEl) {
    personnesEl.addEventListener('input', appliquerFiltres);
  }

  // 6. recherche texte — filtre en appuyant sur Entrée ou après 300ms de pause
  var rechercheEl = document.getElementById('filtre-recherche');
  var rechercheTimer = null;

  if (rechercheEl) {
    rechercheEl.addEventListener('input', function() {
      clearTimeout(rechercheTimer);
      rechercheTimer = setTimeout(appliquerFiltres, 300);
    });
    rechercheEl.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(rechercheTimer);
        appliquerFiltres();
      }
    });
  }

  // 7. bouton réinitialiser
  var btnReset = document.getElementById('btn-reset-filtres');
  if (btnReset) {
    btnReset.addEventListener('click', reinitialiserFiltres);
  }

  console.log('menus.js initialisé');
});