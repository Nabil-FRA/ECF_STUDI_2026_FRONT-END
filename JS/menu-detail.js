// menu-detail.js
// gestion de la page détail d'un menu
// fait par moi le 15/04/2026

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
    // TODO: remplacer par la vraie URL de l'API
    const response = await fetch('/api/menus/' + id);

    if (!response.ok) {
      throw new Error('Menu non trouvé');
    }

    const menu = await response.json();
    afficherMenu(menu);

    // charger aussi les menus similaires
    chargerMenusSimilaires(menu.theme, menu.id);

  } catch (erreur) {
    console.error('Erreur chargement menu :', erreur);
    afficherErreur();
  }
}

// ── afficher le menu dans la page ───────────────────────────
function afficherMenu(menu) {
  // cacher le chargement, montrer le contenu
  etatChargement.classList.add('d-none');
  contenuMenu.classList.remove('d-none');

  // titre de la page
  document.title = menu.nom + ' — Vite & Gourmand';
  breadcrumbMenu.textContent = menu.nom;

  // image principale
  const imgMain = document.getElementById('menu-img-main');
  imgMain.src = menu.image || '../images/menu-placeholder.jpg';
  imgMain.alt = 'Photo du menu ' + menu.nom;

  // miniatures (si plusieurs photos)
  if (menu.photos && menu.photos.length > 1) {
    const thumbnailsDiv = document.getElementById('menu-thumbnails');
    thumbnailsDiv.classList.remove('d-none');
    thumbnailsDiv.innerHTML = '';

    menu.photos.forEach(function(photo, index) {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'menu-thumb' + (index === 0 ? ' active' : '');
      thumb.setAttribute('aria-label', 'Voir photo ' + (index + 1));
      thumb.innerHTML = '<img src="' + photo + '" alt="Photo ' + (index + 1) + ' du menu ' + menu.nom + '">';

      // au clic on change l'image principale
      thumb.addEventListener('click', function() {
        imgMain.src = photo;
        imgMain.alt = 'Photo ' + (index + 1) + ' du menu ' + menu.nom;
        // mettre à jour le bouton actif
        document.querySelectorAll('.menu-thumb').forEach(function(t) {
          t.classList.remove('active');
        });
        thumb.classList.add('active');
      });

      thumbnailsDiv.appendChild(thumb);
    });
  }

  // titre
  document.getElementById('menu-titre').textContent = menu.nom;

  // badges
  const badgesDiv = document.getElementById('menu-badges');
  badgesDiv.innerHTML = '';
  // badge thème
  if (menu.theme) {
    badgesDiv.innerHTML += '<span class="badge bg-primary me-1">' + menu.theme + '</span>';
  }
  // badge régime
  if (menu.regime && menu.regime !== 'Classique') {
    badgesDiv.innerHTML += '<span class="badge bg-success me-1">' + menu.regime + '</span>';
  }

  // description
  document.getElementById('menu-description').textContent = menu.description || '';

  // prix
  document.getElementById('menu-prix').textContent = menu.prix.toFixed(2) + ' €';

  // convives
  document.getElementById('menu-convives').textContent =
    'Min ' + menu.nbConvivesMin + ' — Max ' + menu.nbConvivesMax + ' personnes';

  // stock
  afficherStock(menu.stock);

  // durée (si dispo)
  if (menu.duree) {
    document.getElementById('menu-duree').textContent = menu.duree;
  } else {
    document.getElementById('bloc-duree').classList.add('d-none');
  }

  // allergènes
  if (menu.allergenes && menu.allergenes.length > 0) {
    document.getElementById('menu-allergenes').textContent = menu.allergenes.join(', ');
  }

  // bouton commander → lien vers commande.html?menu=ID
  const btnCommander = document.getElementById('btn-commander');
  btnCommander.href = 'commande.html?menu=' + menu.id;

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
    stockSpan.innerHTML = '<span class="text-success">Disponible</span>';
    return;
  }

  if (stock <= 0) {
    // rupture de stock
    stockSpan.innerHTML = '<span class="text-danger fw-bold">Rupture de stock</span>';
    btnCommander.classList.add('disabled');
    btnCommander.setAttribute('aria-disabled', 'true');
    btnCommander.removeAttribute('href');
    alerteRupture.classList.remove('d-none');
  } else if (stock <= 3) {
    // stock faible
    stockSpan.innerHTML = '<span class="text-warning fw-bold">Plus que ' + stock + ' commande(s) !</span>';
  } else {
    // stock ok
    stockSpan.innerHTML = '<span class="text-success">' + stock + ' commande(s) disponible(s)</span>';
  }
}

// ── afficher la composition en onglets ──────────────────────
function afficherComposition(composition) {
  // composition = { "Entrées": [...], "Plats": [...], "Desserts": [...], ... }
  const tabsContainer = document.getElementById('composition-tabs');
  const panelsContainer = document.getElementById('composition-panels');

  tabsContainer.innerHTML = '';
  panelsContainer.innerHTML = '';

  const categories = Object.keys(composition);

  categories.forEach(function(categorie, index) {
    const tabId = 'tab-' + index;
    const panelId = 'panel-' + index;
    const isFirst = index === 0;

    // créer le bouton onglet
    const tabBtn = document.createElement('button');
    tabBtn.className = 'btn ' + (isFirst ? 'btn-primary' : 'btn-outline-primary') + ' me-2 mb-2';
    tabBtn.id = tabId;
    tabBtn.setAttribute('role', 'tab');
    tabBtn.setAttribute('aria-controls', panelId);
    tabBtn.setAttribute('aria-selected', isFirst ? 'true' : 'false');
    tabBtn.textContent = categorie;

    tabBtn.addEventListener('click', function() {
      // désactiver tous les onglets
      tabsContainer.querySelectorAll('[role="tab"]').forEach(function(t) {
        t.classList.remove('btn-primary');
        t.classList.add('btn-outline-primary');
        t.setAttribute('aria-selected', 'false');
      });
      // cacher tous les panneaux
      panelsContainer.querySelectorAll('[role="tabpanel"]').forEach(function(p) {
        p.classList.add('d-none');
      });
      // activer celui cliqué
      tabBtn.classList.remove('btn-outline-primary');
      tabBtn.classList.add('btn-primary');
      tabBtn.setAttribute('aria-selected', 'true');
      document.getElementById(panelId).classList.remove('d-none');
    });

    tabsContainer.appendChild(tabBtn);

    // créer le panneau
    const panel = document.createElement('div');
    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.className = isFirst ? '' : 'd-none';

    // liste des plats de cette catégorie
    const liste = document.createElement('ul');
    liste.className = 'list-group';

    composition[categorie].forEach(function(plat) {
      const li = document.createElement('li');
      li.className = 'list-group-item';

      // si le plat a un nom et une description
      if (typeof plat === 'object') {
        li.innerHTML = '<strong>' + plat.nom + '</strong>';
        if (plat.description) {
          li.innerHTML += '<br><small class="text-muted">' + plat.description + '</small>';
        }
      } else {
        // si c'est juste un string
        li.textContent = plat;
      }

      liste.appendChild(li);
    });

    panel.appendChild(liste);
    panelsContainer.appendChild(panel);
  });
}

// ── charger les menus similaires ────────────────────────────
async function chargerMenusSimilaires(theme, idActuel) {
  try {
    // TODO: remplacer par la vraie URL
    const response = await fetch('/api/menus?theme=' + encodeURIComponent(theme) + '&limit=4');

    if (!response.ok) return;

    const menus = await response.json();

    // filtrer pour enlever le menu actuel et garder max 3
    const similaires = menus
      .filter(function(m) { return m.id !== idActuel; })
      .slice(0, 3);

    afficherMenusSimilaires(similaires);

  } catch (erreur) {
    console.error('Erreur menus similaires :', erreur);
    // c'est pas grave si ça marche pas, on cache la section
    document.querySelector('.menus-similaires').classList.add('d-none');
  }
}

// ── afficher les cards des menus similaires ──────────────────
function afficherMenusSimilaires(menus) {
  const grille = document.getElementById('grille-similaires');

  if (!menus || menus.length === 0) {
    document.querySelector('.menus-similaires').classList.add('d-none');
    return;
  }

  grille.innerHTML = '';

  menus.forEach(function(menu) {
    const col = document.createElement('div');
    col.className = 'col-md-4';

    col.innerHTML =
      '<div class="card h-100 menu-card">' +
        '<img src="' + (menu.image || '../images/menu-placeholder.jpg') + '" ' +
             'class="card-img-top" ' +
             'alt="Photo du menu ' + menu.nom + '">' +
        '<div class="card-body d-flex flex-column">' +
          '<h3 class="card-title h6">' + menu.nom + '</h3>' +
          '<p class="card-text small text-muted flex-grow-1">' +
            (menu.description ? menu.description.substring(0, 80) + '...' : '') +
          '</p>' +
          '<div class="d-flex justify-content-between align-items-center">' +
            '<span class="fw-bold prix">' + menu.prix.toFixed(2) + ' €/pers</span>' +
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
  etatChargement.classList.add('d-none');
  etatErreur.classList.remove('d-none');
  document.title = 'Menu introuvable — Vite & Gourmand';
}