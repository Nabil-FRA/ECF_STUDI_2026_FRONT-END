// menu-detail.js
// gestion de la page détail d'un menu

// ── récupérer l'ID du menu dans l'URL ───────────────────────
const params = new URLSearchParams(window.location.search);
const menuId = params.get('id');

// ── éléments du DOM ─────────────────────────────────────────
const etatChargement  = document.getElementById('etat-chargement');
const etatErreur      = document.getElementById('etat-erreur');
const contenuMenu     = document.getElementById('contenu-menu');
const breadcrumbMenu  = document.getElementById('breadcrumb-menu');

// ── au chargement de la page ────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  if (!menuId) {
    afficherErreur();
    return;
  }
  chargerMenu(menuId);
});

// ── charger le menu depuis l'API ────────────────────────────
async function chargerMenu(id) {
  try {
    const menu = await fetchAPI('/menus/' + id);
    afficherMenu(menu);
    chargerMenusSimilaires(menu.theme, menu.id);
  } catch (erreur) {
    console.error('Erreur chargement menu :', erreur);
    afficherErreur();
  }
}

// ── normaliser les champs de l'API ──────────────────────────
function normaliserMenu(menu) {
  // Photo principale : menu.image (legacy) ou images[0].url (API actuelle)
  var imagesPrincipale = menu.image || null;
  if (!imagesPrincipale && menu.images && menu.images.length > 0) {
    imagesPrincipale = menu.images[0].url || null;
  }

  // Miniatures : menu.photos (legacy) ou images[].url (API actuelle)
  var photosList = [];
  if (menu.photos && menu.photos.length > 0) {
    photosList = menu.photos;
  } else if (menu.images && menu.images.length > 0) {
    photosList = menu.images.map(function(img) { return img.url; });
  }

  // Composition : menu.composition (legacy) ou plats[] groupés (API actuelle)
  var compositionData = menu.composition || null;
  if (!compositionData && menu.plats && menu.plats.length > 0) {
    // Regrouper tous les plats sous une seule catégorie "Plats du menu"
    compositionData = {
      'Plats du menu': menu.plats.map(function(p) {
        return {
          nom: p.titre || p.titre_plat || '',
          description: p.description || '',
          allergenes: p.allergenes || []
        };
      })
    };
  }

  // Allergènes : depuis menu.allergenes (legacy) ou extraits de chaque plat
  var allergenesList = [];
  if (menu.allergenes && menu.allergenes.length > 0) {
    allergenesList = menu.allergenes;
  } else if (menu.plats && menu.plats.length > 0) {
    var vus = {};
    menu.plats.forEach(function(plat) {
      (plat.allergenes || []).forEach(function(a) {
        var lib = a.libelle || a;
        if (lib && !vus[lib]) {
          vus[lib] = true;
          allergenesList.push(lib);
        }
      });
    });
  }

  return {
    id:            menu.id,
    titre:         menu.titre || menu.nom || '',
    description:   menu.description || menu.description_courte || '',
    prix:          menu.prix_par_personne || menu.prix || 0,
    nbConvivesMin: menu.nombre_personne_minimum || menu.nbConvivesMin || 0,
    stock:         (menu.quantite_restante !== undefined) ? menu.quantite_restante : menu.stock,
    theme:         (menu.theme && menu.theme.libelle) ? menu.theme.libelle : (menu.theme || ''),
    regime:        (menu.regime && menu.regime.libelle) ? menu.regime.libelle : (menu.regime || ''),
    image:         imagesPrincipale,
    photos:        photosList,
    allergenes:    allergenesList,
    composition:   compositionData,
    conditions:    menu.conditions || null,
    duree:         menu.duree || null
  };
}

// ── afficher le menu dans la page ───────────────────────────
function afficherMenu(menuBrut) {
  const menu = normaliserMenu(menuBrut);

  // cacher le chargement, montrer le contenu
  etatChargement.classList.add('d-none');
  contenuMenu.classList.remove('d-none');

  // titre de la page
  document.title = menu.titre + ' — Vite & Gourmand';
  if (breadcrumbMenu) breadcrumbMenu.textContent = menu.titre;

  // image principale
  const imgMain = document.getElementById('menu-img-main');
  if (imgMain) {
    imgMain.src = menu.image || '../images/menu-placeholder.svg';
    imgMain.alt = 'Photo du menu ' + menu.titre;
  }

  // miniatures (si plusieurs photos)
  if (menu.photos && menu.photos.length > 1) {
    const thumbnailsDiv = document.getElementById('menu-thumbnails');
    if (thumbnailsDiv) {
      thumbnailsDiv.classList.remove('d-none');
      thumbnailsDiv.innerHTML = '';

      menu.photos.forEach(function(photo, index) {
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'menu-thumb' + (index === 0 ? ' active' : '');
        thumb.setAttribute('aria-label', 'Voir photo ' + (index + 1));
        thumb.innerHTML = '<img src="' + photo + '" alt="Photo ' + (index + 1) + ' du menu ' + menu.titre + '">';

        thumb.addEventListener('click', function() {
          imgMain.src = photo;
          imgMain.alt = 'Photo ' + (index + 1) + ' du menu ' + menu.titre;
          document.querySelectorAll('.menu-thumb').forEach(function(t) {
            t.classList.remove('active');
          });
          thumb.classList.add('active');
        });

        thumbnailsDiv.appendChild(thumb);
      });
    }
  }

  // titre
  var titreEl = document.getElementById('menu-titre');
  if (titreEl) titreEl.textContent = menu.titre;

  // badges
  const badgesDiv = document.getElementById('menu-badges');
  if (badgesDiv) {
    badgesDiv.innerHTML = '';
    if (menu.theme) {
      badgesDiv.innerHTML += '<span class="badge bg-primary me-1">' + menu.theme + '</span>';
    }
    if (menu.regime && menu.regime !== 'Classique') {
      badgesDiv.innerHTML += '<span class="badge bg-success me-1">' + menu.regime + '</span>';
    }
  }

  // description
  var descEl = document.getElementById('menu-description');
  if (descEl) descEl.textContent = menu.description;

  // prix
  var prixEl = document.getElementById('menu-prix');
  if (prixEl) prixEl.textContent = Number(menu.prix).toFixed(2) + ' €';

  // convives
  var convivesEl = document.getElementById('menu-convives');
  if (convivesEl) {
    convivesEl.textContent = 'Minimum ' + menu.nbConvivesMin + ' personnes';
  }

  // stock
  afficherStock(menu.stock);

  // durée (si dispo)
  var blocDuree = document.getElementById('bloc-duree');
  if (menu.duree) {
    var dureeEl = document.getElementById('menu-duree');
    if (dureeEl) dureeEl.textContent = menu.duree;
  } else if (blocDuree) {
    blocDuree.classList.add('d-none');
  }

  // allergènes
  if (menu.allergenes && menu.allergenes.length > 0) {
    var allergenesEl = document.getElementById('menu-allergenes');
    if (allergenesEl) allergenesEl.textContent = menu.allergenes.join(', ');
  }

  // bouton commander → lien vers commande.html?menu=ID
  const btnCommander = document.getElementById('btn-commander');
  if (btnCommander) btnCommander.href = 'commande.html?menu=' + menu.id;

  // composition du menu (onglets)
  if (menu.composition) {
    afficherComposition(menu.composition);
  }
}

// ── afficher le stock ───────────────────────────────────────
function afficherStock(stock) {
  const stockSpan = document.getElementById('menu-stock');
  const btnCommander = document.getElementById('btn-commander');
  const alerteRupture = document.getElementById('alerte-rupture');

  if (stock === undefined || stock === null) {
    if (stockSpan) stockSpan.innerHTML = '<span class="text-success">Disponible</span>';
    return;
  }

  if (stock <= 0) {
    if (stockSpan) stockSpan.innerHTML = '<span class="text-danger fw-bold">Rupture de stock</span>';
    if (btnCommander) {
      btnCommander.classList.add('disabled');
      btnCommander.setAttribute('aria-disabled', 'true');
      btnCommander.removeAttribute('href');
    }
    if (alerteRupture) alerteRupture.classList.remove('d-none');
  } else if (stock <= 3) {
    if (stockSpan) stockSpan.innerHTML = '<span class="text-warning fw-bold">Plus que ' + stock + ' commande(s) !</span>';
  } else {
    if (stockSpan) stockSpan.innerHTML = '<span class="text-success">' + stock + ' commande(s) disponible(s)</span>';
  }
}

// ── afficher la composition en onglets ──────────────────────
function afficherComposition(composition) {
  const tabsContainer = document.getElementById('composition-tabs');
  const panelsContainer = document.getElementById('composition-panels');
  if (!tabsContainer || !panelsContainer) return;

  tabsContainer.innerHTML = '';
  panelsContainer.innerHTML = '';

  const categories = Object.keys(composition);

  categories.forEach(function(categorie, index) {
    const tabId    = 'tab-' + index;
    const panelId  = 'panel-' + index;
    const isFirst  = index === 0;

    // ── bouton onglet ──
    const tabBtn = document.createElement('button');
    tabBtn.className = 'btn composition-tab-btn ' + (isFirst ? 'active' : '') + ' me-2 mb-2';
    tabBtn.id = tabId;
    tabBtn.setAttribute('role', 'tab');
    tabBtn.setAttribute('aria-controls', panelId);
    tabBtn.setAttribute('aria-selected', isFirst ? 'true' : 'false');
    tabBtn.textContent = categorie;

    tabBtn.addEventListener('click', function() {
      tabsContainer.querySelectorAll('[role="tab"]').forEach(function(t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panelsContainer.querySelectorAll('[role="tabpanel"]').forEach(function(p) {
        p.classList.add('d-none');
      });
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
      document.getElementById(panelId).classList.remove('d-none');
    });

    tabsContainer.appendChild(tabBtn);

    // ── panneau ──
    const panel = document.createElement('div');
    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.className = 'composition-panel' + (isFirst ? '' : ' d-none');

    const grid = document.createElement('div');
    grid.className = 'plats-grid';

    composition[categorie].forEach(function(plat, i) {
      const nomPlat = typeof plat === 'object' ? (plat.nom || '') : String(plat);
      const desc    = typeof plat === 'object' ? (plat.description || '') : '';
      const allergenes = (typeof plat === 'object' && plat.allergenes) ? plat.allergenes : [];

      const card = document.createElement('div');
      card.className = 'plat-card';

      // Numéro
      const num = document.createElement('span');
      num.className = 'plat-numero';
      num.textContent = String(i + 1).padStart(2, '0');

      // Contenu
      const content = document.createElement('div');
      content.className = 'plat-content';

      const titre = document.createElement('span');
      titre.className = 'plat-nom';
      titre.textContent = nomPlat;
      content.appendChild(titre);

      if (desc) {
        const description = document.createElement('span');
        description.className = 'plat-desc';
        description.textContent = desc;
        content.appendChild(description);
      }

      if (allergenes.length > 0) {
        const badgesDiv = document.createElement('div');
        badgesDiv.className = 'plat-allergenes';
        allergenes.forEach(function(a) {
          const badge = document.createElement('span');
          badge.className = 'plat-allergene-badge';
          badge.textContent = a.libelle || a;
          badgesDiv.appendChild(badge);
        });
        content.appendChild(badgesDiv);
      }

      // Icône décorative
      const icon = document.createElement('i');
      icon.className = 'bi bi-cup-hot plat-icon';
      icon.setAttribute('aria-hidden', 'true');

      card.appendChild(num);
      card.appendChild(content);
      card.appendChild(icon);
      grid.appendChild(card);
    });

    panel.appendChild(grid);
    panelsContainer.appendChild(panel);
  });
}

// ── charger les menus similaires ────────────────────────────
async function chargerMenusSimilaires(themeObj, idActuel) {
  try {
    var themeLibelle = (themeObj && themeObj.libelle) ? themeObj.libelle : (themeObj || '');
    if (!themeLibelle) return;

    const menus = await fetchAPI('/menus?theme=' + encodeURIComponent(themeLibelle) + '&limit=4');
    const data = Array.isArray(menus) ? menus : (menus.menus || []);

    const similaires = data
      .filter(function(m) { return m.id !== idActuel; })
      .slice(0, 3);

    afficherMenusSimilaires(similaires);
  } catch (erreur) {
    console.error('Erreur menus similaires :', erreur);
    var section = document.querySelector('.menus-similaires');
    if (section) section.classList.add('d-none');
  }
}

// ── afficher les cards des menus similaires ──────────────────
function afficherMenusSimilaires(menus) {
  const grille = document.getElementById('grille-similaires');
  const section = document.querySelector('.menus-similaires');

  if (!menus || menus.length === 0) {
    if (section) section.classList.add('d-none');
    return;
  }

  if (!grille) return;
  grille.innerHTML = '';

  menus.forEach(function(menuBrut) {
    var menu = normaliserMenu(menuBrut);
    const col = document.createElement('div');
    col.className = 'col-md-4';

    col.innerHTML =
      '<div class="card h-100 menu-card">' +
        '<img src="' + (menu.image || '../images/menu-placeholder.svg') + '" ' +
             'class="card-img-top" ' +
             'alt="Photo du menu ' + menu.titre + '">' +
        '<div class="card-body d-flex flex-column">' +
          '<h3 class="card-title h6">' + menu.titre + '</h3>' +
          '<p class="card-text small text-muted flex-grow-1">' +
            (menu.description ? menu.description.substring(0, 80) + '...' : '') +
          '</p>' +
          '<div class="d-flex justify-content-between align-items-center">' +
            '<span class="fw-bold prix">' + Number(menu.prix).toFixed(2) + ' €/pers</span>' +
            '<a href="menu-detail.html?id=' + menu.id + '" class="btn btn-sm btn-outline-primary">' +
              'Voir' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    grille.appendChild(col);
  });
}

// ── afficher l'erreur ───────────────────────────────────────
function afficherErreur() {
  if (etatChargement) etatChargement.classList.add('d-none');
  if (etatErreur) etatErreur.classList.remove('d-none');
  document.title = 'Menu introuvable — Vite & Gourmand';
}
