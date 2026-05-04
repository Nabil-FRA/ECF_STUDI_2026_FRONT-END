// confirmation.js
// gestion de la page confirmation de commande
// fait par moi le 15/04/2026

// ── au chargement ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // vérifier si l'utilisateur est connecté
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) {
    window.location.href = 'connexion.html';
    return;
  }

  // priorité 1 : données de la dernière commande passée (sessionStorage)
  const donneesCommande = JSON.parse(sessionStorage.getItem('derniere_commande') || 'null');
  if (donneesCommande) {
    afficherRecap(donneesCommande);
    // nettoyer après affichage
    sessionStorage.removeItem('derniere_commande');
    return;
  }

  // priorité 2 : id de commande passé en paramètre URL (?id=...)
  const params = new URLSearchParams(window.location.search);
  const commandeId = params.get('id');
  if (commandeId) {
    chargerCommande(commandeId);
    return;
  }

  // aucune donnée disponible → page d'accueil
  window.location.href = '../index.html';
});

// ── charger la commande depuis l'API ────────────────────────
async function chargerCommande(id) {
  try {
    // fetchAPI est fourni par api.js (gère le token Bearer automatiquement)
    const reponse = await fetchAPI('/user/commandes/' + id);
    const commandeData = reponse.commande || reponse;

    // normaliser les champs API → format attendu par afficherRecap
    const donnees = {
      numero:         commandeData.numero_commande || commandeData.id || id,
      menuNom:        commandeData.menu ? commandeData.menu.titre : '',
      date:           commandeData.date_prestation || '',
      heure:          commandeData.heure_livraison || '',
      nbPersonnes:    commandeData.nombre_personne || 0,
      adresse:        commandeData.lieu_prestation || '',
      codePostal:     '',
      ville:          '',
      sousTotal:      commandeData.prix_menu || 0,
      reduction:      0,
      fraisLivraison: commandeData.prix_livraison || 0,
      total:          commandeData.prix_total || 0,
    };

    afficherRecap(donnees);

  } catch (erreur) {
    console.error('Erreur chargement commande :', erreur);
    window.location.href = '../index.html';
  }
}

// ── afficher le récapitulatif ───────────────────────────────
function afficherRecap(commande) {
  // email client
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  document.getElementById('email-client').textContent = user.email || 'votre adresse e-mail';

  // numéro de commande
  document.getElementById('num-commande').textContent = commande.numero || commande.id || '—';

  // infos prestation
  document.getElementById('recap-menu').textContent = commande.menuNom || commande.menu || '—';
  document.getElementById('recap-date').textContent = formaterDate(commande.date) || '—';
  document.getElementById('recap-heure').textContent = commande.heure || '—';
  document.getElementById('recap-convives').textContent = commande.nbPersonnes
    ? commande.nbPersonnes + ' personne(s)'
    : '—';

  // infos livraison
  document.getElementById('recap-adresse').textContent = commande.adresse || '—';
  document.getElementById('recap-cp').textContent = commande.codePostal || '—';
  document.getElementById('recap-ville').textContent = commande.ville || '—';

  // prix
  document.getElementById('recap-sous-total').textContent =
    (commande.sousTotal || 0).toFixed(2) + ' €';

  // réduction (si applicable)
  if (commande.reduction && commande.reduction > 0) {
    document.getElementById('ligne-reduction').style.display = 'flex';
    document.getElementById('recap-reduction').textContent =
      '-' + commande.reduction.toFixed(2) + ' €';
  }

  // livraison
  if (commande.fraisLivraison !== undefined) {
    document.getElementById('recap-livraison').textContent =
      commande.fraisLivraison === 0
        ? 'Gratuit'
        : commande.fraisLivraison.toFixed(2) + ' €';
  }

  // total
  document.getElementById('recap-total').textContent =
    (commande.total || 0).toFixed(2) + ' €';
}

// ── formater une date ISO en français ───────────────────────
function formaterDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}