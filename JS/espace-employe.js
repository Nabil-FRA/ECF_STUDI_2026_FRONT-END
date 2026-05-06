// espace-employe.js
// Gestion complète de l'espace employé
// Corrigé : utilise fetchAPI() et getUtilisateurConnecte() au lieu de fetch/localStorage direct
// Corrigé : tous les statuts de commande (en cours de livraison, retour matériel, terminée)
// Corrigé : CRUD menus + gestion horaires + validation/refus des avis

var toutesLesCommandes = [];
var tousLesMenusEmp = [];
var tousLesAvis = [];

// ── échapper le HTML ────────────────────────────────────────
function echapper(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ══════════════════════════════════════════════════════════════
// INITIALISATION
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  console.log('--- initialisation espace-employe.js ---');

  // ── vérifier l'authentification + rôle ────────────────────
  var user = getUtilisateurConnecte();

  if (!user) {
    window.location.href = 'connexion.html';
    return;
  }

  // L'API retourne role = 'employe' ou 'administrateur'
  if (user.role !== 'employe' && user.role !== 'administrateur' && user.role !== 'admin') {
    alert('Accès non autorisé.');
    window.location.href = '../index.html';
    return;
  }

  // ── date du jour par défaut ───────────────────────────────
  var dateInput = document.getElementById('filtre-date');
  var aujourdhui = new Date().toISOString().split('T')[0];
  dateInput.value = aujourdhui;

  // charger les commandes du jour
  chargerCommandes(aujourdhui);

  // ── filtres commandes ─────────────────────────────────────
  document.getElementById('filtre-statut').addEventListener('change', filtrerCommandes);
  dateInput.addEventListener('change', function() {
    chargerCommandes(dateInput.value);
  });

  // filtre par nom/email client
  var filtreClient = document.getElementById('filtre-client');
  var filtreClientTimer = null;
  if (filtreClient) {
    filtreClient.addEventListener('input', function() {
      clearTimeout(filtreClientTimer);
      filtreClientTimer = setTimeout(filtrerCommandes, 300);
    });
  }

  // ── déconnexion ───────────────────────────────────────────
  document.getElementById('btn-deconnexion').addEventListener('click', function() {
    deconnexion();
    window.location.href = 'connexion.html';
  });

  // ── onglet Menus : charger au premier clic ────────────────
  document.getElementById('tab-menus').addEventListener('click', function() {
    if (tousLesMenusEmp.length === 0) {
      chargerMenusEmploye();
    }
  });

  // ── onglet Horaires : charger au premier clic ─────────────
  document.getElementById('tab-horaires').addEventListener('click', function() {
    chargerHoraires();
  });

  // ── onglet Avis : charger au premier clic ─────────────────
  document.getElementById('tab-avis').addEventListener('click', function() {
    if (tousLesAvis.length === 0) {
      chargerAvis();
    }
  });

  // ── sauvegarder un menu ───────────────────────────────────
  document.getElementById('btn-sauvegarder-menu-emp').addEventListener('click', sauvegarderMenuEmploye);

  // ── ajouter une image / un plat ───────────────────────────
  document.getElementById('emp-btn-ajouter-image').addEventListener('click', ajouterImageMenuEmp);
  document.getElementById('emp-btn-ajouter-plat').addEventListener('click', ajouterPlatMenuEmp);

  // charger les allergènes
  chargerAllergenesEmp();

  // ── confirmer annulation ──────────────────────────────────
  document.getElementById('btn-confirmer-annulation').addEventListener('click', confirmerAnnulation);

  // ── formulaire horaires ───────────────────────────────────
  document.getElementById('form-horaires').addEventListener('submit', sauvegarderHoraires);

  // reset modal menu quand on ouvre en mode "nouveau"
  var modalMenuEmp = document.getElementById('modal-menu-emp');
  if (modalMenuEmp) {
    modalMenuEmp.addEventListener('show.bs.modal', function(e) {
      if (e.relatedTarget && e.relatedTarget.textContent.includes('Nouveau')) {
        document.getElementById('modal-menu-emp-titre').textContent = 'Nouveau menu';
        document.getElementById('form-menu-emp').reset();
        document.getElementById('emp-menu-id').value = '';
        document.getElementById('emp-section-plats').style.display = 'none';
        document.getElementById('emp-section-galerie').style.display = 'none';
      }
    });
  }

  console.log('espace-employe.js initialisé');
});


// ══════════════════════════════════════════════════════════════
// COMMANDES
// ══════════════════════════════════════════════════════════════

async function chargerCommandes(date) {
  var chargement = document.getElementById('commandes-chargement');
  var vide = document.getElementById('commandes-vide');
  var body = document.getElementById('commandes-body');

  chargement.classList.remove('d-none');
  vide.classList.add('d-none');
  body.innerHTML = '';

  try {
    var data = await fetchAPI('/employe/commandes');
    toutesLesCommandes = data.commandes || data || [];
    chargement.classList.add('d-none');

    mettreAJourStats(toutesLesCommandes);
    filtrerCommandes();

  } catch (err) {
    console.error('Erreur chargement commandes :', err);
    chargement.innerHTML = '<p class="text-danger">Erreur de chargement. Réessayez.</p>';
  }
}

function filtrerCommandes() {
  var statutFiltre = document.getElementById('filtre-statut').value;
  var clientFiltre = document.getElementById('filtre-client').value.trim().toLowerCase();
  var body = document.getElementById('commandes-body');
  var vide = document.getElementById('commandes-vide');

  var commandesFiltrees = toutesLesCommandes;

  // filtre par statut
  if (statutFiltre !== 'tous') {
    commandesFiltrees = commandesFiltrees.filter(function(cmd) {
      return cmd.statut === statutFiltre;
    });
  }

  // filtre par nom/email client
  if (clientFiltre) {
    commandesFiltrees = commandesFiltrees.filter(function(cmd) {
      var nom = (cmd.clientNom || '').toLowerCase();
      var email = (cmd.clientEmail || '').toLowerCase();
      return nom.includes(clientFiltre) || email.includes(clientFiltre);
    });
  }

  body.innerHTML = '';

  if (commandesFiltrees.length === 0) {
    vide.classList.remove('d-none');
    return;
  }

  vide.classList.add('d-none');

  commandesFiltrees.forEach(function(cmd) {
    var tr = document.createElement('tr');

    // badge statut avec couleur
    var badgeClass = getBadgeClass(cmd.statut);

    // boutons d'action selon le statut — TOUS LES STATUTS DE L'ÉNONCÉ
    var actions = genererBoutonsAction(cmd);

    tr.innerHTML =
      '<td><strong>' + echapper(cmd.numero_commande || cmd.id) + '</strong></td>' +
      '<td>' + echapper(cmd.client_email || '—') + '</td>' +
      '<td>' + echapper(cmd.menu_titre || '—') + '</td>' +
      '<td>' + (cmd.nombre_personne || '—') + '</td>' +
      '<td>' + echapper(cmd.date_prestation || '—') + '</td>' +
      '<td class="small">' + echapper(cmd.lieu_prestation || '—') + '</td>' +
      '<td class="fw-bold">' + (cmd.prix_total ? Number(cmd.prix_total).toFixed(2) + ' €' : '—') + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + echapper(cmd.statut) + '</span></td>' +
      '<td>' + actions + '</td>';

    body.appendChild(tr);
  });
}

function getBadgeClass(statut) {
  var classes = {
    'en cours': 'bg-warning text-dark',
    'accepté': 'bg-success',
    'en préparation': 'bg-info',
    'en cours de livraison': 'bg-primary',
    'livré': 'bg-info text-dark',
    'en attente du retour de matériel': 'bg-warning',
    'terminée': 'bg-secondary',
    'annulée': 'bg-danger'
  };
  return classes[statut] || 'bg-secondary';
}

function genererBoutonsAction(cmd) {
  var id = cmd.id;
  var num = echapper(cmd.numero || cmd.id);

  switch (cmd.statut) {

    case 'en cours':
      return '<button class="btn btn-sm btn-success me-1" onclick="changerStatut(\'' + id + '\', \'accepté\')" ' +
        'aria-label="Accepter la commande ' + num + '">' +
        '<i class="bi bi-check-lg" aria-hidden="true"></i></button>' +
        '<button class="btn btn-sm btn-danger" onclick="ouvrirModalAnnulation(\'' + id + '\')" ' +
        'aria-label="Annuler la commande ' + num + '">' +
        '<i class="bi bi-x-lg" aria-hidden="true"></i></button>';

    case 'accepté':
      return '<button class="btn btn-sm btn-info" onclick="changerStatut(\'' + id + '\', \'en préparation\')" ' +
        'aria-label="Mettre en préparation">' +
        '<i class="bi bi-gear" aria-hidden="true"></i></button>';

    case 'en préparation':
      return '<button class="btn btn-sm btn-primary" onclick="changerStatut(\'' + id + '\', \'en cours de livraison\')" ' +
        'aria-label="Passer en livraison">' +
        '<i class="bi bi-truck" aria-hidden="true"></i></button>';

    case 'en cours de livraison':
      return '<button class="btn btn-sm btn-success me-1" onclick="changerStatut(\'' + id + '\', \'livré\')" ' +
        'aria-label="Marquer comme livré">' +
        '<i class="bi bi-check-circle" aria-hidden="true"></i></button>';

    case 'livré':
      // Si matériel prêté → passer en attente retour ; sinon → terminer directement
      if (cmd.pret_materiel) {
        return '<button class="btn btn-sm btn-warning" onclick="changerStatut(\'' + id + '\', \'en attente du retour de matériel\')" ' +
          'aria-label="En attente retour matériel">' +
          '<i class="bi bi-box-seam" aria-hidden="true"></i></button>';
      } else {
        return '<button class="btn btn-sm btn-secondary" onclick="changerStatut(\'' + id + '\', \'terminée\')" ' +
          'aria-label="Terminer la commande">' +
          '<i class="bi bi-check-all" aria-hidden="true"></i></button>';
      }

    case 'en attente du retour de matériel':
      return '<button class="btn btn-sm btn-success" onclick="changerStatut(\'' + id + '\', \'terminée\')" ' +
        'aria-label="Matériel restitué, terminer">' +
        '<i class="bi bi-check-all" aria-hidden="true"></i> Restitué</button>';

    default:
      return '<span class="text-muted small">—</span>';
  }
}

// ── changer le statut d'une commande ────────────────────────
async function changerStatut(commandeId, nouveauStatut) {
  if (!confirm('Changer le statut en "' + nouveauStatut + '" ?')) return;

  try {
    await fetchAPI('/employe/commandes/' + commandeId + '/statut', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: nouveauStatut })
    });

    // mettre à jour localement
    var commande = toutesLesCommandes.find(function(c) { return c.id == commandeId; });
    if (commande) {
      commande.statut = nouveauStatut;
    }

    mettreAJourStats(toutesLesCommandes);
    filtrerCommandes();

    if (typeof afficherToast === 'function') {
      afficherToast('Statut mis à jour : ' + nouveauStatut, 'success');
    }

  } catch (err) {
    alert('Erreur lors de la mise à jour du statut.');
  }
}

// ── modal annulation (avec motif obligatoire) ───────────────
function ouvrirModalAnnulation(commandeId) {
  document.getElementById('annul-cmd-id').value = commandeId;
  document.getElementById('annul-motif').value = '';
  var modal = new bootstrap.Modal(document.getElementById('modal-annulation'));
  modal.show();
}

async function confirmerAnnulation() {
  var commandeId = document.getElementById('annul-cmd-id').value;
  var modeContact = document.getElementById('annul-contact').value;
  var motif = document.getElementById('annul-motif').value.trim();

  if (!motif) {
    alert('Le motif d\'annulation est obligatoire.');
    document.getElementById('annul-motif').focus();
    return;
  }

  try {
    await fetchAPI('/employe/commandes/' + commandeId + '/statut', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statut: 'annulée',
        mode_contact_client: modeContact,
        motif_annulation: motif
      })
    });

    // mettre à jour localement
    var commande = toutesLesCommandes.find(function(c) { return c.id == commandeId; });
    if (commande) {
      commande.statut = 'annulée';
    }

    bootstrap.Modal.getInstance(document.getElementById('modal-annulation')).hide();
    mettreAJourStats(toutesLesCommandes);
    filtrerCommandes();

    if (typeof afficherToast === 'function') {
      afficherToast('Commande annulée.', 'warning');
    }

  } catch (err) {
    alert('Erreur lors de l\'annulation.');
  }
}

// ── stats ───────────────────────────────────────────────────
function mettreAJourStats(commandes) {
  document.getElementById('stat-total').textContent = commandes.length;
  document.getElementById('stat-attente').textContent =
    commandes.filter(function(c) { return c.statut === 'en cours'; }).length;
  document.getElementById('stat-confirmee').textContent =
    commandes.filter(function(c) {
      return c.statut === 'accepté' || c.statut === 'en préparation';
    }).length;
  document.getElementById('stat-livree').textContent =
    commandes.filter(function(c) {
      return c.statut === 'livré' || c.statut === 'terminée';
    }).length;
}


// ══════════════════════════════════════════════════════════════
// MENUS (CRUD — identique à l'admin)
// L'énoncé dit : "Il peut modifier / supprimer les menus, plats"
// ══════════════════════════════════════════════════════════════

async function chargerMenusEmploye() {
  var body = document.getElementById('emp-menus-body');
  var chargement = document.getElementById('emp-menus-chargement');

  try {
    var data = await fetchAPI('/menus');
    tousLesMenusEmp = data.menus || data || [];
    if (chargement) chargement.classList.add('d-none');
    body.innerHTML = '';

    tousLesMenusEmp.forEach(function(menu) {
      var tr = document.createElement('tr');
      var prix = menu.prix_par_personne || menu.prix_base || menu.prix || 0;
      var themeLib = (menu.theme && menu.theme.libelle) ? menu.theme.libelle : (menu.theme || '—');
      var minP = menu.nombre_personne_minimum || menu.nb_personnes_min || '—';
      var stock = (menu.quantite_restante !== undefined) ? menu.quantite_restante : (menu.stock !== undefined ? menu.stock : '—');
      var statutBadge = menu.actif !== false
        ? '<span class="badge bg-success">Actif</span>'
        : '<span class="badge bg-secondary">Inactif</span>';

      tr.innerHTML =
        '<td><strong>' + echapper(menu.titre || menu.nom) + '</strong></td>' +
        '<td>' + echapper(themeLib) + '</td>' +
        '<td>' + Number(prix).toFixed(2) + ' €</td>' +
        '<td>' + minP + '</td>' +
        '<td>' + stock + '</td>' +
        '<td>' + statutBadge + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-outline-primary me-1" ' +
            'onclick="ouvrirModifierMenuEmp(\'' + menu.id + '\')" ' +
            'aria-label="Modifier ' + echapper(menu.titre || menu.nom) + '">' +
            '<i class="bi bi-pencil" aria-hidden="true"></i>' +
          '</button>' +
          '<button class="btn btn-sm btn-outline-danger" ' +
            'onclick="supprimerMenuEmp(\'' + menu.id + '\')" ' +
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

async function ouvrirModifierMenuEmp(menuId) {
  var menuBase = tousLesMenusEmp.find(function(m) { return m.id == menuId; });
  if (!menuBase) return;

  document.getElementById('modal-menu-emp-titre').textContent = 'Modifier le menu';
  document.getElementById('emp-menu-id').value = menuBase.id;
  document.getElementById('emp-menu-nom').value = menuBase.titre || menuBase.nom || '';
  document.getElementById('emp-menu-prix').value = menuBase.prix_par_personne || menuBase.prix_base || menuBase.prix || '';
  document.getElementById('emp-menu-theme').value = (menuBase.theme && menuBase.theme.libelle) ? menuBase.theme.libelle : (menuBase.theme || '');
  document.getElementById('emp-menu-regime').value = (menuBase.regime && menuBase.regime.libelle) ? menuBase.regime.libelle : (menuBase.regime || 'Classique');
  document.getElementById('emp-menu-convives-min').value = menuBase.nombre_personne_minimum || menuBase.nb_personnes_min || '';
  document.getElementById('emp-menu-convives-max').value = menuBase.nombre_personne_maximum || menuBase.nb_personnes_max || '';
  document.getElementById('emp-menu-stock').value = (menuBase.quantite_restante !== undefined) ? menuBase.quantite_restante : (menuBase.stock !== undefined ? menuBase.stock : '');
  document.getElementById('emp-menu-description').value = menuBase.description || '';

  document.getElementById('emp-section-plats').style.display = '';
  document.getElementById('emp-section-galerie').style.display = '';

  var modal = new bootstrap.Modal(document.getElementById('modal-menu-emp'));
  modal.show();

  // Charger le détail complet (plats + images avec IDs)
  try {
    var detail = await fetchAPI('/menus/' + menuId);
    menuBase.plats = detail.plats || [];
    menuBase.images = detail.images || [];
    afficherPlatsEmp(menuBase.plats);
    afficherGalerieEmp(menuBase.images);
  } catch (err) {
    afficherPlatsEmp([]);
    afficherGalerieEmp([]);
  }
}

async function sauvegarderMenuEmploye() {
  var menuId = document.getElementById('emp-menu-id').value;
  var isModif = !!menuId;

  var donnees = {
    titre:                   document.getElementById('emp-menu-nom').value.trim(),
    prix_par_personne:       parseFloat(document.getElementById('emp-menu-prix').value),
    theme:                   document.getElementById('emp-menu-theme').value,
    regime:                  document.getElementById('emp-menu-regime').value,
    nombre_personne_minimum: parseInt(document.getElementById('emp-menu-convives-min').value),
    nombre_personne_maximum: parseInt(document.getElementById('emp-menu-convives-max').value),
    quantite_restante:       parseInt(document.getElementById('emp-menu-stock').value) || 0,
    description:             document.getElementById('emp-menu-description').value.trim()
  };

  if (!donnees.titre || !donnees.prix_par_personne || !donnees.theme) {
    alert('Veuillez remplir les champs obligatoires (nom, prix, thème).');
    return;
  }

  try {
    var url = isModif ? '/admin/menus/' + menuId : '/admin/menus';
    var method = isModif ? 'PUT' : 'POST';

    await fetchAPI(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees)
    });

    bootstrap.Modal.getInstance(document.getElementById('modal-menu-emp')).hide();
    document.getElementById('form-menu-emp').reset();
    document.getElementById('emp-menu-id').value = '';
    chargerMenusEmploye();

    if (typeof afficherToast === 'function') {
      afficherToast(isModif ? 'Menu modifié.' : 'Menu créé.', 'success');
    }

  } catch (err) {
    alert('Erreur lors de l\'enregistrement du menu.');
  }
}

async function supprimerMenuEmp(menuId) {
  if (!confirm('Supprimer ce menu ? Cette action est irréversible.')) return;

  try {
    await fetchAPI('/admin/menus/' + menuId, { method: 'DELETE' });
    chargerMenusEmploye();

    if (typeof afficherToast === 'function') {
      afficherToast('Menu supprimé.', 'warning');
    }
  } catch (err) {
    alert('Erreur lors de la suppression.');
  }
}


// ══════════════════════════════════════════════════════════════
// HORAIRES
// L'énoncé dit : "Il peut modifier / supprimer [...] les horaires"
// ══════════════════════════════════════════════════════════════

var JOURS_HORAIRES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// ── gérer la case "Fermé" pour chaque jour ────────────────────
function initCasesFerme() {
  JOURS_HORAIRES.forEach(function(jour) {
    var caseCheck = document.getElementById('h-' + jour + '-ferme');
    var inputOuv  = document.getElementById('h-' + jour + '-ouverture');
    var inputFerm = document.getElementById('h-' + jour + '-fermeture');
    if (!caseCheck || !inputOuv || !inputFerm) return;

    caseCheck.addEventListener('change', function() {
      inputOuv.disabled  = caseCheck.checked;
      inputFerm.disabled = caseCheck.checked;
    });
    // appliquer l'état initial
    inputOuv.disabled  = caseCheck.checked;
    inputFerm.disabled = caseCheck.checked;
  });
}

async function chargerHoraires() {
  initCasesFerme();

  try {
    var data = await fetchAPI('/horaires');
    var liste = Array.isArray(data) ? data : (data.horaires || []);

    liste.forEach(function(h) {
      var jour = (h.jour || '').toLowerCase();
      var inputOuv  = document.getElementById('h-' + jour + '-ouverture');
      var inputFerm = document.getElementById('h-' + jour + '-fermeture');
      var caseCheck = document.getElementById('h-' + jour + '-ferme');

      if (!inputOuv) return;

      if (!h.heure_ouverture && !h.heure_fermeture) {
        // Fermé
        if (caseCheck) { caseCheck.checked = true; inputOuv.disabled = true; inputFerm.disabled = true; }
      } else {
        if (caseCheck) { caseCheck.checked = false; inputOuv.disabled = false; inputFerm.disabled = false; }
        if (h.heure_ouverture) inputOuv.value  = h.heure_ouverture.substring(0, 5);
        if (h.heure_fermeture) inputFerm.value = h.heure_fermeture.substring(0, 5);
      }
    });

  } catch (err) {
    console.log('Horaires : valeurs par défaut (API indisponible)');
  }
}

async function sauvegarderHoraires(e) {
  e.preventDefault();

  var succes = document.getElementById('horaires-succes');
  var erreur = document.getElementById('horaires-erreur');
  succes.classList.add('d-none');
  erreur.classList.add('d-none');

  var horaires = JOURS_HORAIRES.map(function(jour) {
    var caseCheck = document.getElementById('h-' + jour + '-ferme');
    var ferme = caseCheck && caseCheck.checked;
    var ouverture = ferme ? null : (document.getElementById('h-' + jour + '-ouverture') || {}).value || null;
    var fermeture = ferme ? null : (document.getElementById('h-' + jour + '-fermeture') || {}).value || null;
    return { jour: jour, heure_ouverture: ouverture, heure_fermeture: fermeture };
  });

  try {
    await fetchAPI('/employe/horaires', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(horaires)
    });

    succes.classList.remove('d-none');
    if (typeof afficherToast === 'function') {
      afficherToast('Horaires mis à jour.', 'success');
    }

  } catch (err) {
    erreur.textContent = 'Erreur lors de la sauvegarde des horaires.';
    erreur.classList.remove('d-none');
  }
}


// ══════════════════════════════════════════════════════════════
// AVIS CLIENTS (validation / refus)
// L'énoncé dit : "L'employé peut valider les avis reçus par les
// utilisateurs afin qu'ils soient visibles sur la page d'accueil.
// Il peut également en refuser."
// ══════════════════════════════════════════════════════════════

async function chargerAvis() {
  var body = document.getElementById('avis-body');
  var chargement = document.getElementById('avis-chargement');
  var vide = document.getElementById('avis-vide');
  var table = document.getElementById('table-avis');

  try {
    var data = await fetchAPI('/employe/avis');
    tousLesAvis = data.avis || data || [];
    if (chargement) chargement.classList.add('d-none');

    afficherAvis(tousLesAvis);

  } catch (err) {
    console.error('Erreur avis :', err);
    if (chargement) chargement.innerHTML = '<p class="text-danger">Erreur de chargement.</p>';
  }
}

function afficherAvis(avis) {
  var body = document.getElementById('avis-body');
  var vide = document.getElementById('avis-vide');
  var table = document.getElementById('table-avis');

  body.innerHTML = '';

  if (!avis || avis.length === 0) {
    vide.classList.remove('d-none');
    table.classList.add('d-none');
    return;
  }

  vide.classList.add('d-none');
  table.classList.remove('d-none');

  avis.forEach(function(avisItem) {
    var tr = document.createElement('tr');

    // étoiles
    var etoiles = '';
    var note = avisItem.note || 0;
    for (var i = 0; i < 5; i++) {
      etoiles += i < note ? '★' : '☆';
    }

    // badge statut
    var statutBadge = '';
    if (avisItem.statut === 'en_attente' || avisItem.statut === 'en attente' || avisItem.statut === 'pending') {
      statutBadge = '<span class="badge bg-warning text-dark">En attente</span>';
    } else if (avisItem.statut === 'validé' || avisItem.statut === 'valide' || avisItem.statut === 'approved') {
      statutBadge = '<span class="badge bg-success">Validé</span>';
    } else if (avisItem.statut === 'refusé' || avisItem.statut === 'refuse' || avisItem.statut === 'rejected') {
      statutBadge = '<span class="badge bg-danger">Refusé</span>';
    } else {
      statutBadge = '<span class="badge bg-secondary">' + echapper(avisItem.statut || '—') + '</span>';
    }

    // date
    var dateAvis = avisItem.date
      ? new Date(avisItem.date).toLocaleDateString('fr-FR')
      : '—';

    // boutons d'action (seulement si en attente)
    var actions = '';
    if (avisItem.statut === 'en_attente' || avisItem.statut === 'en attente' || avisItem.statut === 'pending') {
      actions =
        '<button class="btn btn-sm btn-success me-1" onclick="validerAvis(\'' + avisItem.id + '\')" ' +
          'aria-label="Valider l\'avis">' +
          '<i class="bi bi-check-lg" aria-hidden="true"></i>' +
        '</button>' +
        '<button class="btn btn-sm btn-danger" onclick="refuserAvis(\'' + avisItem.id + '\')" ' +
          'aria-label="Refuser l\'avis">' +
          '<i class="bi bi-x-lg" aria-hidden="true"></i>' +
        '</button>';
    } else {
      actions = '<span class="text-muted small">—</span>';
    }

    // commentaire tronqué à 100 chars pour le tableau
    var commentaire = avisItem.description || avisItem.commentaire || avisItem.text || '';
    var commentaireCourt = commentaire.length > 100
      ? commentaire.substring(0, 100) + '…'
      : commentaire;

    var menuTitre = avisItem.menu_titre || avisItem.menuNom || avisItem.commande || '—';

    tr.innerHTML =
      '<td>' + echapper(avisItem.client || avisItem.auteur || avisItem.prenom || '—') + '</td>' +
      '<td class="small">' + echapper(menuTitre) + '</td>' +
      '<td style="color:#b8860b;">' + etoiles + '</td>' +
      '<td class="small">' + echapper(commentaireCourt || '—') + '</td>' +
      '<td class="small">' + echapper(avisItem.commande || '—') + '</td>' +
      '<td>' + statutBadge + '</td>' +
      '<td>' + actions + '</td>';

    body.appendChild(tr);
  });
}

async function validerAvis(avisId) {
  if (!confirm('Valider cet avis ? Il sera visible sur la page d\'accueil.')) return;

  try {
    await fetchAPI('/employe/avis/' + avisId + '/statut', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'validé' })
    });

    // mettre à jour localement
    var avis = tousLesAvis.find(function(a) { return a.id == avisId; });
    if (avis) avis.statut = 'validé';

    afficherAvis(tousLesAvis);

    if (typeof afficherToast === 'function') {
      afficherToast('Avis validé et visible sur la page d\'accueil.', 'success');
    }

  } catch (err) {
    alert('Erreur lors de la validation de l\'avis.');
  }
}

// ══════════════════════════════════════════════════════════════
// GALERIE + PLATS (employé — mêmes endpoints que admin)
// ══════════════════════════════════════════════════════════════

var tousLesAllergenesEmp = [];

async function chargerAllergenesEmp() {
  try {
    var data = await fetchAPI('/allergenes');
    tousLesAllergenesEmp = data.allergenes || data || [];
    var select = document.getElementById('emp-plat-allergenes');
    if (!select) return;
    select.innerHTML = '';
    tousLesAllergenesEmp.forEach(function(a) {
      var opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.libelle;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erreur allergènes :', err);
  }
}

function afficherGalerieEmp(images) {
  var liste = document.getElementById('emp-galerie-liste');
  liste.innerHTML = '';
  if (!images || images.length === 0) {
    liste.innerHTML = '<p class="text-muted small mb-0">Aucune image.</p>';
    return;
  }
  images.forEach(function(img) {
    var url = img.url_image || img.url || img;
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
        'onclick="supprimerImageMenuEmp(' + id + ')" aria-label="Supprimer image">&times;</button>' : '');
    liste.appendChild(div);
  });
}

async function ajouterImageMenuEmp() {
  var menuId = document.getElementById('emp-menu-id').value;
  var url = document.getElementById('emp-menu-image-url').value.trim();
  if (!menuId || !url) return;

  try {
    var data = await fetchAPI('/admin/menus/' + menuId + '/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url_image: url })
    });
    document.getElementById('emp-menu-image-url').value = '';
    var menu = tousLesMenusEmp.find(function(m) { return m.id == menuId; });
    if (menu) {
      if (!menu.images) menu.images = [];
      menu.images.push(data.image || { id: data.id, url_image: url });
      afficherGalerieEmp(menu.images);
    }
  } catch (err) {
    alert('Erreur lors de l\'ajout de l\'image.');
  }
}

async function supprimerImageMenuEmp(imageId) {
  var menuId = document.getElementById('emp-menu-id').value;
  if (!menuId) return;
  try {
    await fetchAPI('/admin/menus/' + menuId + '/images/' + imageId, { method: 'DELETE' });
    var menu = tousLesMenusEmp.find(function(m) { return m.id == menuId; });
    if (menu && menu.images) {
      menu.images = menu.images.filter(function(img) { return img.id != imageId; });
      afficherGalerieEmp(menu.images);
    }
  } catch (err) {
    alert('Erreur lors de la suppression de l\'image.');
  }
}

function afficherPlatsEmp(plats) {
  var liste = document.getElementById('emp-plats-liste');
  liste.innerHTML = '';
  if (!plats || plats.length === 0) {
    liste.innerHTML = '<p class="text-muted small mb-2">Aucun plat.</p>';
    return;
  }
  plats.forEach(function(plat) {
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
      '<button type="button" class="btn btn-sm btn-outline-danger ms-3 flex-shrink-0" ' +
        'onclick="supprimerPlatMenuEmp(' + plat.id + ')" aria-label="Supprimer le plat">' +
        '<i class="bi bi-trash" aria-hidden="true"></i>' +
      '</button>';
    liste.appendChild(div);
  });
}

async function ajouterPlatMenuEmp() {
  var menuId = document.getElementById('emp-menu-id').value;
  var titre = document.getElementById('emp-plat-titre').value.trim();
  if (!menuId || !titre) return;

  var selectAllergenes = document.getElementById('emp-plat-allergenes');
  var allergeneIds = Array.from(selectAllergenes.selectedOptions).map(function(o) { return parseInt(o.value); });

  try {
    var data = await fetchAPI('/admin/menus/' + menuId + '/plats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre_plat: titre, allergenes: allergeneIds })
    });
    document.getElementById('emp-plat-titre').value = '';
    Array.from(selectAllergenes.options).forEach(function(o) { o.selected = false; });
    var menu = tousLesMenusEmp.find(function(m) { return m.id == menuId; });
    if (menu) {
      if (!menu.plats) menu.plats = [];
      menu.plats.push(data.plat);
      afficherPlatsEmp(menu.plats);
    }
  } catch (err) {
    alert('Erreur lors de l\'ajout du plat.');
  }
}

async function supprimerPlatMenuEmp(platId) {
  var menuId = document.getElementById('emp-menu-id').value;
  if (!menuId) return;
  try {
    await fetchAPI('/admin/menus/' + menuId + '/plats/' + platId, { method: 'DELETE' });
    var menu = tousLesMenusEmp.find(function(m) { return m.id == menuId; });
    if (menu && menu.plats) {
      menu.plats = menu.plats.filter(function(p) { return p.id != platId; });
      afficherPlatsEmp(menu.plats);
    }
  } catch (err) {
    alert('Erreur lors de la suppression du plat.');
  }
}

async function refuserAvis(avisId) {
  if (!confirm('Refuser cet avis ? Il ne sera pas affiché.')) return;

  try {
    await fetchAPI('/employe/avis/' + avisId + '/statut', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'refusé' })
    });

    // mettre à jour localement
    var avis = tousLesAvis.find(function(a) { return a.id == avisId; });
    if (avis) avis.statut = 'refusé';

    afficherAvis(tousLesAvis);

    if (typeof afficherToast === 'function') {
      afficherToast('Avis refusé.', 'warning');
    }

  } catch (err) {
    alert('Erreur lors du refus de l\'avis.');
  }
}