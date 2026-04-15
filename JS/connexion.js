// page connexion.js
// gestion du formulaire de connexion
// fait par moi le 15/04/2026

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

// ---- toggle afficher/masquer mot de passe ----
function initTogglePassword() {
  const btn = document.getElementById('toggle-password');
  const input = document.getElementById('password');
  const iconEye = document.getElementById('icon-eye');
  const iconEyeSlash = document.getElementById('icon-eye-slash');

  btn.addEventListener('click', function() {
    const isPassword = input.type === 'password';

    if (isPassword) {
      // on affiche le mot de passe
      input.type = 'text';
      btn.setAttribute('aria-label', 'Masquer le mot de passe');
      btn.setAttribute('aria-pressed', 'true');
      iconEye.classList.add('d-none');
      iconEyeSlash.classList.remove('d-none');
    } else {
      // on masque le mot de passe
      input.type = 'password';
      btn.setAttribute('aria-label', 'Afficher le mot de passe');
      btn.setAttribute('aria-pressed', 'false');
      iconEye.classList.remove('d-none');
      iconEyeSlash.classList.add('d-none');
    }

    // je garde le focus sur l'input pour que l'utilisateur puisse continuer à taper
    input.focus();
  });

  console.log('toggle password initialisé');
}

// ---- validation du formulaire ----
function validerFormulaire() {
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  let ok = true;

  // reset les erreurs
  email.classList.remove('is-invalid', 'is-valid');
  password.classList.remove('is-invalid', 'is-valid');

  // validation email
  if (!email.checkValidity()) {
    email.classList.add('is-invalid');
    ok = false;
  } else {
    email.classList.add('is-valid');
  }

  // validation password
  if (!password.value || password.value.length < 8) {
    password.classList.add('is-invalid');
    document.getElementById('password-error').textContent = 
      password.value.length > 0 && password.value.length < 8
        ? 'Le mot de passe doit contenir au moins 8 caractères.'
        : 'Veuillez saisir votre mot de passe.';
    ok = false;
  } else {
    password.classList.add('is-valid');
  }

  if (!ok) {
    // focus sur le premier champ en erreur
    const premierErreur = document.querySelector('.is-invalid');
    if (premierErreur) premierErreur.focus();
  }

  return ok;
}

// ---- soumission du formulaire ----
async function soumettreConnexion(e) {
  e.preventDefault();
  effacerAlerte();

  // je valide d'abord
  if (!validerFormulaire()) {
    afficherAlerte('Merci de corriger les erreurs.', 'danger');
    return;
  }

  const btn = document.getElementById('btn-connexion');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('remember-me').checked;

  // je désactive le bouton pour éviter le double clic
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> Connexion...';

  // je récupère le token csrf
  const csrf = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

  try {
    // appel à l'API de connexion
    const response = await fetchAPI('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify({
        email: email,
        password: password,
        remember_me: rememberMe
      })
    });

    console.log('connexion réussie !', response);

    // je stocke les infos de l'utilisateur (la fonction est dans auth.js)
    setUtilisateurConnecte(response.user, response.token);

    // message de succès
    afficherAlerte('Connexion réussie ! Redirection...', 'success');

    // redirection après 1 seconde
    setTimeout(function() {
      // je vérifie s'il y a une URL de retour dans les paramètres
      const params = new URLSearchParams(window.location.search);
      const retour = params.get('retour');

      if (retour) {
        // je décode l'URL et je redirige
        window.location.href = decodeURIComponent(retour);
      } else {
        // sinon je vais à l'accueil
        window.location.href = '../index.html';
      }
    }, 1000);

  } catch(err) {
    console.error('erreur connexion', err);

    // je gère les différents types d'erreurs
    let message = 'Une erreur est survenue, veuillez réessayer.';

    if (err.status === 401) {
      message = 'E-mail ou mot de passe incorrect.';
    } else if (err.status === 429) {
      message = 'Trop de tentatives. Veuillez patienter quelques minutes.';
    } else if (err.message) {
      message = err.message;
    }

    afficherAlerte(message, 'danger');

    // je réactive le bouton
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = 'Se connecter';

    // focus sur le champ email pour réessayer
    document.getElementById('email').focus();
  }
}

// ---- vérifier si déjà connecté ----
function checkDejaConnecte() {
  const user = getUtilisateurConnecte();
  if (user) {
    // l'utilisateur est déjà connecté, je le préviens
    console.log('utilisateur déjà connecté:', user.email);
    
    // je vérifie s'il y a une URL de retour
    const params = new URLSearchParams(window.location.search);
    const retour = params.get('retour');

    if (retour) {
      // redirection directe vers la page demandée
      window.location.href = decodeURIComponent(retour);
    } else {
      // j'affiche un message et propose de continuer ou se déconnecter
      afficherAlerte(
        'Vous êtes déjà connecté en tant que ' + echapper(user.email) + '. ' +
        '<a href="../index.html" class="alert-link">Continuer</a> ou ' +
        '<a href="#" id="link-deconnexion" class="alert-link">se déconnecter</a>.',
        'info'
      );

      // j'ajoute l'événement sur le lien de déconnexion
      setTimeout(function() {
        const linkDeco = document.getElementById('link-deconnexion');
        if (linkDeco) {
          linkDeco.addEventListener('click', function(e) {
            e.preventDefault();
            deconnexion(); // fonction dans auth.js
            window.location.reload();
          });
        }
      }, 100);
    }
  }
}

// ---- initialisation au chargement ----
document.addEventListener('DOMContentLoaded', function() {
  console.log('--- initialisation connexion.js ---');

  // 1. vérifier si déjà connecté
  checkDejaConnecte();

  // 2. injecter le token csrf
  const csrf = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
  document.getElementById('csrf-token-field').value = csrf;

  // 3. initialiser le toggle password
  initTogglePassword();

  // 4. événement de soumission
  document.getElementById('form-connexion').addEventListener('submit', soumettreConnexion);

  // 5. si on vient de la page commande, afficher un message
  const params = new URLSearchParams(window.location.search);
  if (params.get('retour') && params.get('retour').includes('commande')) {
    afficherAlerte('Veuillez vous connecter pour finaliser votre commande.', 'info');
  }

  console.log('connexion.js initialisé');
});