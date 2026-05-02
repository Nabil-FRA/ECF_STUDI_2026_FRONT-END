// espace-admin.js
// gestion de l'espace admin
// corrigé : ajout graphique comparaison commandes par menu
// corrigé : ajout calcul chiffre d'affaires par menu avec filtres
// corrigé : ajout création/désactivation compte employé
// corrigé : utilise echapper() pour les injections

var tousLesMenus = [];
var tousLesUtilisateurs = [];
var toutesLesCommandes = [];

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
    document.getElementById('stat-utilisateurs').textContent = data.utilisateurs || 0;
    document.getElementById('stat-menus').textContent = data.menusActifs || 0;
    document.getElementById('stat-commandes-mois').textContent = data.commandesMois || 0;
    document.getElementById('stat-ca-mois').textContent =
      (data.caMois || 0).toFixed(2) + ' €';
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

      var statutBadge = menu.actif !== false
        ? '<span class="badge bg-success">Actif</span>'
        : '<span class="badge bg-secondary">Inactif</span>';

      var prix = menu.prix_base || menu.prix || 0;

      tr.innerHTML =
        '<td><strong>' + echapper(menu.titre || menu.nom) + '</strong></td>' +
        '<td>' + echapper(menu.theme || '—') + '</td>' +
        '<td>' + prix.toFixed(2) + ' €</td>' +
        '<td>' + (menu.nb_personnes_min || menu.nbConvivesMin || '—') + ' — ' + (menu.nb_personnes_max || menu.nbConvivesMax || '—') + '</td>' +
        '<td>' + (menu.stock !== undefined ? menu.stock : '—') + '</td>' +
        '<td>' + statutBadge + '</td>' +
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

function ouvrirModifierMenu(menuId) {
  var menu = tousLesMenus.find(function(m) { return m.id == menuId; });
  if (!menu) return;

  document.getElementById('modal-menu-titre').textContent = 'Modifier le menu';
  document.getElementById('menu-id').value = menu.id;
  document.getElementById('menu-nom').value = menu.titre || menu.nom || '';
  document.getElementById('menu-prix').value = menu.prix_base || menu.prix || '';
  document.getElementById('menu-theme').value = menu.theme || '';
  document.getElementById('menu-regime').value = menu.regime || 'classique';
  document.getElementById('menu-convives-min').value = menu.nb_personnes_min || menu.nbConvivesMin || '';
  document.getElementById('menu-convives-max').value = menu.nb_personnes_max || menu.nbConvivesMax || '';
  document.getElementById('menu-stock').value = menu.stock !== undefined ? menu.stock : '';
  document.getElementById('menu-description').value = menu.description || '';

  var modal = new bootstrap.Modal(document.getElementById('modal-menu'));
  modal.show();
}

async function sauvegarderMenu() {
  var menuId = document.getElementById('menu-id').value;
  var isModif = !!menuId;

  var donnees = {
    titre: document.getElementById('menu-nom').value.trim(),
    prix_base: parseFloat(document.getElementById('menu-prix').value),
    theme: document.getElementById('menu-theme').value,
    regime: document.getElementById('menu-regime').value,
    nb_personnes_min: parseInt(document.getElementById('menu-convives-min').value),
    nb_personnes_max: parseInt(document.getElementById('menu-convives-max').value),
    stock: parseInt(document.getElementById('menu-stock').value) || 0,
    description: document.getElementById('menu-description').value.trim()
  };

  if (!donnees.titre || !donnees.prix_base || !donnees.theme) {
    alert('Veuillez remplir les champs obligatoires.');
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
    await fetchAPI('/menus/' + menuId, { method: 'DELETE' });
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
    }
  });
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

    var roleBadge = '<span class="badge bg-secondary">' + echapper(u.role) + '</span>';
    if (u.role === 'admin') roleBadge = '<span class="badge bg-danger">admin</span>';
    else if (u.role === 'employe') roleBadge = '<span class="badge bg-warning text-dark">employé</span>';

    // statut actif/désactivé
    var actif = u.actif !== false;
    var statutBadge = actif
      ? '<span class="badge bg-success">Actif</span>'
      : '<span class="badge bg-secondary">Désactivé</span>';

    var dateInscription = u.createdAt
      ? new Date(u.createdAt).toLocaleDateString('fr-FR')
      : '—';

    // bouton désactiver/activer (seulement pour les employés)
    var btnDesactiver = '';
    if (u.role === 'employe') {
      if (actif) {
        btnDesactiver =
          '<button class="btn btn-sm btn-outline-warning ms-1" ' +
            'onclick="toggleActivation(\'' + u.id + '\', false)" ' +
            'aria-label="Désactiver ' + echapper(u.prenom) + '">' +
            '<i class="bi bi-person-slash" aria-hidden="true"></i>' +
          '</button>';
      } else {
        btnDesactiver =
          '<button class="btn btn-sm btn-outline-success ms-1" ' +
            'onclick="toggleActivation(\'' + u.id + '\', true)" ' +
            'aria-label="Réactiver ' + echapper(u.prenom) + '">' +
            '<i class="bi bi-person-check" aria-hidden="true"></i>' +
          '</button>';
      }
    }

    tr.innerHTML =
      '<td>' + echapper(u.prenom || '') + ' ' + echapper(u.nom || '') + '</td>' +
      '<td>' + echapper(u.email || '—') + '</td>' +
      '<td>' + roleBadge + '</td>' +
      '<td>' + statutBadge + '</td>' +
      '<td class="small">' + dateInscription + '</td>' +
      '<td>' +
        '<select class="form-select form-select-sm d-inline-block" style="width:auto;" ' +
          'onchange="changerRole(\'' + u.id + '\', this.value)" ' +
          'aria-label="Changer le rôle de ' + echapper(u.prenom || u.email) + '">' +
          '<option value="client"' + (u.role === 'client' ? ' selected' : '') + '>Client</option>' +
          '<option value="employe"' + (u.role === 'employe' ? ' selected' : '') + '>Employé</option>' +
          '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>Admin</option>' +
        '</select>' +
        btnDesactiver +
      '</td>';

    body.appendChild(tr);
  });
}

function filtrerUtilisateurs() {
  var role = document.getElementById('filtre-role').value;
  if (role === 'tous') {
    afficherUtilisateurs(tousLesUtilisateurs);
  } else {
    afficherUtilisateurs(
      tousLesUtilisateurs.filter(function(u) { return u.role === role; })
    );
  }
}

async function changerRole(userId, nouveauRole) {
  try {
    await fetchAPI('/admin/utilisateurs/' + userId + '/role', {
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
    await fetchAPI('/admin/utilisateurs/' + userId + '/statut', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: activer })
    });

    var user = tousLesUtilisateurs.find(function(u) { return u.id == userId; });
    if (user) user.actif = activer;

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

      var badgeClass = 'bg-secondary';
      if (cmd.statut === 'Confirmée') badgeClass = 'bg-success';
      else if (cmd.statut === 'En attente') badgeClass = 'bg-warning text-dark';
      else if (cmd.statut === 'Livrée') badgeClass = 'bg-info';
      else if (cmd.statut === 'Terminée') badgeClass = 'bg-primary';
      else if (cmd.statut === 'Annulée') badgeClass = 'bg-danger';

      tr.innerHTML =
        '<td>' + echapper(cmd.numero || cmd.id) + '</td>' +
        '<td>' + (cmd.date ? new Date(cmd.date).toLocaleDateString('fr-FR') : '—') + '</td>' +
        '<td>' + echapper(cmd.clientNom || '—') + '</td>' +
        '<td>' + echapper(cmd.menuNom || cmd.menu || '—') + '</td>' +
        '<td class="fw-bold">' + (cmd.total ? cmd.total.toFixed(2) + ' €' : '—') + '</td>' +
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
        '<div class="card">' +
          '<div class="card-body">' +
            '<h3 class="h6 mb-3"><i class="bi bi-bar-chart" aria-hidden="true"></i> Commandes par menu</h3>' +
            '<canvas id="chart-commandes-menu" height="300" aria-label="Graphique comparaison des commandes par menu" role="img"></canvas>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // calcul CA par menu
      '<div class="col-lg-5">' +
        '<div class="card">' +
          '<div class="card-body">' +
            '<h3 class="h6 mb-3"><i class="bi bi-currency-euro" aria-hidden="true"></i> Chiffre d\'affaires par menu</h3>' +
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
            '<button class="btn btn-primary btn-sm w-100 mb-3" onclick="calculerCA()">' +
              '<i class="bi bi-calculator" aria-hidden="true"></i> Calculer le CA' +
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

  // données : on compte le nombre de commandes par menu
  // en mode mock, on utilise les données de api.js
  var commandesParMenu = {};
  var couleurs = [
    '#b5451b', '#2d7a3a', '#0d6efd', '#ffc107', '#6f42c1', '#20c997',
    '#fd7e14', '#d63384', '#0dcaf0', '#6c757d'
  ];

  // on essaie de charger les commandes si pas déjà fait
  if (toutesLesCommandes.length === 0) {
    // données de démonstration pour le graphique
    var demoData = [
      { menu: 'Menu Noël Tradition', count: 18 },
      { menu: 'Menu Pâques Printanier', count: 12 },
      { menu: 'Menu Classique Bordelais', count: 24 },
      { menu: 'Menu Végétarien Gourmand', count: 9 },
      { menu: 'Menu Événement Prestige', count: 15 },
      { menu: 'Menu Végan Saison', count: 6 }
    ];

    var labels = demoData.map(function(d) { return d.menu; });
    var values = demoData.map(function(d) { return d.count; });

    creerChart(canvas, labels, values, couleurs);
  } else {
    // données réelles depuis les commandes chargées
    toutesLesCommandes.forEach(function(cmd) {
      var nomMenu = cmd.menuNom || cmd.menu || 'Inconnu';
      if (!commandesParMenu[nomMenu]) {
        commandesParMenu[nomMenu] = 0;
      }
      commandesParMenu[nomMenu]++;
    });

    var labels = Object.keys(commandesParMenu);
    var values = Object.values(commandesParMenu);

    creerChart(canvas, labels, values, couleurs);
  }
}

function creerChart(canvas, labels, values, couleurs) {
  // vérifier que Chart.js est chargé
  if (typeof Chart === 'undefined') {
    console.error('Chart.js non chargé');
    canvas.parentElement.innerHTML =
      '<p class="text-danger">Erreur : la bibliothèque de graphiques n\'est pas chargée.</p>';
    return;
  }

  // détruire l'ancien graphique s'il existe
  if (graphiqueInstance) {
    graphiqueInstance.destroy();
  }

  var ctx = canvas.getContext('2d');

  graphiqueInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Nombre de commandes',
        data: values,
        backgroundColor: couleurs.slice(0, labels.length),
        borderColor: couleurs.slice(0, labels.length).map(function(c) {
          return c;
        }),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Comparaison des commandes par menu',
          font: { size: 14, family: "'Source Sans 3', sans-serif" },
          color: '#2c2c2c'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: { size: 12 }
          },
          title: {
            display: true,
            text: 'Commandes',
            font: { size: 12 }
          }
        },
        x: {
          ticks: {
            font: { size: 11 },
            maxRotation: 45
          }
        }
      }
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

  // filtrer par menu
  var filtrees = commandes;
  if (menuFiltre !== 'tous') {
    filtrees = filtrees.filter(function(cmd) {
      return cmd.menu_id == menuFiltre || cmd.menuId == menuFiltre;
    });
  }

  // filtrer par date
  if (dateDebut) {
    var debut = new Date(dateDebut);
    filtrees = filtrees.filter(function(cmd) {
      return new Date(cmd.date) >= debut;
    });
  }
  if (dateFin) {
    var fin = new Date(dateFin);
    fin.setHours(23, 59, 59);
    filtrees = filtrees.filter(function(cmd) {
      return new Date(cmd.date) <= fin;
    });
  }

  // ne compter que les commandes non annulées
  filtrees = filtrees.filter(function(cmd) {
    return cmd.statut !== 'Annulée';
  });

  // calculer le total
  var totalCA = 0;
  var nbCommandes = filtrees.length;
  filtrees.forEach(function(cmd) {
    totalCA += (cmd.total || 0);
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