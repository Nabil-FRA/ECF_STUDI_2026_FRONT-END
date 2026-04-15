// page inscription.js
// gestion du formulaire d'inscription
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
  // je scroll vers l'alerte pour que l'utilisateur la voie
  zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function effacerAlerte() {
  document.getElementById('alert-global').innerHTML = '';
}

// ---- toggle afficher/masquer mot de passe ----
function initTogglePassword() {
  const btn = document.getElementById('toggle-password');
  const input = document.getElementById('password');
  const inputConfirm = document.getElementById('password-confirm');
  const iconEye = document.getElementById('icon-eye');
  const iconEyeSlash = document.getElementById('icon-eye-slash');

  btn.addEventListener('click', function() {
    const isPassword = input.type === 'password';

    if (isPassword) {
      input.type = 'text';
      inputConfirm.type = 'text'; // je change aussi la confirmation
      btn.setAttribute('aria-label', 'Masquer le mot de passe');
      btn.setAttribute('aria-pressed', 'true');
      iconEye.classList.add('d-none');
      iconEyeSlash.classList.remove('d-none');
    } else {
      input.type = 'password';
      inputConfirm.type = 'password';
      btn.setAttribute('aria-label', 'Afficher le mot de passe');
      btn.setAttribute('aria-pressed', 'false');
      iconEye.classList.remove('d-none');
      iconEyeSlash.classList.add('d-none');
    }

    input.focus();
  });

  console.log('toggle password initialisé');
}

// ---- indicateur de force du mot de passe ----
function initPasswordStrength() {
  const input = document.getElementById('password');
  const strengthDiv = document.getElementById('password-strength');
  const strengthFill = document.getElementById('strength-fill');
  const strengthText = document.getElementById('strength-text');

  input.addEventListener('input', function() {
    const pwd = input.value;

    if (pwd.length === 0) {
      strengthDiv.classList.add('d-none');
      return;
    }

    strengthDiv.classList.remove('d-none');

    // je calcule la force du mot de passe
    let score = 0;
    let feedback = [];

    // longueur
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;

    // majuscule
    if (/[A-Z]/.test(pwd)) {
      score++;
    } else {
      feedback.push('une majuscule');
    }

    // minuscule
    if (/[a-z]/.test(pwd)) {
      score++;
    } else {
      feedback.push('une minuscule');
    }

    // chiffre
    if (/[0-9]/.test(pwd)) {
      score++;
    } else {
      feedback.push('un chiffre');
    }

    // caractère spécial
    if (/[^A-Za-z0-9]/.test(pwd)) {
      score++;
    }

    // j'affiche le résultat
    let width, color, text;

    if (score <= 2) {
      width = '25%';
      color = '#dc3545'; // rouge
      text = 'Faible';
    } else if (score <= 4) {
      width = '50%';
      color = '#ffc107'; // jaune
      text = 'Moyen';
    } else if (score <= 5) {
      width = '75%';
      color = '#0dcaf0'; // bleu
      text = 'Bon';
    } else {
      width = '100%';
      color = '#198754'; // vert
      text = 'Excellent';
    }

    strengthFill.style.width = width;
    strengthFill.style.backgroundColor = color;

    if (feedback.length > 0 && score < 5) {
      strengthText.textContent = text + ' — Ajoutez : ' + feedback.join(', ');
    } else {
      strengthText.textContent = text;
    }
  });

  console.log('password strength initialisé');
}

// ---- validation du formulaire ----
function validerFormulaire() {
  const champs = document.querySelectorAll('#form-inscription input[required]');
  let ok = true;

  // reset toutes les erreurs
  champs.forEach(function(champ) {
    champ.classList.remove('is-invalid', 'is-valid');
  });

  // validation de chaque champ
  champs.forEach(function(champ) {
    if (!champ.checkValidity()) {
      champ.classList.add('is-invalid');
      ok = false;
    } else {
      champ.classList.add('is-valid');
    }
  });

  // validation custom du mot de passe
  const password = document.getElementById('password');
  const pwdValue = password.value;

  if (pwdValue.length < 8) {
    password.classList.add('is-invalid');
    document.getElementById('password-error').textContent = 
      'Le mot de passe doit contenir au moins 8 caractères.';
    ok = false;
  } else if (!/[A-Z]/.test(pwdValue)) {
    password.classList.add('is-invalid');
    document.getElementById('password-error').textContent = 
      'Le mot de passe doit contenir au moins une majuscule.';
    ok = false;
  } else if (!/[0-9]/.test(pwdValue)) {
    password.classList.add('is-invalid');
    document.getElementById('password-error').textContent = 
      'Le mot de passe doit contenir au moins un chiffre.';
    ok = false;
  }

  // vérification que les mots de passe correspondent
  const passwordConfirm = document.getElementById('password-confirm');
  if (password.value !== passwordConfirm.value) {
    passwordConfirm.classList.add('is-invalid');
    document.getElementById('password-confirm-error').textContent = 
      'Les mots de passe ne correspondent pas.';
    ok = false;
  }

  // vérification checkbox CGV
  const checkbox = document.getElementById('accepte-cgv');
  if (!checkbox.checked) {
    checkbox.classList.add('is-invalid');
    ok = false;
  }

  if (!ok) {
    // focus sur le premier champ en erreur
    const premierErreur = document.querySelector('.is-invalid');
    if (premierErreur) premierErreur.focus();
  }

  return ok;
}

// ---- soumission du formulaire ----
async function soumettreInscription(e) {
  e.preventDefault();
  effacerAlerte();

  if (!validerFormulaire()) {
    afficherAlerte('Merci de corriger les erreurs.', 'danger');
    return;
  }

  const btn = document.getElementById('btn-inscription');

  // je désactive le bouton
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> Création du compte...';

  // je récupère les valeurs
  const data = {
    prenom: document.getElementById('prenom').value.trim(),
    nom: document.getElementById('nom').value.trim(),
    email: document.getElementById('email').value.trim(),
    gsm: document.getElementById('gsm').value.trim(),
    password: document.getElementById('password').value,
    newsletter: document.getElementById('newsletter').checked
  };

  // je récupère le token csrf
  const csrf = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

  try {
    const response = await fetchAPI('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify(data)
    });

    console.log('inscription réussie !', response);

    // je connecte automatiquement l'utilisateur
    if (response.user && response.token) {
      setUtilisateurConnecte(response.user, response.token);
    }

    // message de succès
    afficherAlerte('Compte créé avec succès ! Redirection...', 'success');

    // redirection après 1.5 secondes
    setTimeout(function() {
      // je vérifie s'il y a une URL de retour
      const params = new URLSearchParams(window.location.search);
      const retour = params.get('retour');

      if (retour) {
        window.location.href = decodeURIComponent(retour);
      } else {
        // sinon je vais à l'accueil
        window.location.href = '../index.html';
      }
    }, 1500);

  } catch(err) {
    console.error('erreur inscription', err);

    let message = 'Une erreur est survenue, veuillez réessayer.';

    if (err.status === 409) {
      message = 'Cette adresse e-mail est déjà utilisée. Voulez-vous vous connecter ?';
      // je mets le focus sur l'email
      document.getElementById('email').classList.add('is-invalid');
      document.getElementById('email').focus();
    } else if (err.status === 400) {
      message = err.message || 'Données invalides, veuillez vérifier le formulaire.';
    } else if (err.status === 429) {
      message = 'Trop de tentatives. Veuillez patienter quelques minutes.';
    } else if (err.message) {
      message = err.message;
    }

    afficherAlerte(message, 'danger');

    // je réactive le bouton
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = 'Créer mon compte';
  }
}

// ---- vérifier si déjà connecté ----
function checkDejaConnecte() {
  const user = getUtilisateurConnecte();
  if (user) {
    console.log('utilisateur déjà connecté:', user.email);
    afficherAlerte(
      'Vous êtes déjà connecté en tant que ' + echapper(user.email) + '. ' +
      '<a href="../index.html" class="alert-link">Retour à l\'accueil</a>',
      'info'
    );
  }
}

// ---- initialisation au chargement ----
document.addEventListener('DOMContentLoaded', function() {
  console.log('--- initialisation inscription.js ---');

  // 1. vérifier si déjà connecté
  checkDejaConnecte();

  // 2. injecter le token csrf
  const csrf = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
  document.getElementById('csrf-token-field').value = csrf;

  // 3. initialiser le toggle password
  initTogglePassword();

  // 4. initialiser l'indicateur de force du mot de passe
  initPasswordStrength();

  // 5. événement de soumission
  document.getElementById('form-inscription').addEventListener('submit', soumettreInscription);

  // 6. vérification en temps réel de la confirmation du mot de passe
  document.getElementById('password-confirm').addEventListener('input', function() {
    const pwd = document.getElementById('password').value;
    const pwdConfirm = this.value;

    this.classList.remove('is-invalid', 'is-valid');

    if (pwdConfirm.length > 0) {
      if (pwd === pwdConfirm) {
        this.classList.add('is-valid');
      } else {
        this.classList.add('is-invalid');
      }
    }
  });

  console.log('inscription.js initialisé');
});