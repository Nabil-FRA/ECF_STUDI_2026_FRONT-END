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
      return '<button class="btn btn-sm btn-secondary me-1" onclick="changerStatut(\'' + id + '\', \'terminée\')" ' +
        'aria-label="Terminer (sans matériel)">' +
        '<i class="bi bi-check-all" aria-hidden="true"></i></button>' +
        '<button class="btn btn-sm btn-warning" onclick="changerStatut(\'' + id + '\', \'en attente du retour de matériel\')" ' +
        'aria-label="En attente retour matériel">' +
        '<i class="bi bi-box-seam" aria-hidden="true"></i></button>';

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
      var prix = menu.prix_base || menu.prix || 0;
      var statutBadge = menu.actif !== false
        ? '<span class="badge bg-success">Actif</span>'
        : '<span class="badge bg-secondary">Inactif</span>';

      tr.innerHTML =
        '<td><strong>' + echapper(menu.titre || menu.nom) + '</strong></td>' +
        '<td>' + echapper(menu.theme || '—') + '</td>' +
        '<td>' + prix.toFixed(2) + ' €</td>' +
        '<td>' + (menu.nb_personnes_min || '—') + ' — ' + (menu.nb_personnes_max || '—') + '</td>' +
        '<td>' + (menu.stock !== undefined ? menu.stock : '—') + '</td>' +
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

function ouvrirModifierMenuEmp(menuId) {
  var menu = tousLesMenusEmp.find(function(m) { return m.id == menuId; });
  if (!menu) return;

  document.getElementById('modal-menu-emp-titre').textContent = 'Modifier le menu';
  document.getElementById('emp-menu-id').value = menu.id;
  document.getElementById('emp-menu-nom').value = menu.titre || menu.nom || '';
  document.getElementById('emp-menu-prix').value = menu.prix_base || menu.prix || '';
  document.getElementById('emp-menu-theme').value = menu.theme || '';
  document.getElementById('emp-menu-regime').value = menu.regime || 'classique';
  document.getElementById('emp-menu-convives-min').value = menu.nb_personnes_min || '';
  document.getElementById('emp-menu-convives-max').value = menu.nb_personnes_max || '';
  document.getElementById('emp-menu-stock').value = menu.stock !== undefined ? menu.stock : '';
  document.getElementById('emp-menu-description').value = menu.description || '';

  var modal = new bootstrap.Modal(document.getElementById('modal-menu-emp'));
  modal.show();
}

async function sauvegarderMenuEmploye() {
  var menuId = document.getElementById('emp-menu-id').value;
  var isModif = !!menuId;

  var donnees = {
    titre: document.getElementById('emp-menu-nom').value.trim(),
    prix_base: parseFloat(document.getElementById('emp-menu-prix').value),
    theme: document.getElementById('emp-menu-theme').value,
    regime: document.getElementById('emp-menu-regime').value,
    nb_personnes_min: parseInt(document.getElementById('emp-menu-convives-min').value),
    nb_personnes_max: parseInt(document.getElementById('emp-menu-convives-max').value),
    stock: parseInt(document.getElementById('emp-menu-stock').value) || 0,
    description: document.getElementById('emp-menu-description').value.trim()
  };

  if (!donnees.titre || !donnees.prix_base || !donnees.theme) {
    alert('Veuillez remplir les champs obligatoires (nom, prix, thème).');
    return;
  }

  try {
    var url = isModif ? '/menus/' + menuId : '/menus';
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
    await fetchAPI('/menus/' + menuId, { method: 'DELETE' });
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

async function chargerHoraires() {
  try {
    var data = await fetchAPI('/horaires');
    var horaires = data.horaires || data || {};

    var jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    jours.forEach(function(jour) {
      var input = document.getElementById('h-' + jour);
      if (input && horaires[jour]) {
        input.value = horaires[jour];
      }
    });

  } catch (err) {
    console.log('Horaires : utilisation des valeurs par défaut (API indisponible)');
    // les valeurs par défaut sont déjà dans les inputs HTML
  }
}

async function sauvegarderHoraires(e) {
  e.preventDefault();

  var jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  var horaires = {};

  jours.forEach(function(jour) {
    var input = document.getElementById('h-' + jour);
    horaires[jour] = input ? input.value.trim() : '';
  });

  var succes = document.getElementById('horaires-succes');
  var erreur = document.getElementById('horaires-erreur');
  succes.classList.add('d-none');
  erreur.classList.add('d-none');

  try {
    await fetchAPI('/horaires', {
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
    var commentaire = avisItem.commentaire || avisItem.text || '';
    var commentaireCourt = commentaire.length > 100
      ? commentaire.substring(0, 100) + '…'
      : commentaire;

    tr.innerHTML =
      '<td>' + echapper(avisItem.client || avisItem.auteur || avisItem.prenom || '—') + '</td>' +
      '<td class="small">' + echapper(avisItem.menu_titre || avisItem.menuNom || '—') + '</td>' +
      '<td style="color:#b8860b;">' + etoiles + '</td>' +
      '<td class="small">' + echapper(commentaireCourt) + '</td>' +
      '<td class="small">' + dateAvis + '</td>' +
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