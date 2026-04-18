// espace-client.js
// gestion de l'espace client
// fait par moi le 15/04/2026

document.addEventListener('DOMContentLoaded', function() {

  // ── vérifier l'authentification ───────────────────────────
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  if (!user || !token) {
    window.location.href = 'connexion.html?retour=' + encodeURIComponent(window.location.href);
    return;
  }

  // afficher le prénom
  document.getElementById('client-prenom').textContent = user.prenom || user.nom || 'Client';

  // pré-remplir le formulaire profil
  document.getElementById('profil-prenom').value = user.prenom || '';
  document.getElementById('profil-nom').value = user.nom || '';
  document.getElementById('profil-email').value = user.email || '';
  document.getElementById('profil-tel').value = user.telephone || '';

  // charger les commandes
  chargerCommandes();

  // ── déconnexion ───────────────────────────────────────────
  document.getElementById('btn-deconnexion').addEventListener('click', function() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '../index.html';
    }
  });

  // ── formulaire profil ─────────────────────────────────────
  document.getElementById('form-profil').addEventListener('submit', async function(e) {
    e.preventDefault();

    const succes = document.getElementById('profil-succes');
    const erreur = document.getElementById('profil-erreur');
    succes.classList.add('d-none');
    erreur.classList.add('d-none');

    try {
      const response = await fetch('/api/utilisateurs/profil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          prenom: document.getElementById('profil-prenom').value.trim(),
          nom: document.getElementById('profil-nom').value.trim(),
          email: document.getElementById('profil-email').value.trim(),
          telephone: document.getElementById('profil-tel').value.trim()
        })
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour.');

      const data = await response.json();
      // mettre à jour le localStorage
      localStorage.setItem('user', JSON.stringify(data));
      succes.classList.remove('d-none');

    } catch (err) {
      erreur.textContent = err.message;
      erreur.classList.remove('d-none');
    }
  });

  // ── formulaire mot de passe ───────────────────────────────
  document.getElementById('form-mdp').addEventListener('submit', async function(e) {
    e.preventDefault();

    // reset
    this.querySelectorAll('.is-invalid').forEach(function(el) {
      el.classList.remove('is-invalid');
    });
    document.getElementById('mdp-succes').classList.add('d-none');
    document.getElementById('mdp-erreur').classList.add('d-none');

    const actuel = document.getElementById('mdp-actuel');
    const nouveau = document.getElementById('mdp-nouveau');
    const confirmer = document.getElementById('mdp-confirmer');
    let valide = true;

    if (!actuel.value) {
      actuel.classList.add('is-invalid');
      document.getElementById('erreur-mdp-actuel').textContent = 'Champ obligatoire.';
      valide = false;
    }

    // vérifier la force du nouveau mdp
    const regexMdp = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
    if (!nouveau.value) {
      nouveau.classList.add('is-invalid');
      document.getElementById('erreur-mdp-nouveau').textContent = 'Champ obligatoire.';
      valide = false;
    } else if (!regexMdp.test(nouveau.value)) {
      nouveau.classList.add('is-invalid');
      document.getElementById('erreur-mdp-nouveau').textContent =
        '8 caractères minimum, 1 majuscule, 1 chiffre.';
      valide = false;
    }

    if (nouveau.value !== confirmer.value) {
      confirmer.classList.add('is-invalid');
      document.getElementById('erreur-mdp-confirmer').textContent =
        'Les mots de passe ne correspondent pas.';
      valide = false;
    }

    if (!valide) return;

    try {
      const response = await fetch('/api/utilisateurs/mot-de-passe', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          motDePasseActuel: actuel.value,
          nouveauMotDePasse: nouveau.value
        })
      });

      if (response.status === 401) {
        actuel.classList.add('is-invalid');
        document.getElementById('erreur-mdp-actuel').textContent =
          'Mot de passe actuel incorrect.';
        return;
      }

      if (!response.ok) throw new Error('Erreur lors de la modification.');

      document.getElementById('mdp-succes').classList.remove('d-none');
      // vider les champs
      actuel.value = '';
      nouveau.value = '';
      confirmer.value = '';

    } catch (err) {
      document.getElementById('mdp-erreur').textContent = err.message;
      document.getElementById('mdp-erreur').classList.remove('d-none');
    }
  });

  // ── suppression de compte ─────────────────────────────────
  document.getElementById('btn-supprimer-compte').addEventListener('click', async function() {
    const confirmation = prompt(
      'Tapez "SUPPRIMER" pour confirmer la suppression définitive de votre compte :'
    );
    if (confirmation !== 'SUPPRIMER') return;

    try {
      const response = await fetch('/api/utilisateurs/compte', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (!response.ok) throw new Error('Erreur');

      localStorage.removeItem('user');
      localStorage.removeItem('token');
      alert('Votre compte a été supprimé.');
      window.location.href = '../index.html';

    } catch (err) {
      alert('Erreur lors de la suppression. Veuillez réessayer.');
    }
  });
});

// ── charger les commandes depuis l'API ──────────────────────
async function chargerCommandes() {
  const chargement = document.getElementById('commandes-chargement');
  const vide = document.getElementById('commandes-vide');
  const tableau = document.getElementById('commandes-tableau');
  const body = document.getElementById('commandes-body');
  const token = localStorage.getItem('token');

  try {
    const response = await fetch('/api/commandes', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) throw new Error('Erreur');

    const commandes = await response.json();
    chargement.classList.add('d-none');

    if (!commandes || commandes.length === 0) {
      vide.classList.remove('d-none');
      tableau.classList.add('d-none');
      return;
    }

    body.innerHTML = '';

    commandes.forEach(function(cmd) {
      const tr = document.createElement('tr');

      // badge statut avec couleur
      let badgeClass = 'bg-secondary';
      if (cmd.statut === 'Confirmée') badgeClass = 'bg-success';
      else if (cmd.statut === 'En attente') badgeClass = 'bg-warning text-dark';
      else if (cmd.statut === 'Annulée') badgeClass = 'bg-danger';
      else if (cmd.statut === 'Livrée') badgeClass = 'bg-info';

      tr.innerHTML =
        '<td><strong>' + (cmd.numero || cmd.id) + '</strong></td>' +
        '<td>' + formaterDate(cmd.date) + '</td>' +
        '<td>' + (cmd.menuNom || '—') + '</td>' +
        '<td>' + (cmd.nbPersonnes || '—') + '</td>' +
        '<td class="fw-bold">' + (cmd.total ? cmd.total.toFixed(2) + ' €' : '—') + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + (cmd.statut || '—') + '</span></td>' +
        '<td>' +
          '<a href="confirmation-commande.html?id=' + cmd.id +
          '" class="btn btn-sm btn-outline-primary" aria-label="Voir la commande ' +
          (cmd.numero || cmd.id) + '">' +
            '<i class="bi bi-eye" aria-hidden="true"></i>' +
          '</a>' +
        '</td>';

      body.appendChild(tr);
    });

  } catch (err) {
    console.error('Erreur chargement commandes :', err);
    chargement.innerHTML =
      '<p class="text-danger">Impossible de charger vos commandes. Réessayez plus tard.</p>';
  }
}

// ── formater une date ───────────────────────────────────────
function formaterDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}