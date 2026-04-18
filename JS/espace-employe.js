// espace-employe.js
// gestion de l'espace employé
// fait par moi le 15/04/2026

let toutesLesCommandes = []; // pour stocker les commandes et les filtrer

document.addEventListener('DOMContentLoaded', function() {

  // ── vérifier l'authentification + rôle ────────────────────
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  if (!user || !token) {
    window.location.href = 'connexion.html';
    return;
  }

  // vérifier le rôle (employé ou admin)
  if (user.role !== 'employe' && user.role !== 'admin') {
    alert('Accès non autorisé.');
    window.location.href = '../index.html';
    return;
  }

  // ── date du jour par défaut ───────────────────────────────
  const dateInput = document.getElementById('filtre-date');
  const aujourdhui = new Date().toISOString().split('T')[0];
  dateInput.value = aujourdhui;

  // charger les commandes du jour
  chargerCommandes(aujourdhui);

  // ── filtres ───────────────────────────────────────────────
  document.getElementById('filtre-statut').addEventListener('change', filtrer);
  dateInput.addEventListener('change', function() {
    chargerCommandes(dateInput.value);
  });

  // ── déconnexion ───────────────────────────────────────────
  document.getElementById('btn-deconnexion').addEventListener('click', function() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'connexion.html';
  });
});

// ── charger les commandes ───────────────────────────────────
async function chargerCommandes(date) {
  const chargement = document.getElementById('commandes-chargement');
  const vide = document.getElementById('commandes-vide');
  const body = document.getElementById('commandes-body');
  const token = localStorage.getItem('token');

  chargement.classList.remove('d-none');
  vide.classList.add('d-none');
  body.innerHTML = '';

  try {
    // TODO: remplacer par la vraie URL
    const response = await fetch('/api/commandes?date=' + date, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) throw new Error('Erreur serveur');

    toutesLesCommandes = await response.json();
    chargement.classList.add('d-none');

    // mettre à jour les stats
    mettreAJourStats(toutesLesCommandes);

    // appliquer le filtre courant
    filtrer();

  } catch (err) {
    console.error('Erreur :', err);
    chargement.innerHTML = '<p class="text-danger">Erreur de chargement. Réessayez.</p>';
  }
}

// ── filtrer les commandes ───────────────────────────────────
function filtrer() {
  const statutFiltre = document.getElementById('filtre-statut').value;
  const body = document.getElementById('commandes-body');
  const vide = document.getElementById('commandes-vide');

  let commandesFiltrees = toutesLesCommandes;

  if (statutFiltre !== 'tous') {
    commandesFiltrees = toutesLesCommandes.filter(function(cmd) {
      return cmd.statut === statutFiltre;
    });
  }

  body.innerHTML = '';

  if (commandesFiltrees.length === 0) {
    vide.classList.remove('d-none');
    return;
  }

  vide.classList.add('d-none');

  commandesFiltrees.forEach(function(cmd) {
    const tr = document.createElement('tr');

    // badge statut
    let badgeClass = 'bg-secondary';
    if (cmd.statut === 'Confirmée') badgeClass = 'bg-success';
    else if (cmd.statut === 'En attente') badgeClass = 'bg-warning text-dark';
    else if (cmd.statut === 'En préparation') badgeClass = 'bg-info';
    else if (cmd.statut === 'Livrée') badgeClass = 'bg-primary';
    else if (cmd.statut === 'Annulée') badgeClass = 'bg-danger';

    // boutons d'action selon le statut
    let actions = '';
    if (cmd.statut === 'En attente') {
      actions =
        '<button class="btn btn-sm btn-success me-1" onclick="changerStatut(\'' + cmd.id + '\', \'Confirmée\')" ' +
        'aria-label="Confirmer la commande ' + cmd.numero + '">' +
          '<i class="bi bi-check-lg" aria-hidden="true"></i>' +
        '</button>' +
        '<button class="btn btn-sm btn-danger" onclick="changerStatut(\'' + cmd.id + '\', \'Annulée\')" ' +
        'aria-label="Annuler la commande ' + cmd.numero + '">' +
          '<i class="bi bi-x-lg" aria-hidden="true"></i>' +
        '</button>';
    } else if (cmd.statut === 'Confirmée') {
      actions =
        '<button class="btn btn-sm btn-info" onclick="changerStatut(\'' + cmd.id + '\', \'En préparation\')" ' +
        'aria-label="Mettre en préparation">' +
          '<i class="bi bi-gear" aria-hidden="true"></i>' +
        '</button>';
    } else if (cmd.statut === 'En préparation') {
      actions =
        '<button class="btn btn-sm btn-primary" onclick="changerStatut(\'' + cmd.id + '\', \'Livrée\')" ' +
        'aria-label="Marquer comme livrée">' +
          '<i class="bi bi-truck" aria-hidden="true"></i>' +
        '</button>';
    }

    tr.innerHTML =
      '<td><strong>' + (cmd.numero || cmd.id) + '</strong></td>' +
      '<td>' + (cmd.clientNom || '—') + '</td>' +
      '<td>' + (cmd.menuNom || '—') + '</td>' +
      '<td>' + (cmd.nbPersonnes || '—') + '</td>' +
      '<td>' + (cmd.heure || '—') + '</td>' +
      '<td class="small">' + (cmd.adresse || '—') + '</td>' +
      '<td class="fw-bold">' + (cmd.total ? cmd.total.toFixed(2) + ' €' : '—') + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + cmd.statut + '</span></td>' +
      '<td>' + actions + '</td>';

    body.appendChild(tr);
  });
}

// ── changer le statut d'une commande ────────────────────────
async function changerStatut(commandeId, nouveauStatut) {
  const confirmation = confirm('Changer le statut en "' + nouveauStatut + '" ?');
  if (!confirmation) return;

  const token = localStorage.getItem('token');

  try {
    // TODO: remplacer par la vraie URL
    const response = await fetch('/api/commandes/' + commandeId + '/statut', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ statut: nouveauStatut })
    });

    if (!response.ok) throw new Error('Erreur');

    // mettre à jour localement
    const commande = toutesLesCommandes.find(function(c) { return c.id === commandeId; });
    if (commande) {
      commande.statut = nouveauStatut;
    }

    // re-afficher
    mettreAJourStats(toutesLesCommandes);
    filtrer();

  } catch (err) {
    alert('Erreur lors de la mise à jour du statut.');
  }
}

// ── mettre à jour les stats ─────────────────────────────────
function mettreAJourStats(commandes) {
  document.getElementById('stat-total').textContent = commandes.length;
  document.getElementById('stat-attente').textContent =
    commandes.filter(function(c) { return c.statut === 'En attente'; }).length;
  document.getElementById('stat-confirmee').textContent =
    commandes.filter(function(c) { return c.statut === 'Confirmée'; }).length;
  document.getElementById('stat-livree').textContent =
    commandes.filter(function(c) { return c.statut === 'Livrée'; }).length;
}