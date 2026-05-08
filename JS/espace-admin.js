// espace-admin.js
// gestion de l'espace admin
// corrigé : ajout graphique comparaison commandes par menu
// corrigé : ajout calcul chiffre d'affaires par menu avec filtres
// corrigé : ajout création/désactivation compte employé
// corrigé : utilise echapper() pour les injections

var tousLesMenus = [];
var tousLesUtilisateurs = [];
var toutesLesCommandes = [];
var commandesParMenuMongo = []; // données MongoDB pour le graphique

var platsCourantsAdmin  = {}; // cache plats par ID pour l'édition
var platsTempAdmin      = []; // plats en attente (création menu)
var imagesTempAdmin     = []; // images en attente (création menu)
var _editPlatTempIndexAdmin = -1;

/**
 * Ouvre un modal secondaire (imbriqué) par-dessus un modal déjà ouvert.
 * Gère automatiquement le z-index du backdrop Bootstrap 5.
 */
function ouvrirModalSecondaireAdmin(id) {
  var el = document.getElementById(id);
  var modal = new bootstrap.Modal(el, { backdrop: true });
  modal.show();
  el.addEventListener('shown.bs.modal', function handler() {
    el.removeEventListener('shown.bs.modal', handler);
    var backdrops = document.querySelectorAll('.modal-backdrop');
    if (backdrops.length > 1) {
      backdrops[backdrops.length - 1].style.zIndex = '1060';
    }
    el.style.zIndex = '1065';
  });
}

// ── échapper le HTML pour éviter les XSS ────────────────────
function echapper(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', function() {

  // ── vérifier l'authentification + rôle admin ──────────────
  var user = null;
  var token = null;

  if (typeof getUtilisateurConnecte === 'function') {
    user = getUtilisateurConnecte();
    token = localStorage.getItem('token');
  } else {
    user = JSON.parse(localStorage.getItem('user') || 'null');
    token = localStorage.getItem('token');
  }

  // L'API retourne role = 'administrateur'
  if (!user || !token || (user.role !== 'administrateur' && user.role !== 'admin')) {
    alert('Accès réservé aux administrateurs.');
    window.location.href = 'connexion.html';
    return;
  }

  // charger les données
  chargerStats();
  chargerMenus();
  chargerUtilisateurs();

  // ── déconnexion ───────────────────────────────────────────
  document.getElementById('btn-deconnexion').addEventListener('click', function() {
    if (typeof deconnexion === 'function') {
      deconnexion();
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    window.location.href = 'connexion.html';
  });

  // ── sauvegarder un menu (créer ou modifier) ───────────────
  document.getElementById('btn-sauvegarder-menu').addEventListener('click', sauvegarderMenu);

  // ── ajouter une image au menu ─────────────────────────────
  document.getElementById('btn-ajouter-image').addEventListener('click', ajouterImageMenu);

  // ── ajouter un plat au menu ───────────────────────────────
  document.getElementById('btn-ajouter-plat').addEventListener('click', ajouterPlatMenu);

  // ── sauvegarder modification plat ────────────────────────
  document.getElementById('btn-sauvegarder-edit-plat-admin').addEventListener('click', sauvegarderEditPlatAdmin);

  // charger les allergènes disponibles
  chargerAllergenes();

  // ── créer un employé ──────────────────────────────────────
  var btnCreerEmploye = document.getElementById('btn-creer-employe');
  if (btnCreerEmploye) {
    btnCreerEmploye.addEventListener('click', creerEmploye);
  }

  // ── filtre rôle utilisateurs ──────────────────────────────
  document.getElementById('filtre-role').addEventListener('change', filtrerUtilisateurs);

  // ── filtre commandes ──────────────────────────────────────
  document.getElementById('btn-filtrer-commandes').addEventListener('click', chargerToutesCommandes);

  // charger les commandes au clic sur l'onglet
  document.getElementById('tab-commandes').addEventListener('click', function() {
    if (toutesLesCommandes.length === 0) {
      chargerToutesCommandes();
    }
  });

  // charger les stats/graphique au clic sur l'onglet
  document.getElementById('tab-stats').addEventListener('click', function() {
    // petit délai pour que le panneau soit visible avant de dessiner le canvas
    setTimeout(chargerGraphiqueEtCA, 200);
  });
});

// ══════════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════════
async function chargerStats() {
  try {
    var data = await fetchAPI('/admin/stats');
    // Le backend retourne : utilisateurs, nb_menus, chiffre_affaires, commandes_par_menu, menus_list
    var ca    = data.chiffre_affaires || {};
    var total = ca.chiffre_affaires || ca.total || 0;
    var nbCmd = ca.nombre_commandes || ca.nb_commandes || 0;

    // Compteurs MySQL (fiables)
    var nbUtil  = data.utilisateurs !== undefined ? data.utilisateurs : '—';
    var nbMenus = data.nb_menus !== undefined ? data.nb_menus : ((data.menus_list || []).length || '—');

    var elUtil = document.getElementById('stat-utilisateurs');
    var elMenus = document.getElementById('stat-menus');
    var elCmd = document.getElementById('stat-commandes-mois');
    var elCA = document.getElementById('stat-ca-mois');

    if (elUtil) elUtil.textContent = nbUtil;
    if (elMenus) elMenus.textContent = nbMenus;
    if (elCmd) elCmd.textContent = nbCmd;
    if (elCA) elCA.textContent = Number(total).toFixed(2) + ' €';

    // Stocker les données MongoDB pour le graphique
    if (data.commandes_par_menu && data.commandes_par_menu.length > 0) {
      commandesParMenuMongo = data.commandes_par_menu;
    }
  } catch (err) {
    console.error('Erreur stats :', err);
  }
}

// ══════════════════════════════════════════════════════════════
// MENUS
// ══════════════════════════════════════════════════════════════
async function chargerMenus() {
  var body = document.getElementById('menus-body');
  var chargement = document.getElementById('menus-chargement');

  try {
    var data = await fetchAPI('/menus');
    tousLesMenus = data.menus || data || [];
    if (chargement) chargement.classList.add('d-none');
    body.innerHTML = '';

    tousLesMenus.forEach(function(menu) {
      var tr = document.createElement('tr');

      var prix    = menu.prix_par_personne || menu.prix_base || menu.prix || 0;
      var themeLib = (menu.theme && menu.theme.libelle) ? menu.theme.libelle : (menu.theme || '—');
      var stock    = (menu.quantite_restante !== undefined) ? menu.quantite_restante : (menu.stock !== undefined ? menu.stock : '—');
      var minP     = menu.nombre_personne_minimum || menu.nb_personnes_min || '—';

      tr.innerHTML =
        '<td><strong>' + echapper(menu.titre || menu.nom) + '</strong></td>' +
        '<td>' + echapper(themeLib) + '</td>' +
        '<td>' + Number(prix).toFixed(2) + ' €</td>' +
        '<td>' + minP + '</td>' +
        '<td>' + stock + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-outline-primary me-1" ' +
            'onclick="ouvrirModifierMenu(\'' + menu.id + '\')" ' +
            'aria-label="Modifier ' + echapper(menu.titre || menu.nom) + '">' +
            '<i class="bi bi-pencil" aria-hidden="true"></i>' +
          '</button>' +
          '<button class="btn btn-sm btn-outline-danger" ' +
            'onclick="supprimerMenu(\'' + menu.id + '\')" ' +
            'aria-label="Supprimer ' + echapper(menu.titre || menu.nom) + '">' +
            '<i class="bi bi-trash" aria-hidden="true"></i>' +
          '</button>' +
        '</td>';

      body.appendChild(tr);
    });

  } catch (err) {
    console.error('Erreur menus :', err);
    if (chargement) chargement.innerHTML = '<p class="text-danger">Erreur de chargement.</p>';
  }
}

async function ouvrirModifierMenu(menuId) {
  var menuBase = tousLesMenus.find(function(m) { return m.id == menuId; });
  if (!menuBase) return;

  // Pré-remplir avec les données de base pendant le chargement
  document.getElementById('modal-menu-titre').textContent = 'Modifier le menu';
  document.getElementById('menu-id').value = menuBase.id;
  document.getElementById('menu-nom').value = menuBase.titre || menuBase.nom || '';
  document.getElementById('menu-prix').value = menuBase.prix_par_personne || menuBase.prix_base || menuBase.prix || '';
  document.getElementById('menu-theme').value = (menuBase.theme && menuBase.theme.libelle) ? menuBase.theme.libelle : (menuBase.theme || '');
  document.getElementById('menu-regime').value = (menuBase.regime && menuBase.regime.libelle) ? menuBase.regime.libelle : (menuBase.regime || 'Classique');
  document.getElementById('menu-convives-min').value = menuBase.nombre_personne_minimum || menuBase.nb_personnes_min || '';
  document.getElementById('menu-convives-max').value = menuBase.nombre_personne_maximum || menuBase.nb_personnes_max || '';
  document.getElementById('menu-stock').value = (menuBase.quantite_restante !== undefined) ? menuBase.quantite_restante : (menuBase.stock !== undefined ? menuBase.stock : '');
  document.getElementById('menu-description').value = menuBase.description || '';

  document.getElementById('section-plats').style.display = '';
  document.getElementById('section-galerie').style.display = '';

  var modal = new bootstrap.Modal(document.getElementById('modal-menu'));
  modal.show();

  // Charger le détail complet (plats + images avec IDs)
  try {
    var detail = await fetchAPI('/menus/' + menuId);
    // Mettre à jour le cache local
    menuBase.plats = detail.plats || [];
    menuBase.images = detail.images || [];
    afficherPlats(menuBase.plats);
    afficherGalerieImages(menuBase.images);
  } catch (err) {
    afficherPlats([]);
    afficherGalerieImages([]);
  }
}

function afficherGalerieImages(images) {
  var liste = document.getElementById('galerie-liste');
  liste.innerHTML = '';
  if (!images || images.length === 0) {
    liste.innerHTML = '<p class="text-muted small mb-0">Aucune image.</p>';
    return;
  }
  images.forEach(function(img) {
    var url = img.url_image || img.urlImage || img.url || img;
    var id  = img.id || null;
    var div = document.createElement('div');
    div.className = 'position-relative';
    div.style.cssText = 'width:80px;height:60px;';
    div.innerHTML =
      '<img src="' + echapper(url) + '" alt="Image menu" ' +
        'style="width:100%;height:100%;object-fit:cover;border-radius:4px;" ' +
        'onerror="this.src=\'../img/placeholder.jpg\'">' +
      (id ? '<button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 p-0" ' +
        'style="width:18px;height:18px;font-size:10px;line-height:1;" ' +
        'onclick="supprimerImageMenu(' + id + ')" aria-label="Supprimer image">&times;</button>' : '');
    liste.appendChild(div);
  });
}

async function ajouterImageMenu() {
  var menuId = document.getElementById('menu-id').value;
  var url = document.getElementById('menu-image-url').value.trim();
  if (!url) return;

  document.getElementById('menu-image-url').value = '';

  // Mode création : pas encore de menuId → stockage temporaire
  if (!menuId) {
    imagesTempAdmin.push(url);
    afficherGalerieTempAdmin();
    return;
  }

  try {
    var data = await fetchAPI('/admin/menus/' + menuId + '/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url_image: url })
    });
    var menu = tousLesMenus.find(function(m) { return m.id == menuId; });
    if (menu) {
      if (!menu.images) menu.images = [];
      menu.images.push(data.image || { id: data.id, url_image: url });
      afficherGalerieImages(menu.images);
    }
  } catch (err) {
    alert('Erreur lors de l\'ajout de l\'image.');
  }
}

async function supprimerImageMenu(imageId) {
  var menuId = document.getElementById('menu-id').value;
  if (!menuId) return;

  try {
    await fetchAPI('/admin/menus/' + menuId + '/images/' + imageId, { method: 'DELETE' });
    var menu = tousLesMenus.find(function(m) { return m.id == menuId; });
    if (menu && menu.images) {
      menu.images = menu.images.filter(function(img) { return img.id != imageId; });
      afficherGalerieImages(menu.images);
    }
  } catch (err) {
    alert('Erreur lors de la suppression de l\'image.');
  }
}

async function sauvegarderMenu() {
  var menuId = document.getElementById('menu-id').value;
  var isModif = !!menuId;

  var donnees = {
    titre:                    document.getElementById('menu-nom').value.trim(),
    prix_par_personne:        parseFloat(document.getElementById('menu-prix').value),
    theme:                    document.getElementById('menu-theme').value,
    regime:                   document.getElementById('menu-regime').value,
    nombre_personne_minimum:  parseInt(document.getElementById('menu-convives-min').value),
    nombre_personne_maximum:  parseInt(document.getElementById('menu-convives-max').value),
    quantite_restante:        parseInt(document.getElementById('menu-stock').value) || 0,
    description:              document.getElementById('menu-description').value.trim()
  };

  if (!donnees.titre || !donnees.prix_par_personne || !donnees.theme) {
    alert('Veuillez remplir les champs obligatoires.');
    return;
  }

  try {
    var url = isModif ? '/admin/menus/' + menuId : '/admin/menus';
    var method = isModif ? 'PUT' : 'POST';

    var result = await fetchAPI(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees)
    });

    // Si création : envoyer les plats et images temporaires
    if (!isModif && result && result.id) {
      var newMenuId = result.id;
      for (var i = 0; i < platsTempAdmin.length; i++) {
        try {
          await fetchAPI('/admin/menus/' + newMenuId + '/plats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titre_plat: platsTempAdmin[i].titre, allergenes: platsTempAdmin[i].allergeneIds })
          });
        } catch (e) { /* continue */ }
      }
      for (var j = 0; j < imagesTempAdmin.length; j++) {
        try {
          await fetchAPI('/admin/menus/' + newMenuId + '/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url_image: imagesTempAdmin[j] })
          });
        } catch (e) { /* continue */ }
      }
      platsTempAdmin  = [];
      imagesTempAdmin = [];
    }

    bootstrap.Modal.getInstance(document.getElementById('modal-menu')).hide();
    document.getElementById('form-menu').reset();
    document.getElementById('menu-id').value = '';
    chargerMenus();
    chargerStats();

  } catch (err) {
    alert('Erreur lors de l\'enregistrement du menu.');
  }
}

async function supprimerMenu(menuId) {
  if (!confirm('Supprimer ce menu ? Cette action est irréversible.')) return;

  try {
    await fetchAPI('/admin/menus/' + menuId, { method: 'DELETE' });
    chargerMenus();
    chargerStats();
  } catch (err) {
    alert('Erreur lors de la suppression.');
  }
}

// reset modal nouveau menu
var modalMenu = document.getElementById('modal-menu');
if (modalMenu) {
  modalMenu.addEventListener('show.bs.modal', function(e) {
    if (e.relatedTarget && e.relatedTarget.textContent.includes('Nouveau')) {
      document.getElementById('modal-menu-titre').textContent = 'Nouveau menu';
      document.getElementById('form-menu').reset();
      document.getElementById('menu-id').value = '';
      platsTempAdmin  = [];
      imagesTempAdmin = [];
      platsCourantsAdmin = {};
      document.getElementById('section-plats').style.display = '';
      document.getElementById('section-galerie').style.display = '';
      afficherPlatsTempAdmin();
      afficherGalerieTempAdmin();
    }
  });
}

// ── allergènes ───────────────────────────────────────────────
var tousLesAllergenes = [];

async function chargerAllergenes() {
  try {
    var data = await fetchAPI('/allergenes');
    tousLesAllergenes = data.allergenes || data || [];
    var select = document.getElementById('plat-allergenes');
    if (!select) return;
    select.innerHTML = '';
    tousLesAllergenes.forEach(function(a) {
      var opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.libelle;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erreur allergènes :', err);
  }
}

function afficherPlats(plats) {
  var liste = document.getElementById('plats-liste');
  liste.innerHTML = '';
  if (!plats || plats.length === 0) {
    liste.innerHTML = '<p class="text-muted small mb-2">Aucun plat.</p>';
    return;
  }
  plats.forEach(function(plat) {
    platsCourantsAdmin[plat.id] = plat;
    var allergenesBadges = (plat.allergenes || []).map(function(a) {
      return '<span class="badge bg-warning text-dark me-1">' + echapper(a.libelle) + '</span>';
    }).join('');
    var div = document.createElement('div');
    div.className = 'd-flex align-items-start justify-content-between border rounded px-3 py-2 mb-2';
    div.innerHTML =
      '<div class="w-100">' +
        '<div class="fw-bold mb-1">' + echapper(plat.titre_plat || plat.titre || plat.titrePlat) + '</div>' +
        '<hr class="my-1">' +
        '<small class="text-muted me-1">Allergènes :</small>' +
        (allergenesBadges ? allergenesBadges : '<small class="text-muted fst-italic">aucun</small>') +
      '</div>' +
      '<div class="d-flex gap-1 ms-3 flex-shrink-0">' +
        '<button type="button" class="btn btn-sm btn-outline-secondary" ' +
          'onclick="ouvrirModalEditPlatAdmin(' + plat.id + ')" aria-label="Modifier le plat">' +
          '<i class="bi bi-pencil" aria-hidden="true"></i>' +
        '</button>' +
        '<button type="button" class="btn btn-sm btn-outline-danger" ' +
          'onclick="supprimerPlatMenu(' + plat.id + ')" aria-label="Supprimer le plat">' +
          '<i class="bi bi-trash" aria-hidden="true"></i>' +
        '</button>' +
      '</div>';
    liste.appendChild(div);
  });
}

async function ajouterPlatMenu() {
  var menuId = document.getElementById('menu-id').value;
  var titre = document.getElementById('plat-titre').value.trim();
  if (!titre) return;

  var selectAllergenes = document.getElementById('plat-allergenes');
  var allergeneIds = Array.from(selectAllergenes.selectedOptions).map(function(o) { return parseInt(o.value); });
  var allergeneLibelles = Array.from(selectAllergenes.selectedOptions).map(function(o) { return o.text; });

  document.getElementById('plat-titre').value = '';
  Array.from(selectAllergenes.options).forEach(function(o) { o.selected = false; });

  // Mode création : pas encore de menuId → stockage temporaire
  if (!menuId) {
    platsTempAdmin.push({ titre: titre, allergeneIds: allergeneIds, allergeneLibelles: allergeneLibelles });
    afficherPlatsTempAdmin();
    return;
  }

  try {
    var data = await fetchAPI('/admin/menus/' + menuId + '/plats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre_plat: titre, allergenes: allergeneIds })
    });
    var menu = tousLesMenus.find(function(m) { return m.id == menuId; });
    if (menu) {
      if (!menu.plats) menu.plats = [];
      menu.plats.push(data.plat);
      afficherPlats(menu.plats);
    }
  } catch (err) {
    alert('Erreur lors de l\'ajout du plat.');
  }
}

async function supprimerPlatMenu(platId) {
  var menuId = document.getElementById('menu-id').value;
  if (!menuId) return;

  try {
    await fetchAPI('/admin/menus/' + menuId + '/plats/' + platId, { method: 'DELETE' });
    var menu = tousLesMenus.find(function(m) { return m.id == menuId; });
    if (menu && menu.plats) {
      menu.plats = menu.plats.filter(function(p) { return p.id != platId; });
      afficherPlats(menu.plats);
    }
  } catch (err) {
    alert('Erreur lors de la suppression du plat.');
  }
}

// ── Affichage plats temporaires (mode création) ──────────────
function afficherPlatsTempAdmin() {
  var liste = document.getElementById('plats-liste');
  liste.innerHTML = '';
  if (platsTempAdmin.length === 0) {
    liste.innerHTML = '<p class="text-muted small mb-2">Aucun plat.</p>';
    return;
  }
  platsTempAdmin.forEach(function(plat, index) {
    var badges = plat.allergeneLibelles.map(function(lib) {
      return '<span class="badge bg-warning text-dark me-1">' + echapper(lib) + '</span>';
    }).join('');
    var div = document.createElement('div');
    div.className = 'd-flex align-items-start justify-content-between border rounded px-3 py-2 mb-2';
    div.innerHTML =
      '<div class="w-100">' +
        '<div class="fw-bold mb-1">' + echapper(plat.titre) + '</div>' +
        '<hr class="my-1">' +
        '<small class="text-muted me-1">Allergènes :</small>' +
        (badges || '<small class="text-muted fst-italic">aucun</small>') +
      '</div>' +
      '<div class="d-flex gap-1 ms-3 flex-shrink-0">' +
        '<button type="button" class="btn btn-sm btn-outline-secondary" ' +
          'onclick="ouvrirEditPlatTempAdmin(' + index + ')" aria-label="Modifier">' +
          '<i class="bi bi-pencil" aria-hidden="true"></i>' +
        '</button>' +
        '<button type="button" class="btn btn-sm btn-outline-danger" ' +
          'onclick="supprimerPlatTempAdmin(' + index + ')" aria-label="Supprimer">' +
          '<i class="bi bi-trash" aria-hidden="true"></i>' +
        '</button>' +
      '</div>';
    liste.appendChild(div);
  });
}

function supprimerPlatTempAdmin(index) {
  platsTempAdmin.splice(index, 1);
  afficherPlatsTempAdmin();
}

function ouvrirEditPlatTempAdmin(index) {
  var plat = platsTempAdmin[index];
  if (!plat) return;
  _editPlatTempIndexAdmin = index;
  document.getElementById('admin-edit-plat-id').value      = '';
  document.getElementById('admin-edit-plat-menu-id').value = '';
  document.getElementById('admin-edit-plat-titre').value   = plat.titre;
  var select = document.getElementById('admin-edit-plat-allergenes');
  select.innerHTML = '';
  tousLesAllergenes.forEach(function(a) {
    var opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.libelle;
    opt.selected = plat.allergeneIds.indexOf(a.id) !== -1;
    select.appendChild(opt);
  });
  ouvrirModalSecondaireAdmin('modal-edit-plat-admin');
}

// ── Affichage images temporaires (mode création) ─────────────
function afficherGalerieTempAdmin() {
  var liste = document.getElementById('galerie-liste');
  liste.innerHTML = '';
  if (imagesTempAdmin.length === 0) {
    liste.innerHTML = '<p class="text-muted small mb-0">Aucune image.</p>';
    return;
  }
  imagesTempAdmin.forEach(function(url, index) {
    var div = document.createElement('div');
    div.className = 'position-relative';
    div.style.cssText = 'width:80px;height:60px;';
    div.innerHTML =
      '<img src="' + echapper(url) + '" alt="Image menu" ' +
        'style="width:100%;height:100%;object-fit:cover;border-radius:4px;">' +
      '<button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 p-0" ' +
        'style="width:18px;height:18px;font-size:10px;line-height:1;" ' +
        'onclick="supprimerImageTempAdmin(' + index + ')" aria-label="Supprimer">&times;</button>';
    liste.appendChild(div);
  });
}

function supprimerImageTempAdmin(index) {
  imagesTempAdmin.splice(index, 1);
  afficherGalerieTempAdmin();
}

// ── Ouvrir modal édition plat existant ───────────────────────
function ouvrirModalEditPlatAdmin(platId) {
  var menuId = document.getElementById('menu-id').value;
  var plat   = platsCourantsAdmin[platId];
  if (!plat) { alert('Plat introuvable.'); return; }

  document.getElementById('admin-edit-plat-id').value      = platId;
  document.getElementById('admin-edit-plat-menu-id').value = menuId;
  document.getElementById('admin-edit-plat-titre').value   = plat.titre_plat || plat.titre || '';

  var allergenesActifs = (plat.allergenes || []).map(function(a) { return a.id; });
  var select = document.getElementById('admin-edit-plat-allergenes');
  select.innerHTML = '';
  tousLesAllergenes.forEach(function(a) {
    var opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.libelle;
    opt.selected = allergenesActifs.indexOf(a.id) !== -1;
    select.appendChild(opt);
  });

  ouvrirModalSecondaireAdmin('modal-edit-plat-admin');
}

// ── Sauvegarder modification plat ────────────────────────────
async function sauvegarderEditPlatAdmin() {
  var platId  = document.getElementById('admin-edit-plat-id').value;
  var menuId  = document.getElementById('admin-edit-plat-menu-id').value;
  var titre   = document.getElementById('admin-edit-plat-titre').value.trim();

  if (!titre) {
    alert('Le nom du plat est obligatoire.');
    document.getElementById('admin-edit-plat-titre').focus();
    return;
  }

  var selectAllergenes  = document.getElementById('admin-edit-plat-allergenes');
  var allergeneIds      = Array.from(selectAllergenes.selectedOptions).map(function(o) { return parseInt(o.value); });
  var allergeneLibelles = Array.from(selectAllergenes.selectedOptions).map(function(o) { return o.text; });

  // Mode temp (création menu, plat pas encore en base)
  if (!platId && _editPlatTempIndexAdmin >= 0) {
    platsTempAdmin[_editPlatTempIndexAdmin] = { titre: titre, allergeneIds: allergeneIds, allergeneLibelles: allergeneLibelles };
    _editPlatTempIndexAdmin = -1;
    bootstrap.Modal.getInstance(document.getElementById('modal-edit-plat-admin')).hide();
    afficherPlatsTempAdmin();
    return;
  }

  // Plat existant en base → appel API
  try {
    var result = await fetchAPI('/admin/menus/' + menuId + '/plats/' + platId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre_plat: titre, allergenes: allergeneIds })
    });

    var menu = tousLesMenus.find(function(m) { return m.id == menuId; });
    if (menu && menu.plats) {
      var plat = menu.plats.find(function(p) { return p.id == platId; });
      if (plat && result.plat) {
        plat.titre_plat = result.plat.titre_plat;
        plat.titre      = result.plat.titre_plat;
        plat.allergenes = result.plat.allergenes;
        platsCourantsAdmin[plat.id] = plat;
      }
      afficherPlats(menu.plats);
    }

    bootstrap.Modal.getInstance(document.getElementById('modal-edit-plat-admin')).hide();
    if (typeof afficherToast === 'function') afficherToast('Plat mis à jour.', 'success');

  } catch (err) {
    alert(err.message || 'Erreur lors de la modification du plat.');
  }
}

// ══════════════════════════════════════════════════════════════
// UTILISATEURS
// ══════════════════════════════════════════════════════════════
async function chargerUtilisateurs() {
  var body = document.getElementById('utilisateurs-body');
  var chargement = document.getElementById('utilisateurs-chargement');

  try {
    var data = await fetchAPI('/admin/utilisateurs');
    tousLesUtilisateurs = data.utilisateurs || data || [];
    if (chargement) chargement.classList.add('d-none');
    afficherUtilisateurs(tousLesUtilisateurs);

  } catch (err) {
    console.error('Erreur utilisateurs :', err);
    if (chargement) chargement.innerHTML = '<p class="text-danger">Erreur de chargement.</p>';
  }
}

function afficherUtilisateurs(utilisateurs) {
  var body = document.getElementById('utilisateurs-body');
  body.innerHTML = '';

  utilisateurs.forEach(function(u) {
    var tr = document.createElement('tr');

    // Le backend renvoie role='desactive' pour les comptes désactivés
    var actif = u.role !== 'desactive';

    var roleBadge = '<span class="badge bg-secondary">' + echapper(u.role) + '</span>';
    if (u.role === 'admin' || u.role === 'administrateur') roleBadge = '<span class="badge bg-danger">admin</span>';
    else if (u.role === 'employe') roleBadge = '<span class="badge bg-warning text-dark">employé</span>';
    else if (u.role === 'desactive') roleBadge = '<span class="badge bg-secondary">désactivé</span>';
    else if (u.role === 'utilisateur') roleBadge = '<span class="badge bg-info text-dark">client</span>';

    var statutBadge = actif
      ? '<span class="badge bg-success">Actif</span>'
      : '<span class="badge bg-secondary">Désactivé</span>';

    // bouton désactiver (employés actifs) / réactiver (comptes désactivés)
    var btnDesactiver = '';
    if (u.role === 'employe' || u.role === 'utilisateur') {
      btnDesactiver =
        '<button class="btn btn-warning" ' +
          'onclick="toggleActivation(\'' + u.id + '\', false)" ' +
          'aria-label="Désactiver ' + echapper(u.prenom) + '">' +
          '<i class="bi bi-person-slash me-1" aria-hidden="true"></i>Désactiver' +
        '</button>';
    } else if (u.role === 'desactive') {
      btnDesactiver =
        '<button class="btn btn-success" ' +
          'onclick="toggleActivation(\'' + u.id + '\', true)" ' +
          'aria-label="Réactiver ' + echapper(u.prenom) + '">' +
          '<i class="bi bi-person-check me-1" aria-hidden="true"></i>Réactiver' +
        '</button>';
    }

    tr.innerHTML =
      '<td>' + echapper(u.prenom || '') + ' ' + echapper(u.nom || '') + '</td>' +
      '<td>' + echapper(u.email || '—') + '</td>' +
      '<td>' + roleBadge + '</td>' +
      '<td>' + statutBadge + '</td>' +
      '<td>' +
        btnDesactiver +
      '</td>';

    body.appendChild(tr);
  });
}

function filtrerUtilisateurs() {
  var role = document.getElementById('filtre-role').value;
  if (role === 'tous') {
    afficherUtilisateurs(tousLesUtilisateurs);
  } else if (role === 'employe') {
    // Inclure les comptes désactivés (anciens employés) dans le filtre employés
    afficherUtilisateurs(
      tousLesUtilisateurs.filter(function(u) { return u.role === 'employe' || u.role === 'desactive'; })
    );
  } else {
    afficherUtilisateurs(
      tousLesUtilisateurs.filter(function(u) { return u.role === role; })
    );
  }
}

async function changerRole(userId, nouveauRole) {
  try {
    // Le backend /toggle change le statut actif/désactivé — le changement de rôle
    // nécessite un endpoint dédié non encore implémenté.
    // Pour l'instant, on utilise /toggle pour désactiver/réactiver (comportement le plus proche).
    await fetchAPI('/admin/utilisateurs/' + userId + '/toggle', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nouveauRole })
    });

    var user = tousLesUtilisateurs.find(function(u) { return u.id == userId; });
    if (user) user.role = nouveauRole;

    if (typeof afficherToast === 'function') {
      afficherToast('Rôle mis à jour.', 'success');
    }
  } catch (err) {
    alert('Erreur lors du changement de rôle.');
    chargerUtilisateurs();
  }
}

// ── désactiver / réactiver un compte employé ────────────────
async function toggleActivation(userId, activer) {
  var action = activer ? 'réactiver' : 'désactiver';
  if (!confirm('Voulez-vous ' + action + ' ce compte ?')) return;

  try {
    await fetchAPI('/admin/utilisateurs/' + userId + '/toggle', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: activer })
    });

    var user = tousLesUtilisateurs.find(function(u) { return u.id == userId; });
    if (user) user.role = activer ? 'employe' : 'desactive';

    afficherUtilisateurs(tousLesUtilisateurs);

    if (typeof afficherToast === 'function') {
      afficherToast('Compte ' + (activer ? 'réactivé' : 'désactivé') + '.', 'success');
    }
  } catch (err) {
    alert('Erreur lors de la modification du statut.');
  }
}

// ── créer un compte employé ─────────────────────────────────
async function creerEmploye() {
  var email = document.getElementById('new-employe-email').value.trim();
  var mdp = document.getElementById('new-employe-mdp').value;
  var prenom = document.getElementById('new-employe-prenom').value.trim();
  var nom = document.getElementById('new-employe-nom').value.trim();

  // validation
  if (!email) {
    alert('L\'e-mail est obligatoire.');
    return;
  }

  // validation mdp : 10 chars + majuscule + minuscule + chiffre + spécial
  if (mdp.length < 10) {
    alert('Le mot de passe doit contenir au moins 10 caractères.');
    return;
  }
  if (!/[A-Z]/.test(mdp) || !/[a-z]/.test(mdp) || !/[0-9]/.test(mdp) || !/[^A-Za-z0-9]/.test(mdp)) {
    alert('Le mot de passe doit contenir 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial.');
    return;
  }

  try {
    await fetchAPI('/admin/employes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prenom: prenom,
        nom: nom,
        email: email,
        password: mdp,
        role: 'employe'
      })
    });

    bootstrap.Modal.getInstance(document.getElementById('modal-employe')).hide();
    document.getElementById('form-employe').reset();
    chargerUtilisateurs();
    chargerStats();

    if (typeof afficherToast === 'function') {
      afficherToast('Compte employé créé. Un e-mail de notification sera envoyé.', 'success');
    }

  } catch (err) {
    alert('Erreur lors de la création du compte employé.');
  }
}

// ══════════════════════════════════════════════════════════════
// COMMANDES (toutes)
// ══════════════════════════════════════════════════════════════
async function chargerToutesCommandes() {
  var body = document.getElementById('all-commandes-body');
  var chargement = document.getElementById('all-commandes-chargement');

  var statut = document.getElementById('filtre-statut-admin').value;
  var dateDebut = document.getElementById('filtre-date-debut').value;
  var dateFin = document.getElementById('filtre-date-fin').value;

  var params = [];
  if (statut !== 'tous') params.push('statut=' + encodeURIComponent(statut));
  if (dateDebut) params.push('dateDebut=' + dateDebut);
  if (dateFin) params.push('dateFin=' + dateFin);

  var url = '/admin/commandes' + (params.length ? '?' + params.join('&') : '');

  if (chargement) chargement.classList.remove('d-none');
  body.innerHTML = '';

  try {
    var data = await fetchAPI(url);
    toutesLesCommandes = data.commandes || data || [];
    if (chargement) chargement.classList.add('d-none');

    toutesLesCommandes.forEach(function(cmd) {
      var tr = document.createElement('tr');

      var statutLower = (cmd.statut || '').toLowerCase();
      var badgeClass = 'bg-secondary';
      if (statutLower === 'en cours') badgeClass = 'bg-warning text-dark';
      else if (statutLower === 'accepté') badgeClass = 'bg-success';
      else if (statutLower === 'en préparation') badgeClass = 'bg-info text-dark';
      else if (statutLower === 'en cours de livraison') badgeClass = 'bg-primary';
      else if (statutLower === 'livré') badgeClass = 'bg-info';
      else if (statutLower === 'en attente du retour de matériel') badgeClass = 'bg-warning';
      else if (statutLower === 'terminée') badgeClass = 'bg-primary';
      else if (statutLower === 'annulée') badgeClass = 'bg-danger';

      tr.innerHTML =
        '<td>' + echapper(cmd.numero_commande || cmd.id) + '</td>' +
        '<td>' + (cmd.date_prestation ? new Date(cmd.date_prestation).toLocaleDateString('fr-FR') : '—') + '</td>' +
        '<td>' + echapper(cmd.client_email || '—') + '</td>' +
        '<td>' + echapper((cmd.menu && cmd.menu.titre) || cmd.menu_titre || '—') + '</td>' +
        '<td class="fw-bold">' + (cmd.prix_total ? Number(cmd.prix_total).toFixed(2) + ' €' : '—') + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + echapper(cmd.statut) + '</span></td>';

      body.appendChild(tr);
    });

  } catch (err) {
    console.error('Erreur commandes :', err);
    if (chargement) chargement.innerHTML = '<p class="text-danger">Erreur de chargement.</p>';
  }
}

// ══════════════════════════════════════════════════════════════
// GRAPHIQUE + CHIFFRE D'AFFAIRES (onglet Statistiques)
// ══════════════════════════════════════════════════════════════
var graphiqueInstance = null;

async function chargerGraphiqueEtCA() {
  var container = document.getElementById('graphique-container');
  if (!container) return;

  // on construit le contenu de l'onglet stats
  container.innerHTML =
    '<div class="row g-4">' +
      // graphique comparaison commandes par menu
      '<div class="col-lg-7">' +
        '<div class="card shadow-sm border-0">' +
          '<div class="card-header bg-white border-0 pb-0 pt-3 px-4 d-flex justify-content-between align-items-start">' +
            '<div>' +
              '<h3 class="h6 mb-1 fw-bold" style="color:#b5451b;">' +
                '<i class="bi bi-bar-chart-line me-2" aria-hidden="true"></i>Commandes par menu' +
              '</h3>' +
              '<p class="text-muted small mb-0">Classement par volume de commandes</p>' +
            '</div>' +
            '<span id="chart-total-badge" class="badge rounded-pill" ' +
              'style="background:#b5451b;font-size:0.75rem;padding:6px 12px;">—</span>' +
          '</div>' +
          '<div class="card-body pt-3 pb-4 px-4">' +
            '<div id="chart-wrapper" style="position:relative;width:100%;">' +
              '<canvas id="chart-commandes-menu" aria-label="Graphique commandes par menu" role="img"></canvas>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // calcul CA par menu
      '<div class="col-lg-5">' +
        '<div class="card shadow-sm border-0">' +
          '<div class="card-header bg-white border-0 pb-0 pt-3 px-4">' +
            '<h3 class="h6 mb-1 fw-bold" style="color:#b5451b;">' +
              '<i class="bi bi-currency-euro me-2" aria-hidden="true"></i>Chiffre d\'affaires par menu' +
            '</h3>' +
            '<p class="text-muted small mb-0">Filtrer et calculer le CA</p>' +
          '</div>' +
          '<div class="card-body px-4 pb-4">' +
            '<div class="mb-3">' +
              '<label for="ca-menu-filtre" class="form-label small fw-bold">Menu</label>' +
              '<select id="ca-menu-filtre" class="form-select form-select-sm" aria-label="Filtrer par menu">' +
                '<option value="tous">Tous les menus</option>' +
              '</select>' +
            '</div>' +
            '<div class="row g-2 mb-3">' +
              '<div class="col-6">' +
                '<label for="ca-date-debut" class="form-label small fw-bold">Du</label>' +
                '<input type="date" id="ca-date-debut" class="form-control form-control-sm" aria-label="Date début">' +
              '</div>' +
              '<div class="col-6">' +
                '<label for="ca-date-fin" class="form-label small fw-bold">Au</label>' +
                '<input type="date" id="ca-date-fin" class="form-control form-control-sm" aria-label="Date fin">' +
              '</div>' +
            '</div>' +
            '<button class="btn w-100 mb-3 text-white fw-semibold" style="background:#b5451b;" onclick="calculerCA()">' +
              '<i class="bi bi-calculator me-2" aria-hidden="true"></i>Calculer le CA' +
            '</button>' +
            '<div id="ca-resultat" class="text-center py-3">' +
              '<p class="text-muted small">Cliquez sur "Calculer" pour afficher le chiffre d\'affaires.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  // remplir le select des menus pour le filtre CA
  var selectCA = document.getElementById('ca-menu-filtre');
  if (selectCA && tousLesMenus.length > 0) {
    tousLesMenus.forEach(function(menu) {
      var opt = document.createElement('option');
      opt.value = menu.id;
      opt.textContent = menu.titre || menu.nom;
      selectCA.appendChild(opt);
    });
  }

  // dessiner le graphique
  dessinerGraphique();
}

function dessinerGraphique() {
  var canvas = document.getElementById('chart-commandes-menu');
  if (!canvas) return;

  var couleurs = [
    '#b5451b', '#2d7a3a', '#0d6efd', '#ffc107', '#6f42c1', '#20c997',
    '#fd7e14', '#d63384', '#0dcaf0', '#6c757d'
  ];

  // Priorité 1 : données MongoDB (les plus fiables)
  if (commandesParMenuMongo.length > 0) {
    var labels = commandesParMenuMongo.map(function(d) { return d.menu || 'Inconnu'; });
    var values = commandesParMenuMongo.map(function(d) { return d.count || 0; });
    creerChart(canvas, labels, values, couleurs);
    return;
  }

  // Priorité 2 : commandes chargées depuis /admin/commandes
  if (toutesLesCommandes.length > 0) {
    var commandesParMenu = {};
    toutesLesCommandes.forEach(function(cmd) {
      // champ API : menu_titre (flat) ou menu.titre (objet)
      var nomMenu = cmd.menu_titre || (cmd.menu && cmd.menu.titre) || cmd.menuNom || 'Inconnu';
      if (!commandesParMenu[nomMenu]) {
        commandesParMenu[nomMenu] = 0;
      }
      commandesParMenu[nomMenu]++;
    });

    var labels = Object.keys(commandesParMenu);
    var values = Object.values(commandesParMenu);
    creerChart(canvas, labels, values, couleurs);
    return;
  }

  // Priorité 3 : données de démonstration (aucune donnée disponible)
  var demoData = [
    { menu: 'Menu Noël Tradition', count: 5 },
    { menu: 'Menu Pâques Printanier', count: 3 },
    { menu: 'Menu Classique Bordelais', count: 8 },
    { menu: 'Menu Végétarien Gourmand', count: 2 },
    { menu: 'Menu Événement Prestige', count: 4 },
    { menu: 'Menu Végan Saison', count: 1 }
  ];
  var labels = demoData.map(function(d) { return d.menu; });
  var values = demoData.map(function(d) { return d.count; });
  creerChart(canvas, labels, values, couleurs);
}

function creerChart(canvas, labels, values, couleurs) {
  if (typeof Chart === 'undefined') {
    canvas.parentElement.innerHTML = '<p class="text-danger">Erreur : Chart.js non chargé.</p>';
    return;
  }

  // Trier par valeur décroissante
  var combined = labels.map(function(l, i) { return { label: l, value: values[i] }; });
  combined.sort(function(a, b) { return b.value - a.value; });
  var sortedLabels = combined.map(function(c) { return c.label; });
  var sortedValues = combined.map(function(c) { return c.value; });
  var total = sortedValues.reduce(function(s, v) { return s + v; }, 0);

  // Mettre à jour le badge total
  var totalEl = document.getElementById('chart-total-badge');
  if (totalEl) totalEl.textContent = total + ' commande' + (total > 1 ? 's' : '');

  // Hauteur dynamique selon le nombre de barres
  var wrapper = document.getElementById('chart-wrapper');
  var barH = 40;
  var hauteur = Math.max(200, sortedLabels.length * barH + 60);
  if (wrapper) wrapper.style.height = hauteur + 'px';

  if (graphiqueInstance) graphiqueInstance.destroy();

  var ctx = canvas.getContext('2d');

  // Dégradé horizontal par barre : plus intense pour les 1ers
  var backgroundColors = sortedValues.map(function(_, i) {
    var ratio = 1 - (i / Math.max(sortedValues.length - 1, 1)) * 0.55;
    var r = Math.round(181 * ratio + 220 * (1 - ratio));
    var g = Math.round(69  * ratio + 120 * (1 - ratio));
    var b = Math.round(27  * ratio + 80  * (1 - ratio));
    var grad = ctx.createLinearGradient(0, 0, (canvas.parentElement.offsetWidth || 500), 0);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.95)');
    grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0.35)');
    return grad;
  });

  var borderColors = sortedValues.map(function(_, i) {
    var ratio = 1 - (i / Math.max(sortedValues.length - 1, 1)) * 0.55;
    var r = Math.round(181 * ratio + 220 * (1 - ratio));
    var g = Math.round(69  * ratio + 120 * (1 - ratio));
    var b = Math.round(27  * ratio + 80  * (1 - ratio));
    return 'rgba(' + r + ',' + g + ',' + b + ',0.9)';
  });

  graphiqueInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedLabels,
      datasets: [{
        label: 'Commandes',
        data: sortedValues,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: { left: 3, top: 0, right: 0, bottom: 0 },
        borderRadius: { topRight: 8, bottomRight: 8, topLeft: 0, bottomLeft: 0 },
        borderSkipped: false,
        barThickness: 26
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(20,20,20,0.9)',
          titleColor: '#fff',
          bodyColor: '#e0e0e0',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          callbacks: {
            title: function(items) { return sortedLabels[items[0].dataIndex]; },
            label: function(item) {
              var v = item.raw;
              var pct = total > 0 ? Math.round(v / total * 100) : 0;
              return '  ' + v + ' commande' + (v > 1 ? 's' : '') + '  (' + pct + '%)';
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          suggestedMax: (Math.max.apply(null, sortedValues) || 1) + 1,
          grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
          border: { display: false },
          ticks: {
            stepSize: 1,
            precision: 0,
            font: { size: 11 },
            color: '#9e9e9e'
          }
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            font: { size: 12 },
            color: '#444',
            callback: function(value, index) {
              var l = sortedLabels[index] || '';
              return l.length > 28 ? l.substring(0, 26) + '…' : l;
            }
          }
        }
      },
      layout: { padding: { right: 8, top: 4, bottom: 4 } }
    }
  });
}

// ── calcul du chiffre d'affaires ────────────────────────────
function calculerCA() {
  var menuFiltre = document.getElementById('ca-menu-filtre').value;
  var dateDebut = document.getElementById('ca-date-debut').value;
  var dateFin = document.getElementById('ca-date-fin').value;
  var resultatDiv = document.getElementById('ca-resultat');

  // on utilise les commandes chargées, ou les données mock
  var commandes = toutesLesCommandes.length > 0
    ? toutesLesCommandes
    : getDemoCommandes();

  // filtrer par menu (utiliser menu_titre comme identifiant)
  var filtrees = commandes;
  if (menuFiltre !== 'tous') {
    // menuFiltre peut être un ID (tousLesMenus) ou un titre (demo)
    var menuTrouvePourFiltre = tousLesMenus.find(function(m) { return m.id == menuFiltre; });
    var titreFiltreRecherche = menuTrouvePourFiltre ? (menuTrouvePourFiltre.titre || menuTrouvePourFiltre.nom) : null;

    filtrees = filtrees.filter(function(cmd) {
      var titrCmd = cmd.menu_titre || (cmd.menu && cmd.menu.titre) || cmd.menuNom || '';
      if (titreFiltreRecherche) return titrCmd === titreFiltreRecherche;
      return cmd.menu_id == menuFiltre || cmd.menuId == menuFiltre;
    });
  }

  // filtrer par date (champ date_prestation)
  if (dateDebut) {
    var debut = new Date(dateDebut);
    filtrees = filtrees.filter(function(cmd) {
      return new Date(cmd.date_prestation || cmd.date) >= debut;
    });
  }
  if (dateFin) {
    var fin = new Date(dateFin);
    fin.setHours(23, 59, 59);
    filtrees = filtrees.filter(function(cmd) {
      return new Date(cmd.date_prestation || cmd.date) <= fin;
    });
  }

  // ne compter que les commandes non annulées
  filtrees = filtrees.filter(function(cmd) {
    return cmd.statut !== 'annulée' && cmd.statut !== 'Annulée';
  });

  // calculer le total
  var totalCA = 0;
  var nbCommandes = filtrees.length;
  filtrees.forEach(function(cmd) {
    totalCA += (cmd.prix_total || cmd.total || 0);
  });

  // trouver le nom du menu filtré
  var nomMenu = 'Tous les menus';
  if (menuFiltre !== 'tous') {
    var menuTrouve = tousLesMenus.find(function(m) { return m.id == menuFiltre; });
    if (menuTrouve) nomMenu = menuTrouve.titre || menuTrouve.nom;
  }

  // période
  var periode = '';
  if (dateDebut && dateFin) {
    periode = 'du ' + new Date(dateDebut).toLocaleDateString('fr-FR') +
              ' au ' + new Date(dateFin).toLocaleDateString('fr-FR');
  } else if (dateDebut) {
    periode = 'à partir du ' + new Date(dateDebut).toLocaleDateString('fr-FR');
  } else if (dateFin) {
    periode = 'jusqu\'au ' + new Date(dateFin).toLocaleDateString('fr-FR');
  } else {
    periode = 'toutes périodes';
  }

  resultatDiv.innerHTML =
    '<div class="border rounded p-3 bg-light">' +
      '<p class="small text-muted mb-1">' + echapper(nomMenu) + ' — ' + echapper(periode) + '</p>' +
      '<p class="display-6 fw-bold mb-1" style="color: #b5451b;">' + totalCA.toFixed(2) + ' €</p>' +
      '<p class="small text-muted mb-0">' + nbCommandes + ' commande' + (nbCommandes > 1 ? 's' : '') + '</p>' +
      (nbCommandes > 0
        ? '<p class="small text-muted mb-0">Panier moyen : ' + (totalCA / nbCommandes).toFixed(2) + ' €</p>'
        : '') +
    '</div>';
}

// données de démonstration pour le CA (si pas de commandes chargées)
function getDemoCommandes() {
  return [
    { id: 1, menu_id: 1, menuNom: 'Menu Noël Tradition', date: '2026-01-15', total: 450, statut: 'Terminée' },
    { id: 2, menu_id: 1, menuNom: 'Menu Noël Tradition', date: '2026-01-20', total: 380, statut: 'Terminée' },
    { id: 3, menu_id: 2, menuNom: 'Menu Pâques Printanier', date: '2026-02-10', total: 290, statut: 'Livrée' },
    { id: 4, menu_id: 3, menuNom: 'Menu Classique Bordelais', date: '2026-02-14', total: 175, statut: 'Terminée' },
    { id: 5, menu_id: 3, menuNom: 'Menu Classique Bordelais', date: '2026-03-01', total: 210, statut: 'Confirmée' },
    { id: 6, menu_id: 4, menuNom: 'Menu Végétarien Gourmand', date: '2026-03-05', total: 320, statut: 'En attente' },
    { id: 7, menu_id: 5, menuNom: 'Menu Événement Prestige', date: '2026-03-10', total: 890, statut: 'Terminée' },
    { id: 8, menu_id: 1, menuNom: 'Menu Noël Tradition', date: '2026-03-15', total: 520, statut: 'Annulée' },
    { id: 9, menu_id: 6, menuNom: 'Menu Végan Saison', date: '2026-03-20', total: 195, statut: 'Livrée' },
    { id: 10, menu_id: 3, menuNom: 'Menu Classique Bordelais', date: '2026-04-01', total: 240, statut: 'Terminée' }
  ];
}