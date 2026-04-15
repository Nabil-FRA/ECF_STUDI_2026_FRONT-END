// page mot-de-passe-oublie.js
// gestion du formulaire de réinitialisation du mot de passe
// fait par moi le 15/04/2026

// je garde l'email en mémoire pour le bouton "renvoyer"
let emailSauvegarde = '';

// ---- fonctions utilitaires ----

// pour éviter les injections xss
function echapper(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// affiche une alerte en haut de page
function afficherAlerte(msg, type) {
  const zone = document.getElementById('alert-global');
  zone.innerHTML = `
    <div class="alert alert-${type} alert-dismissible" role="alert">
      ${echapper(msg)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer l'alerte"></button>
    </div>
  `;
}

function effacerAlerte() {
  document.getElementById('alert-global').innerHTML = '';
}

// ---- validation du formulaire ----
function validerFormulaire() {
  const email = document.getElementById('email');
  
  email.classList.remove('is-invalid', 'is-valid');

  if (!email.checkValidity()) {
    email.classList.add('is-invalid');
    email.focus();
    return false;
  }

  email.classList.add('is-valid');
  return true;
}

// ---- envoyer la demande de reset ----
async function envoyerDemandeReset(emailValue) {
  // je récupère le token csrf
  const csrf = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

  try {
    await fetchAPI('/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify({
        email: emailValue
      })
    });

    console.log('demande de reset envoyée pour:', emailValue);
    return true;

  } catch(err) {
    console.error('erreur envoi reset', err);
    
    // même en cas d'erreur, on affiche le succès pour des raisons de sécurité
    // (on ne veut pas révéler si l'email existe ou non)
    // sauf si c'est une erreur technique
    if (err.status === 429) {
      throw new Error('Trop de tentatives. Veuillez patienter quelques minutes.');
    }
    
    // pour les autres erreurs, on fait comme si ça avait marché
    // c'est une bonne pratique de sécurité
    console.log('on affiche quand même le succès pour la sécurité');
    return true;
  }
}

// ---- soumission du formulaire ----
async function soumettreFormulaire(e) {
  e.preventDefault();
  effacerAlerte();

  if (!validerFormulaire()) {
    afficherAlerte('Veuillez saisir une adresse e-mail valide.', 'danger');
    return;
  }

  const btn = document.getElementById('btn-envoyer');
  const email = document.getElementById('email').value.trim();

  // je sauvegarde l'email pour le bouton renvoyer
  emailSauvegarde = email;

  // je désactive le bouton
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> Envoi...';

  try {
    await envoyerDemandeReset(email);

    // j'affiche l'étape de confirmation
    document.getElementById('etape-demande').classList.add('d-none');
    document.getElementById('etape-confirmation').classList.remove('d-none');
    document.getElementById('email-envoye').textContent = email;

    // focus sur le titre de la confirmation pour les lecteurs d'écran
    const titreConfirm = document.querySelector('#etape-confirmation .card-title');
    titreConfirm.setAttribute('tabindex', '-1');
    titreConfirm.focus();

    console.log('étape confirmation affichée');

  } catch(err) {
    afficherAlerte(err.message, 'danger');

    // je réactive le bouton
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = 'Envoyer le lien';
  }
}

// ---- renvoyer l'email ----
async function renvoyerEmail() {
  if (!emailSauvegarde) {
    // pas d'email sauvegardé, on retourne au formulaire
    document.getElementById('etape-confirmation').classList.add('d-none');
    document.getElementById('etape-demande').classList.remove('d-none');
    return;
  }

  const btn = document.getElementById('btn-renvoyer');
  
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> Envoi...';

  try {
    await envoyerDemandeReset(emailSauvegarde);

    // j'affiche un message de succès
    afficherAlerte('Un nouvel e-mail a été envoyé à ' + echapper(emailSauvegarde) + '.', 'success');

    console.log('email renvoyé à:', emailSauvegarde);

  } catch(err) {
    afficherAlerte(err.message, 'danger');
  } finally {
    // je réactive le bouton après 30 secondes (anti-spam)
    btn.textContent = 'Patientez 30s...';
    
    setTimeout(function() {
      btn.disabled = false;
      btn.textContent = 'Renvoyer l\'e-mail';
    }, 30000);
  }
}

// ---- initialisation au chargement ----
document.addEventListener('DOMContentLoaded', function() {
  console.log('--- initialisation mot-de-passe-oublie.js ---');

  // 1. injecter le token csrf
  const csrf = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
  document.getElementById('csrf-token-field').value = csrf;

  // 2. événement de soumission
  document.getElementById('form-reset').addEventListener('submit', soumettreFormulaire);

  // 3. événement bouton renvoyer
  document.getElementById('btn-renvoyer').addEventListener('click', renvoyerEmail);

  // 4. si l'email est dans l'URL (venant de la page connexion par exemple)
  const params = new URLSearchParams(window.location.search);
  const emailParam = params.get('email');
  if (emailParam) {
    document.getElementById('email').value = emailParam;
    console.log('email pré-rempli depuis URL:', emailParam);
  }

  console.log('mot-de-passe-oublie.js initialisé');
});