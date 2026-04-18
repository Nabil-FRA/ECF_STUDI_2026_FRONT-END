// espace-admin.js
// gestion de l'espace admin
// fait par moi le 15/04/2026

let tousLesMenus = [];
let tousLesUtilisateurs = [];
let toutesLesCommandes = [];

document.addEventListener('DOMContentLoaded', function() {

  // ── vérifier l'authentification + rôle admin ──────────────
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  if (!user || !token || user.role !== 'admin') {
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
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'connexion.html';
  });

  // ── sauvegarder un menu (créer ou modifier) ───────────────
  document.getElementById('btn-sauvegarder-menu').addEventListener('click', sauvegarderMenu);

  // ── filtre rôle utilisateurs ──────────────────────────────
  document.getElementById('filtre-role').addEventListener('change', filtrerUtilisateurs);

  // ── filtre commandes ──────────────────────────────────────
  document.getElementById('btn-filtrer-commandes').addEventListener('click', chargerToutesCommandes);

  // charger les commandes au clic sur l'onglet
  document.getElementById('tab-commandes').addEventListener('shown.bs.tab', function() {
    if (toutesLesCommandes.length === 0) {
      chargerToutesCommandes();
    }
  });
});

// ══════════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════════
async function chargerStats() {
  const token = localStorage.getItem('token');
  try {
    // TODO: remplacer par la vraie URL
    const response = await fetch('/api/admin/stats', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!response.ok) return;

    const stats = await response.json();
    document.getElementById('stat-utilisateurs').textContent = stats.utilisateurs || 0;
    document.getElementById('stat-menus').textContent = stats.menusActifs || 0;
    document.getElementById('stat-commandes-mois').textContent = stats.commandesMois || 0;
    document.getElementById('stat-ca-mois').textContent =
      (stats.caMois || 0).toFixed(2) + ' €';
  } catch (err) {
    console.error('Erreur stats :', err);
  }
}

// ══════════════════════════════════════════════════════════════
// MENUS
// ══════════════════════════════════════════════════════════════
async function chargerMenus() {
  const body = document.getElementById('menus-body');
  const chargement = document.getElementById('menus-chargement');
  const token = localStorage.getItem('token');

  try {
    const response = await fetch('/api/menus', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!response.ok) throw new Error('Erreur');

    tousLesMenus = await response.json();
    chargement.classList.add('d-none');
    body.innerHTML = '';

    tousLesMenus.forEach(function(menu) {
      const tr = document.createElement('tr');

      const statutBadge = menu.actif !== false
        ? '<span class="badge bg-success">Actif</span>'
        : '<span class="badge bg-secondary">Inactif</span>';

      tr.innerHTML =
        '<td><strong>' + menu.nom + '</strong></td>' +
        '<td>' + (menu.theme || '—') + '</td>' +
        '<td>' + (menu.prix ? menu.prix.toFixed(2) + ' €' : '—') + '</td>' +
        '<td>' + (menu.nbConvivesMin || '—') + ' — ' + (menu.nbConvivesMax || '—') + '</td>' +
        '<td>' + (menu.stock !== undefined ? menu.stock : '—') + '</td>' +
        '<td>' + statutBadge + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-outline-primary me-1" ' +
          'onclick="ouvrirModifierMenu(\'' + menu.id + '\')" ' +
          'aria-label="Modifier ' + menu.nom + '">' +
            '<i class="bi bi-pencil" aria-hidden="true"></i>' +
          '</button>' +
          '<button class="btn btn-sm btn-outline-danger" ' +
          'onclick="supprimerMenu(\'' + menu.id + '\')" ' +
          'aria-label="Supprimer ' + menu.nom + '">' +
            '<i class="bi bi-trash" aria-hidden="true"></i>' +
          '</button>' +
        '</td>';

      body.appendChild(tr);
    });

  } catch (err) {
    console.error('Erreur menus :', err);
    chargement.innerHTML = '<p class="text-danger">Erreur de chargement.</p>';
  }
}

// ouvrir le modal pour modifier un menu
function ouvrirModifierMenu(menuId) {
  const menu = tousLesMenus.find(function(m) { return m.id === menuId; });
  if (!menu) return;

  document.getElementById('modal-menu-titre').textContent = 'Modifier le menu';
  document.getElementById('menu-id').value = menu.id;
  document.getElementById('menu-nom').value = menu.nom || '';
  document.getElementById('menu-prix').value = menu.prix || '';
  document.getElementById('menu-theme').value = menu.theme || '';
  document.getElementById('menu-regime').value = menu.regime || 'Classique';
  document.getElementById('menu-convives-min').value = menu.nbConvivesMin || '';
  document.getElementById('menu-convives-max').value = menu.nbConvivesMax || '';
  document.getElementById('menu-stock').value = menu.stock !== undefined ? menu.stock : '';
  document.getElementById('menu-description').value = menu.description || '';

  const modal = new bootstrap.Modal(document.getElementById('modal-menu'));
  modal.show();
}

// sauvegarder (créer ou modifier)
async function sauvegarderMenu() {
  const token = localStorage.getItem('token');
  const menuId = document.getElementById('menu-id').value;
  const isModif = !!menuId;

  const donnees = {
    nom: document.getElementById('menu-nom').value.trim(),
    prix: parseFloat(document.getElementById('menu-prix').value),
    theme: document.getElementById('menu-theme').value,
    regime: document.getElementById('menu-regime').value,
    nbConvivesMin: parseInt(document.getElementById('menu-convives-min').value),
    nbConvivesMax: parseInt(document.getElementById('menu-convives-max').value),
    stock: parseInt(document.getElementById('menu-stock').value) || 0,
    description: document.getElementById('menu-description').value.trim()
  };

  // validation basique
  if (!donnees.nom || !donnees.prix || !donnees.theme) {
    alert('Veuillez remplir les champs obligatoires.');
    return;
  }

  try {
    const url = isModif ? '/api/menus/' + menuId : '/api/menus';
    const method = isModif ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(donnees)
    });

    if (!response.ok) throw new Error('Erreur');

    // fermer le modal et recharger
    bootstrap.Modal.getInstance(document.getElementById('modal-menu')).hide();
    document.getElementById('form-menu').reset();
    document.getElementById('menu-id').value = '';
    chargerMenus();
    chargerStats();

  } catch (err) {
    alert('Erreur lors de l\'enregistrement du menu.');
  }
}

// supprimer un menu
async function supprimerMenu(menuId) {
  if (!confirm('Supprimer ce menu ? Cette action est irréversible.')) return;

  const token = localStorage.getItem('token');

  try {
    const response = await fetch('/api/menus/' + menuId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) throw new Error('Erreur');

    chargerMenus();
    chargerStats();

  } catch (err) {
    alert('Erreur lors de la suppression.');
  }
}

// reset du modal quand on l'ouvre pour un nouveau menu
document.getElementById('modal-menu').addEventListener('show.bs.modal', function(e) {
  // seulement si c'est le bouton "Nouveau menu" qui a déclenché
  if (e.relatedTarget && e.relatedTarget.textContent.includes('Nouveau')) {
    document.getElementById('modal-menu-titre').textContent = 'Nouveau menu';
    document.getElementById('form-menu').reset();
    document.getElementById('menu-id').value = '';
  }
});

// ══════════════════════════════════════════════════════════════
// UTILISATEURS
// ══════════════════════════════════════════════════════════════
async function chargerUtilisateurs() {
  const body = document.getElementById('utilisateurs-body');
  const chargement = document.getElementById('utilisateurs-chargement');
  const token = localStorage.getItem('token');

  try {
    const response = await fetch('/api/admin/utilisateurs', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!response.ok) throw new Error('Erreur');

    tousLesUtilisateurs = await response.json();
    chargement.classList.add('d-none');
    afficherUtilisateurs(tousLesUtilisateurs);

  } catch (err) {
    console.error('Erreur utilisateurs :', err);
    chargement.innerHTML = '<p class="text-danger">Erreur de chargement.</p>';
  }
}

function afficherUtilisateurs(utilisateurs) {
  const body = document.getElementById('utilisateurs-body');
  body.innerHTML = '';

  utilisateurs.forEach(function(u) {
    const tr = document.createElement('tr');

    let roleBadge = '<span class="badge bg-secondary">' + u.role + '</span>';
    if (u.role === 'admin') roleBadge = '<span class="badge bg-danger">admin</span>';
    else if (u.role === 'employe') roleBadge = '<span class="badge bg-warning text-dark">employé</span>';

    const dateInscription = u.createdAt
      ? new Date(u.createdAt).toLocaleDateString('fr-FR')
      : '—';

    tr.innerHTML =
      '<td>' + (u.prenom || '') + ' ' + (u.nom || '') + '</td>' +
      '<td>' + (u.email || '—') + '</td>' +
      '<td>' + roleBadge + '</td>' +
      '<td class="small">' + dateInscription + '</td>' +
      '<td>' +
        '<select class="form-select form-select-sm" style="width: auto; display: inline-block;" ' +
        'onchange="changerRole(\'' + u.id + '\', this.value)" ' +
        'aria-label="Changer le rôle de ' + u.prenom + '">' +
          '<option value="client"' + (u.role === 'client' ? ' selected' : '') + '>Client</option>' +
          '<option value="employe"' + (u.role === 'employe' ? ' selected' : '') + '>Employé</option>' +
          '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>Admin</option>' +
        '</select>' +
      '</td>';

    body.appendChild(tr);
  });
}

function filtrerUtilisateurs() {
  const role = document.getElementById('filtre-role').value;
  if (role === 'tous') {
    afficherUtilisateurs(tousLesUtilisateurs);
  } else {
    afficherUtilisateurs(
      tousLesUtilisateurs.filter(function(u) { return u.role === role; })
    );
  }
}

async function changerRole(userId, nouveauRole) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/admin/utilisateurs/' + userId + '/role', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ role: nouveauRole })
    });
    if (!response.ok) throw new Error('Erreur');

    // mettre à jour localement
    const user = tousLesUtilisateurs.find(function(u) { return u.id === userId; });
    if (user) user.role = nouveauRole;

  } catch (err) {
    alert('Erreur lors du changement de rôle.');
    chargerUtilisateurs();
  }
}

// ══════════════════════════════════════════════════════════════
// COMMANDES (toutes)
// ══════════════════════════════════════════════════════════════
async function chargerToutesCommandes() {
  const body = document.getElementById('all-commandes-body');
  const chargement = document.getElementById('all-commandes-chargement');
  const token = localStorage.getItem('token');

  const statut = document.getElementById('filtre-statut-admin').value;
  const dateDebut = document.getElementById('filtre-date-debut').value;
  const dateFin = document.getElementById('filtre-date-fin').value;

  // construire l'URL avec les filtres
  let url = '/api/admin/commandes?';
  if (statut !== 'tous') url += 'statut=' + encodeURIComponent(statut) + '&';
  if (dateDebut) url += 'dateDebut=' + dateDebut + '&';
  if (dateFin) url += 'dateFin=' + dateFin + '&';

  chargement.classList.remove('d-none');
  body.innerHTML = '';

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!response.ok) throw new Error('Erreur');

    toutesLesCommandes = await response.json();
    chargement.classList.add('d-none');

    toutesLesCommandes.forEach(function(cmd) {
      const tr = document.createElement('tr');

      let badgeClass = 'bg-secondary';
      if (cmd.statut === 'Confirmée') badgeClass = 'bg-success';
      else if (cmd.statut === 'En attente') badgeClass = 'bg-warning text-dark';
      else if (cmd.statut === 'Livrée') badgeClass = 'bg-info';
      else if (cmd.statut === 'Annulée') badgeClass = 'bg-danger';

      tr.innerHTML =
        '<td>' + (cmd.numero || cmd.id) + '</td>' +
        '<td>' + (cmd.date ? new Date(cmd.date).toLocaleDateString('fr-FR') : '—') + '</td>' +
        '<td>' + (cmd.clientNom || '—') + '</td>' +
        '<td>' + (cmd.menuNom || '—') + '</td>' +
        '<td class="fw-bold">' + (cmd.total ? cmd.total.toFixed(2) + ' €' : '—') + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + cmd.statut + '</span></td>';

      body.appendChild(tr);
    });

  } catch (err) {
    console.error('Erreur commandes :', err);
    chargement.innerHTML = '<p class="text-danger">Erreur de chargement.</p>';
  }
}