// espace-client.js
// Gestion complète de l'espace client
// Corrigé : utilise fetchAPI() et getUtilisateurConnecte()
// Corrigé : suivi commande avec timeline (historique des statuts)
// Corrigé : modification commande câblée (tant que pas acceptée)
// Corrigé : soumission avis câblée (commande terminée)
// Corrigé : annulation commande câblée
// Corrigé : validation mdp 10 chars + majuscule + minuscule + chiffre + spécial

var toutesLesCommandesClient = [];

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

function formaterDateHeure(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}


// ══════════════════════════════════════════════════════════════
// INITIALISATION
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  console.log('--- initialisation espace-client.js ---');

  // ── vérifier l'authentification ───────────────────────────
  var user = getUtilisateurConnecte();

  if (!user) {
    window.location.href = 'connexion.html?retour=' + encodeURIComponent(window.location.href);
    return;
  }

  // afficher le prénom
  document.getElementById('client-prenom').textContent = user.prenom || user.nom || 'Client';

  // pré-remplir le formulaire profil
  document.getElementById('profil-prenom').value = user.prenom || '';
  document.getElementById('profil-nom').value = user.nom || '';
  document.getElementById('profil-email').value = user.email || '';
  document.getElementById('profil-tel').value = user.telephone || user.gsm || '';
  if (user.adresse) document.getElementById('profil-adresse').value = user.adresse;
  if (user.codePostal || user.code_postal) document.getElementById('profil-cp').value = user.codePostal || user.code_postal;
  if (user.ville) document.getElementById('profil-ville').value = user.ville;

  // charger les commandes
  chargerCommandes();

  // ── déconnexion ───────────────────────────────────────────
  document.getElementById('btn-deconnexion').addEventListener('click', function() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      deconnexion();
      window.location.href = '../index.html';
    }
  });

  // ── formulaire profil ─────────────────────────────────────
  document.getElementById('form-profil').addEventListener('submit', sauvegarderProfil);

  // ── formulaire mot de passe ───────────────────────────────
  document.getElementById('form-mdp').addEventListener('submit', changerMotDePasse);

  // ── suppression de compte ─────────────────────────────────
  document.getElementById('btn-supprimer-compte').addEventListener('click', supprimerCompte);

  // ── sauvegarder modification commande ─────────────────────
  document.getElementById('btn-sauvegarder-modif').addEventListener('click', sauvegarderModification);

  // ── envoyer avis ──────────────────────────────────────────
  document.getElementById('btn-envoyer-avis').addEventListener('click', soumettreAvis);

  // ── mise à jour étoiles avis en temps réel ────────────────
  var avisNote = document.getElementById('avis-note');
  if (avisNote) {
    avisNote.addEventListener('input', function() {
      var val = parseInt(avisNote.value);
      var display = '';
      for (var i = 0; i < 5; i++) {
        display += i < val ? '★' : '☆';
      }
      document.getElementById('avis-stars-display').textContent = display;
    });
  }

  console.log('espace-client.js initialisé');
});


// ══════════════════════════════════════════════════════════════
// COMMANDES
// ══════════════════════════════════════════════════════════════

async function chargerCommandes() {
  var chargement = document.getElementById('commandes-chargement');
  var vide = document.getElementById('commandes-vide');
  var tableau = document.getElementById('commandes-tableau');
  var body = document.getElementById('commandes-body');

  try {
    var data = await fetchAPI('/commandes');
    var commandes = data.commandes || data || [];
    toutesLesCommandesClient = commandes;

    chargement.classList.add('d-none');

    if (!commandes || commandes.length === 0) {
      vide.classList.remove('d-none');
      tableau.classList.add('d-none');
      return;
    }

    body.innerHTML = '';

    commandes.forEach(function(cmd) {
      var tr = document.createElement('tr');

      // badge statut avec couleur
      var badgeClass = getBadgeClass(cmd.statut);

      // boutons d'action selon le statut
      var actions = genererActionsClient(cmd);

      tr.innerHTML =
        '<td><strong>' + echapper(cmd.numero || cmd.id) + '</strong></td>' +
        '<td>' + formaterDate(cmd.date) + '</td>' +
        '<td>' + echapper(cmd.menuNom || '—') + '</td>' +
        '<td>' + (cmd.nbPersonnes || '—') + '</td>' +
        '<td class="fw-bold">' + (cmd.total ? cmd.total.toFixed(2) + ' €' : '—') + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + echapper(cmd.statut || '—') + '</span></td>' +
        '<td>' + actions + '</td>';

      body.appendChild(tr);
    });

  } catch (err) {
    console.error('Erreur chargement commandes :', err);
    chargement.innerHTML =
      '<p class="text-danger">Impossible de charger vos commandes. Réessayez plus tard.</p>';
  }
}

function getBadgeClass(statut) {
  var classes = {
    'En attente': 'bg-warning text-dark',
    'Confirmée': 'bg-success',
    'En préparation': 'bg-info',
    'En cours de livraison': 'bg-primary',
    'Livrée': 'bg-info text-dark',
    'En attente du retour de matériel': 'bg-warning',
    'Terminée': 'bg-secondary',
    'Annulée': 'bg-danger'
  };
  return classes[statut] || 'bg-secondary';
}

function genererActionsClient(cmd) {
  var id = cmd.id;
  var actions = '';

  // Bouton Suivi (toujours visible si la commande est acceptée)
  if (cmd.statut !== 'En attente' && cmd.statut !== 'Annulée') {
    actions +=
      '<button class="btn btn-sm btn-outline-info me-1" onclick="ouvrirSuivi(\'' + id + '\')" ' +
        'aria-label="Suivre la commande ' + echapper(cmd.numero || cmd.id) + '">' +
        '<i class="bi bi-geo-alt" aria-hidden="true"></i>' +
      '</button>';
  }

  // Bouton Modifier (tant que pas acceptée)
  if (cmd.statut === 'En attente') {
    actions +=
      '<button class="btn btn-sm btn-outline-primary me-1" onclick="ouvrirModifier(\'' + id + '\')" ' +
        'aria-label="Modifier la commande">' +
        '<i class="bi bi-pencil" aria-hidden="true"></i>' +
      '</button>';
  }

  // Bouton Annuler (tant que pas acceptée)
  if (cmd.statut === 'En attente') {
    actions +=
      '<button class="btn btn-sm btn-outline-danger me-1" onclick="annulerCommande(\'' + id + '\')" ' +
        'aria-label="Annuler la commande">' +
        '<i class="bi bi-x-lg" aria-hidden="true"></i>' +
      '</button>';
  }

  // Bouton Avis (quand commande terminée et pas encore d'avis)
  if (cmd.statut === 'Terminée' && !cmd.avisDepose) {
    actions +=
      '<button class="btn btn-sm btn-outline-warning" onclick="ouvrirAvis(\'' + id + '\')" ' +
        'aria-label="Donner un avis">' +
        '<i class="bi bi-star" aria-hidden="true"></i>' +
      '</button>';
  }

  // Bouton Voir détail (toujours)
  actions +=
    '<a href="confirmation-commande.html?id=' + id + '" class="btn btn-sm btn-outline-secondary" ' +
      'aria-label="Voir le détail">' +
      '<i class="bi bi-eye" aria-hidden="true"></i>' +
    '</a>';

  return actions;
}


// ══════════════════════════════════════════════════════════════
// SUIVI DE COMMANDE — TIMELINE
// L'énoncé dit : "Le suivi de la commande énumère tous les états
// de sa commande suivi de la date et l'heure de modification."
// ══════════════════════════════════════════════════════════════

async function ouvrirSuivi(commandeId) {
  var contenu = document.getElementById('modal-suivi-contenu');
  var titre = document.getElementById('modal-suivi-titre');

  // trouver la commande localement
  var cmd = toutesLesCommandesClient.find(function(c) { return c.id == commandeId; });

  titre.textContent = 'Suivi — Commande ' + (cmd ? (cmd.numero || cmd.id) : commandeId);

  // charger l'historique depuis l'API
  contenu.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm" role="status"></div> Chargement...</div>';

  var modal = new bootstrap.Modal(document.getElementById('modal-suivi'));
  modal.show();

  try {
    var data = await fetchAPI('/commandes/' + commandeId + '/historique');
    var historique = data.historique || data || [];

    afficherTimeline(historique, cmd, contenu);

  } catch (err) {
    console.log('API historique indisponible, affichage du statut actuel');
    // fallback : afficher au moins le statut actuel
    if (cmd) {
      var fallback = [
        { statut: 'Commande passée', date: cmd.dateCreation || cmd.date, actif: true },
        { statut: cmd.statut, date: cmd.dateDerniereModif || null, actif: true }
      ];
      afficherTimeline(fallback, cmd, contenu);
    } else {
      contenu.innerHTML = '<p class="text-muted">Impossible de charger le suivi.</p>';
    }
  }
}

function afficherTimeline(historique, cmd, contenu) {
  // si l'historique est vide, construire un historique minimal depuis le statut actuel
  if (!historique || historique.length === 0) {
    historique = construireHistoriqueMinimal(cmd);
  }

  var html = '<div class="timeline" role="list" aria-label="Historique des statuts">';

  // les étapes possibles dans l'ordre
  var etapesOrdre = [
    'En attente',
    'Confirmée',
    'En préparation',
    'En cours de livraison',
    'Livrée',
    'En attente du retour de matériel',
    'Terminée'
  ];

  historique.forEach(function(etape, index) {
    var isLast = index === historique.length - 1;
    var iconClass = getIconeStatut(etape.statut);
    var couleur = etape.actif ? '#b5451b' : '#dee2e6';
    var textCouleur = etape.actif ? '#2c2c2c' : '#adb5bd';

    html +=
      '<div class="d-flex mb-3" role="listitem">' +
        '<div class="me-3 text-center" style="min-width:40px;">' +
          '<div style="width:36px;height:36px;border-radius:50%;background:' + couleur + ';' +
            'display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.9rem;">' +
            '<i class="bi ' + iconClass + '" aria-hidden="true"></i>' +
          '</div>' +
          (isLast ? '' : '<div style="width:2px;height:30px;background:' + couleur + ';margin:4px auto;"></div>') +
        '</div>' +
        '<div style="padding-top:5px;">' +
          '<p class="mb-0 fw-bold" style="color:' + textCouleur + ';">' + echapper(etape.statut) + '</p>' +
          (etape.date
            ? '<p class="mb-0 small text-muted">' + formaterDateHeure(etape.date) + '</p>'
            : '<p class="mb-0 small text-muted">—</p>') +
        '</div>' +
      '</div>';
  });

  html += '</div>';

  // infos récapitulatives si la commande est disponible
  if (cmd) {
    html +=
      '<hr>' +
      '<div class="row small">' +
        '<div class="col-6"><strong>Menu :</strong> ' + echapper(cmd.menuNom || '—') + '</div>' +
        '<div class="col-6"><strong>Convives :</strong> ' + (cmd.nbPersonnes || '—') + '</div>' +
        '<div class="col-6 mt-1"><strong>Date :</strong> ' + formaterDate(cmd.date) + '</div>' +
        '<div class="col-6 mt-1"><strong>Total :</strong> ' + (cmd.total ? cmd.total.toFixed(2) + ' €' : '—') + '</div>' +
      '</div>';
  }

  contenu.innerHTML = html;
}

function construireHistoriqueMinimal(cmd) {
  if (!cmd) return [];

  var etapesOrdre = [
    'En attente', 'Confirmée', 'En préparation',
    'En cours de livraison', 'Livrée', 'Terminée'
  ];

  // cas spécial annulation
  if (cmd.statut === 'Annulée') {
    return [
      { statut: 'En attente', date: cmd.dateCreation || cmd.date, actif: true },
      { statut: 'Annulée', date: cmd.dateDerniereModif || null, actif: true }
    ];
  }

  var indexActuel = etapesOrdre.indexOf(cmd.statut);
  if (indexActuel === -1) indexActuel = 0;

  var historique = [];
  for (var i = 0; i <= Math.min(indexActuel, etapesOrdre.length - 1); i++) {
    historique.push({
      statut: etapesOrdre[i],
      date: i === 0 ? (cmd.dateCreation || cmd.date) : null,
      actif: true
    });
  }

  // ajouter les étapes futures (grisées)
  for (var j = indexActuel + 1; j < etapesOrdre.length; j++) {
    historique.push({
      statut: etapesOrdre[j],
      date: null,
      actif: false
    });
  }

  return historique;
}

function getIconeStatut(statut) {
  var icones = {
    'En attente': 'bi-hourglass-split',
    'Confirmée': 'bi-check-lg',
    'En préparation': 'bi-gear',
    'En cours de livraison': 'bi-truck',
    'Livrée': 'bi-check-circle',
    'En attente du retour de matériel': 'bi-box-seam',
    'Terminée': 'bi-check-all',
    'Annulée': 'bi-x-lg',
    'Commande passée': 'bi-bag-plus'
  };
  return icones[statut] || 'bi-circle';
}


// ══════════════════════════════════════════════════════════════
// MODIFIER UNE COMMANDE (tant que pas acceptée)
// L'énoncé dit : "la modification est également possible
// (tout est modifiable, sauf, le choix du menu)"
// ══════════════════════════════════════════════════════════════

function ouvrirModifier(commandeId) {
  var cmd = toutesLesCommandesClient.find(function(c) { return c.id == commandeId; });
  if (!cmd) return;

  document.getElementById('modif-cmd-id').value = cmd.id;
  document.getElementById('modif-menu-info').textContent =
    'Menu : ' + (cmd.menuNom || '—') + ' (non modifiable)';
  document.getElementById('modif-nb-personnes').value = cmd.nbPersonnes || '';
  document.getElementById('modif-date').value = cmd.date ? cmd.date.split('T')[0] : '';
  document.getElementById('modif-heure').value = cmd.heure || '';
  document.getElementById('modif-adresse').value = cmd.adresse || '';
  document.getElementById('modif-cp').value = cmd.codePostal || '';
  document.getElementById('modif-ville').value = cmd.ville || '';

  var modal = new bootstrap.Modal(document.getElementById('modal-modifier'));
  modal.show();
}

async function sauvegarderModification() {
  var commandeId = document.getElementById('modif-cmd-id').value;

  var donnees = {
    nb_personnes: parseInt(document.getElementById('modif-nb-personnes').value),
    date: document.getElementById('modif-date').value,
    heure: document.getElementById('modif-heure').value,
    adresse: document.getElementById('modif-adresse').value.trim(),
    code_postal: document.getElementById('modif-cp').value.trim(),
    ville: document.getElementById('modif-ville').value.trim()
  };

  if (!donnees.nb_personnes || !donnees.date || !donnees.adresse) {
    alert('Veuillez remplir tous les champs obligatoires.');
    return;
  }

  try {
    await fetchAPI('/commandes/' + commandeId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees)
    });

    bootstrap.Modal.getInstance(document.getElementById('modal-modifier')).hide();

    // recharger les commandes pour voir les changements
    chargerCommandes();

    if (typeof afficherToast === 'function') {
      afficherToast('Commande modifiée avec succès.', 'success');
    }

  } catch (err) {
    alert('Erreur lors de la modification : ' + (err.message || 'Réessayez.'));
  }
}


// ══════════════════════════════════════════════════════════════
// ANNULER UNE COMMANDE (tant que pas acceptée)
// ══════════════════════════════════════════════════════════════

async function annulerCommande(commandeId) {
  if (!confirm('Voulez-vous vraiment annuler cette commande ?')) return;

  try {
    await fetchAPI('/commandes/' + commandeId + '/annuler', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'Annulée' })
    });

    // mettre à jour localement
    var cmd = toutesLesCommandesClient.find(function(c) { return c.id == commandeId; });
    if (cmd) cmd.statut = 'Annulée';

    chargerCommandes();

    if (typeof afficherToast === 'function') {
      afficherToast('Commande annulée.', 'warning');
    }

  } catch (err) {
    alert('Erreur lors de l\'annulation.');
  }
}


// ══════════════════════════════════════════════════════════════
// AVIS CLIENT (commande terminée)
// L'énoncé dit : "il doit pouvoir donner entre note entre 1 et 5,
// suivi d'un commentaire"
// ══════════════════════════════════════════════════════════════

function ouvrirAvis(commandeId) {
  document.getElementById('avis-cmd-id').value = commandeId;
  document.getElementById('avis-note').value = 5;
  document.getElementById('avis-stars-display').textContent = '★★★★★';
  document.getElementById('avis-commentaire').value = '';

  var modal = new bootstrap.Modal(document.getElementById('modal-avis'));
  modal.show();
}

async function soumettreAvis() {
  var commandeId = document.getElementById('avis-cmd-id').value;
  var note = parseInt(document.getElementById('avis-note').value);
  var commentaire = document.getElementById('avis-commentaire').value.trim();

  if (!commentaire) {
    alert('Veuillez saisir un commentaire.');
    document.getElementById('avis-commentaire').focus();
    return;
  }

  if (commentaire.length < 10) {
    alert('Le commentaire doit contenir au moins 10 caractères.');
    document.getElementById('avis-commentaire').focus();
    return;
  }

  try {
    await fetchAPI('/avis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commande_id: commandeId,
        note: note,
        commentaire: commentaire
      })
    });

    bootstrap.Modal.getInstance(document.getElementById('modal-avis')).hide();

    // marquer la commande comme ayant un avis
    var cmd = toutesLesCommandesClient.find(function(c) { return c.id == commandeId; });
    if (cmd) cmd.avisDepose = true;

    // recharger pour masquer le bouton avis
    chargerCommandes();

    if (typeof afficherToast === 'function') {
      afficherToast('Merci pour votre avis ! Il sera visible après validation.', 'success');
    }

  } catch (err) {
    alert('Erreur lors de l\'envoi de l\'avis : ' + (err.message || 'Réessayez.'));
  }
}


// ══════════════════════════════════════════════════════════════
// PROFIL
// ══════════════════════════════════════════════════════════════

async function sauvegarderProfil(e) {
  e.preventDefault();

  var succes = document.getElementById('profil-succes');
  var erreur = document.getElementById('profil-erreur');
  succes.classList.add('d-none');
  erreur.classList.add('d-none');

  var donnees = {
    prenom: document.getElementById('profil-prenom').value.trim(),
    nom: document.getElementById('profil-nom').value.trim(),
    email: document.getElementById('profil-email').value.trim(),
    telephone: document.getElementById('profil-tel').value.trim(),
    adresse: document.getElementById('profil-adresse').value.trim(),
    code_postal: document.getElementById('profil-cp').value.trim(),
    ville: document.getElementById('profil-ville').value.trim()
  };

  try {
    var data = await fetchAPI('/utilisateurs/profil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees)
    });

    // mettre à jour le localStorage avec les nouvelles infos
    var user = getUtilisateurConnecte();
    if (user) {
      user.prenom = donnees.prenom;
      user.nom = donnees.nom;
      user.email = donnees.email;
      user.telephone = donnees.telephone;
      var token = localStorage.getItem('token');
      setUtilisateurConnecte(user, token);

      // mettre à jour le prénom affiché
      document.getElementById('client-prenom').textContent = user.prenom || user.nom;
    }

    succes.classList.remove('d-none');

  } catch (err) {
    erreur.textContent = err.message || 'Erreur lors de la mise à jour.';
    erreur.classList.remove('d-none');
  }
}


// ══════════════════════════════════════════════════════════════
// MOT DE PASSE — Corrigé : 10 chars + spécial
// ══════════════════════════════════════════════════════════════

async function changerMotDePasse(e) {
  e.preventDefault();

  // reset erreurs
  var form = document.getElementById('form-mdp');
  form.querySelectorAll('.is-invalid').forEach(function(el) {
    el.classList.remove('is-invalid');
  });
  document.getElementById('mdp-succes').classList.add('d-none');
  document.getElementById('mdp-erreur').classList.add('d-none');

  var actuel = document.getElementById('mdp-actuel');
  var nouveau = document.getElementById('mdp-nouveau');
  var confirmer = document.getElementById('mdp-confirmer');
  var valide = true;

  // champ actuel obligatoire
  if (!actuel.value) {
    actuel.classList.add('is-invalid');
    document.getElementById('erreur-mdp-actuel').textContent = 'Champ obligatoire.';
    valide = false;
  }

  // nouveau mdp : 10 chars minimum
  if (!nouveau.value) {
    nouveau.classList.add('is-invalid');
    document.getElementById('erreur-mdp-nouveau').textContent = 'Champ obligatoire.';
    valide = false;
  } else if (nouveau.value.length < 10) {
    nouveau.classList.add('is-invalid');
    document.getElementById('erreur-mdp-nouveau').textContent =
      'Le mot de passe doit contenir au moins 10 caractères.';
    valide = false;
  } else if (!/[A-Z]/.test(nouveau.value)) {
    nouveau.classList.add('is-invalid');
    document.getElementById('erreur-mdp-nouveau').textContent =
      'Le mot de passe doit contenir au moins une majuscule.';
    valide = false;
  } else if (!/[a-z]/.test(nouveau.value)) {
    nouveau.classList.add('is-invalid');
    document.getElementById('erreur-mdp-nouveau').textContent =
      'Le mot de passe doit contenir au moins une minuscule.';
    valide = false;
  } else if (!/[0-9]/.test(nouveau.value)) {
    nouveau.classList.add('is-invalid');
    document.getElementById('erreur-mdp-nouveau').textContent =
      'Le mot de passe doit contenir au moins un chiffre.';
    valide = false;
  } else if (!/[^A-Za-z0-9]/.test(nouveau.value)) {
    nouveau.classList.add('is-invalid');
    document.getElementById('erreur-mdp-nouveau').textContent =
      'Le mot de passe doit contenir au moins un caractère spécial (!@#$%&*...).';
    valide = false;
  }

  // confirmation
  if (nouveau.value !== confirmer.value) {
    confirmer.classList.add('is-invalid');
    document.getElementById('erreur-mdp-confirmer').textContent =
      'Les mots de passe ne correspondent pas.';
    valide = false;
  }

  if (!valide) return;

  try {
    await fetchAPI('/utilisateurs/mot-de-passe', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motDePasseActuel: actuel.value,
        nouveauMotDePasse: nouveau.value
      })
    });

    document.getElementById('mdp-succes').classList.remove('d-none');
    actuel.value = '';
    nouveau.value = '';
    confirmer.value = '';

  } catch (err) {
    if (err.status === 401) {
      actuel.classList.add('is-invalid');
      document.getElementById('erreur-mdp-actuel').textContent =
        'Mot de passe actuel incorrect.';
    } else {
      document.getElementById('mdp-erreur').textContent = err.message || 'Erreur lors de la modification.';
      document.getElementById('mdp-erreur').classList.remove('d-none');
    }
  }
}


// ══════════════════════════════════════════════════════════════
// SUPPRESSION DE COMPTE
// ══════════════════════════════════════════════════════════════

async function supprimerCompte() {
  var confirmation = prompt(
    'Tapez "SUPPRIMER" pour confirmer la suppression définitive de votre compte :'
  );
  if (confirmation !== 'SUPPRIMER') return;

  try {
    await fetchAPI('/utilisateurs/compte', {
      method: 'DELETE'
    });

    deconnexion();
    alert('Votre compte a été supprimé.');
    window.location.href = '../index.html';

  } catch (err) {
    alert('Erreur lors de la suppression. Veuillez réessayer.');
  }
}