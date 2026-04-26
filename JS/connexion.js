
function echapper(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function afficherAlerte(msg, type) {
  var zone = document.getElementById('alert-global');
  zone.innerHTML =
    '<div class="alert alert-' + type + ' alert-dismissible" role="alert">' +
      echapper(msg) +
      '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer l\'alerte"></button>' +
    '</div>';
}

function effacerAlerte() {
  document.getElementById('alert-global').innerHTML = '';
}

// ---- toggle afficher/masquer mot de passe ----
function initTogglePassword() {
  var btn = document.getElementById('toggle-password');
  var input = document.getElementById('password');
  var iconEye = document.getElementById('icon-eye');
  var iconEyeSlash = document.getElementById('icon-eye-slash');

  btn.addEventListener('click', function() {
    var isPassword = input.type === 'password';

    if (isPassword) {
      input.type = 'text';
      btn.setAttribute('aria-label', 'Masquer le mot de passe');
      btn.setAttribute('aria-pressed', 'true');
      iconEye.classList.add('d-none');
      iconEyeSlash.classList.remove('d-none');
    } else {
      input.type = 'password';
      btn.setAttribute('aria-label', 'Afficher le mot de passe');
      btn.setAttribute('aria-pressed', 'false');
      iconEye.classList.remove('d-none');
      iconEyeSlash.classList.add('d-none');
    }

    input.focus();
  });

  console.log('toggle password initialisé');
}

// ---- validation du formulaire ----
function validerFormulaire() {
  var email = document.getElementById('email');
  var password = document.getElementById('password');
  var ok = true;

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

  // validation password — corrigé : 10 chars minimum
  var pwdValue = password.value;

  if (!pwdValue) {
    password.classList.add('is-invalid');
    document.getElementById('password-error').textContent =
      'Veuillez saisir votre mot de passe.';
    ok = false;
  } else if (pwdValue.length < 10) {
    password.classList.add('is-invalid');
    document.getElementById('password-error').textContent =
      'Le mot de passe doit contenir au moins 10 caractères.';
    ok = false;
  } else {
    password.classList.add('is-valid');
  }

  if (!ok) {
    var premierErreur = document.querySelector('.is-invalid');
    if (premierErreur) premierErreur.focus();
  }

  return ok;
}

// ---- soumission du formulaire ----
async function soumettreConnexion(e) {
  e.preventDefault();
  effacerAlerte();

  if (!validerFormulaire()) {
    afficherAlerte('Merci de corriger les erreurs.', 'danger');
    return;
  }

  var btn = document.getElementById('btn-connexion');
  var email = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var rememberMe = document.getElementById('remember-me').checked;

  // désactive le bouton
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> Connexion...';

  // token csrf
  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  var csrf = csrfMeta ? csrfMeta.getAttribute('content') : '';

  try {
    var response = await fetchAPI('/auth/login', {
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

    // stocke les infos utilisateur (fonction dans auth.js)
    setUtilisateurConnecte(response.user, response.token);

    afficherAlerte('Connexion réussie ! Redirection...', 'success');

    // redirection après 1 seconde
    setTimeout(function() {
      var params = new URLSearchParams(window.location.search);
      var retour = params.get('retour');

      if (retour) {
        window.location.href = decodeURIComponent(retour);
      } else {
        window.location.href = '../index.html';
      }
    }, 1000);

  } catch(err) {
    console.error('erreur connexion', err);

    var message = 'Une erreur est survenue, veuillez réessayer.';

    if (err.status === 401) {
      message = 'E-mail ou mot de passe incorrect.';
    } else if (err.status === 429) {
      message = 'Trop de tentatives. Veuillez patienter quelques minutes.';
    } else if (err.message) {
      message = err.message;
    }

    afficherAlerte(message, 'danger');

    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = 'Se connecter';

    document.getElementById('email').focus();
  }
}

// ---- vérifier si déjà connecté ----
function checkDejaConnecte() {
  var user = getUtilisateurConnecte();
  if (user) {
    console.log('utilisateur déjà connecté:', user.email);

    var params = new URLSearchParams(window.location.search);
    var retour = params.get('retour');

    if (retour) {
      window.location.href = decodeURIComponent(retour);
    } else {
      afficherAlerte(
        'Vous êtes déjà connecté en tant que ' + echapper(user.email) + '. ' +
        '<a href="../index.html" class="alert-link">Continuer</a> ou ' +
        '<a href="#" id="link-deconnexion" class="alert-link">se déconnecter</a>.',
        'info'
      );

      setTimeout(function() {
        var linkDeco = document.getElementById('link-deconnexion');
        if (linkDeco) {
          linkDeco.addEventListener('click', function(e) {
            e.preventDefault();
            deconnexion();
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
  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  var csrf = csrfMeta ? csrfMeta.getAttribute('content') : '';
  var csrfField = document.getElementById('csrf-token-field');
  if (csrfField) csrfField.value = csrf;

  // 3. toggle password
  initTogglePassword();

  // 4. soumission
  document.getElementById('form-connexion').addEventListener('submit', soumettreConnexion);

  // 5. message si on vient de la page commande
  var params = new URLSearchParams(window.location.search);
  if (params.get('retour') && params.get('retour').includes('commande')) {
    afficherAlerte('Veuillez vous connecter pour finaliser votre commande.', 'info');
  }

  console.log('connexion.js initialisé');
});