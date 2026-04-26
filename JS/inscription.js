// page inscription.js
// gestion du formulaire d'inscription
// corrigé : mot de passe 10 caractères + caractère spécial obligatoire
// corrigé : envoi de l'adresse postale (exigé par l'énoncé)
// corrigé : IDs synchronisés avec inscription.html

// ---- fonctions utilitaires ----

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
  var zone = document.getElementById('erreur-globale');
  if (!zone) return;

  if (type === 'success') {
    // pour le succès on utilise le bloc dédié
    var succesBloc = document.getElementById('succes-inscription');
    if (succesBloc) {
      succesBloc.classList.remove('d-none');
      return;
    }
  }

  zone.textContent = msg;
  zone.classList.remove('d-none');
  zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function effacerAlerte() {
  var zone = document.getElementById('erreur-globale');
  if (zone) {
    zone.textContent = '';
    zone.classList.add('d-none');
  }
}

// ---- toggle afficher/masquer mot de passe ----
function initTogglePasswords() {
  var toggleBtns = document.querySelectorAll('.toggle-password');

  toggleBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var targetId = btn.getAttribute('data-target');
      var input = document.getElementById(targetId);
      if (!input) return;

      var icon = btn.querySelector('i');
      var isPassword = input.type === 'password';

      if (isPassword) {
        input.type = 'text';
        btn.setAttribute('aria-label', 'Masquer le mot de passe');
        if (icon) {
          icon.classList.remove('bi-eye');
          icon.classList.add('bi-eye-slash');
        }
      } else {
        input.type = 'password';
        btn.setAttribute('aria-label', 'Afficher le mot de passe');
        if (icon) {
          icon.classList.remove('bi-eye-slash');
          icon.classList.add('bi-eye');
        }
      }

      input.focus();
    });
  });

  console.log('toggle password initialisé');
}

// ---- indicateur de force du mot de passe ----
function initPasswordStrength() {
  var input = document.getElementById('password');
  var strengthBar = document.getElementById('password-strength');
  var strengthText = document.getElementById('password-strength-text');

  if (!input || !strengthBar) return;

  input.addEventListener('input', function() {
    var pwd = input.value;

    if (pwd.length === 0) {
      strengthBar.style.width = '0%';
      strengthBar.className = 'progress-bar';
      if (strengthText) strengthText.textContent = '';
      return;
    }

    // calcul du score
    var score = 0;
    var feedback = [];

    // longueur
    if (pwd.length >= 10) {
      score++;
    } else {
      feedback.push(10 - pwd.length + ' caractère(s) de plus');
    }
    if (pwd.length >= 14) score++;

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

    // caractère spécial (corrigé : obligatoire selon l'énoncé)
    if (/[^A-Za-z0-9]/.test(pwd)) {
      score++;
    } else {
      feedback.push('un caractère spécial (!@#$%...)');
    }

    // affichage
    var width, couleur, texte;

    if (score <= 2) {
      width = '20%';
      couleur = 'bg-danger';
      texte = 'Faible';
    } else if (score <= 3) {
      width = '40%';
      couleur = 'bg-warning';
      texte = 'Moyen';
    } else if (score <= 4) {
      width = '60%';
      couleur = 'bg-info';
      texte = 'Bon';
    } else if (score <= 5) {
      width = '80%';
      couleur = 'bg-primary';
      texte = 'Très bon';
    } else {
      width = '100%';
      couleur = 'bg-success';
      texte = 'Excellent';
    }

    strengthBar.style.width = width;
    strengthBar.className = 'progress-bar ' + couleur;

    if (strengthText) {
      if (feedback.length > 0 && score < 6) {
        strengthText.textContent = texte + ' — Ajoutez : ' + feedback.join(', ');
      } else {
        strengthText.textContent = texte;
      }
    }
  });

  console.log('password strength initialisé');
}

// ---- validation du formulaire ----
function validerFormulaire() {
  var form = document.getElementById('inscription-form');
  var champs = form.querySelectorAll('input[required]');
  var ok = true;

  // reset toutes les erreurs
  champs.forEach(function(champ) {
    champ.classList.remove('is-invalid', 'is-valid');
    var fb = champ.parentElement.querySelector('.invalid-feedback') ||
             champ.closest('.mb-3').querySelector('.invalid-feedback');
    if (fb) fb.textContent = '';
  });

  // validation HTML5 de base pour chaque champ requis
  champs.forEach(function(champ) {
    // on ignore les checkboxes ici (traité séparément)
    if (champ.type === 'checkbox') return;

    if (!champ.checkValidity()) {
      champ.classList.add('is-invalid');
      ok = false;
    } else {
      champ.classList.add('is-valid');
    }
  });

  // ── validation custom du mot de passe (10 chars + 4 critères) ──
  var password = document.getElementById('password');
  var pwdValue = password.value;

  if (pwdValue.length < 10) {
    password.classList.remove('is-valid');
    password.classList.add('is-invalid');
    setErreur(password, 'Le mot de passe doit contenir au moins 10 caractères.');
    ok = false;
  } else if (!/[A-Z]/.test(pwdValue)) {
    password.classList.remove('is-valid');
    password.classList.add('is-invalid');
    setErreur(password, 'Le mot de passe doit contenir au moins une majuscule.');
    ok = false;
  } else if (!/[a-z]/.test(pwdValue)) {
    password.classList.remove('is-valid');
    password.classList.add('is-invalid');
    setErreur(password, 'Le mot de passe doit contenir au moins une minuscule.');
    ok = false;
  } else if (!/[0-9]/.test(pwdValue)) {
    password.classList.remove('is-valid');
    password.classList.add('is-invalid');
    setErreur(password, 'Le mot de passe doit contenir au moins un chiffre.');
    ok = false;
  } else if (!/[^A-Za-z0-9]/.test(pwdValue)) {
    // corrigé : caractère spécial obligatoire
    password.classList.remove('is-valid');
    password.classList.add('is-invalid');
    setErreur(password, 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%&*...).');
    ok = false;
  }

  // ── confirmation mot de passe ──
  var confirmPassword = document.getElementById('confirm-password');
  if (password.value !== confirmPassword.value) {
    confirmPassword.classList.remove('is-valid');
    confirmPassword.classList.add('is-invalid');
    setErreur(confirmPassword, 'Les mots de passe ne correspondent pas.');
    ok = false;
  }

  // ── checkbox CGV ──
  var cgv = document.getElementById('cgv');
  if (cgv && !cgv.checked) {
    cgv.classList.add('is-invalid');
    ok = false;
  }

  if (!ok) {
    var premierErreur = form.querySelector('.is-invalid');
    if (premierErreur) premierErreur.focus();
  }

  return ok;
}

// met le message d'erreur dans le bon .invalid-feedback
function setErreur(input, message) {
  // cherche le .invalid-feedback le plus proche
  var fb = input.parentElement.querySelector('.invalid-feedback');
  if (!fb) {
    fb = input.closest('.mb-3').querySelector('.invalid-feedback');
  }
  if (fb) fb.textContent = message;
}

// ---- soumission du formulaire ----
async function soumettreInscription(e) {
  e.preventDefault();
  effacerAlerte();

  if (!validerFormulaire()) {
    afficherAlerte('Merci de corriger les erreurs.', 'danger');
    return;
  }

  var btn = e.target.querySelector('button[type="submit"]');

  // désactive le bouton
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Création du compte...';

  // données à envoyer (corrigé : inclut adresse postale)
  var data = {
    prenom: document.getElementById('prenom').value.trim(),
    nom: document.getElementById('nom').value.trim(),
    email: document.getElementById('email').value.trim(),
    gsm: document.getElementById('gsm').value.trim(),
    adresse: document.getElementById('adresse').value.trim(),
    code_postal: document.getElementById('code-postal').value.trim(),
    ville: document.getElementById('ville').value.trim(),
    password: document.getElementById('password').value
  };

  // token csrf
  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  var csrf = csrfMeta ? csrfMeta.getAttribute('content') : '';

  try {
    var response = await fetchAPI('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify(data)
    });

    console.log('inscription réussie !', response);

    // connecte automatiquement l'utilisateur
    if (response.user && response.token) {
      setUtilisateurConnecte(response.user, response.token);
    }

    // affiche le succès
    afficherAlerte('', 'success');

    // cache le formulaire
    var form = document.getElementById('inscription-form');
    if (form) form.classList.add('d-none');

    // redirection après 2 secondes
    setTimeout(function() {
      var params = new URLSearchParams(window.location.search);
      var retour = params.get('retour');

      if (retour) {
        window.location.href = decodeURIComponent(retour);
      } else {
        window.location.href = '../index.html';
      }
    }, 2000);

  } catch(err) {
    console.error('erreur inscription', err);

    var message = 'Une erreur est survenue, veuillez réessayer.';

    if (err.status === 409) {
      message = 'Cette adresse e-mail est déjà utilisée.';
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

    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.innerHTML = '<i class="bi bi-person-plus" aria-hidden="true"></i> Créer mon compte';
  }
}

// ---- vérifier si déjà connecté ----
function checkDejaConnecte() {
  if (typeof getUtilisateurConnecte !== 'function') return;

  var user = getUtilisateurConnecte();
  if (user) {
    console.log('utilisateur déjà connecté:', user.email);
    var zone = document.getElementById('erreur-globale');
    if (zone) {
      zone.innerHTML =
        'Vous êtes déjà connecté en tant que ' + echapper(user.email) + '. ' +
        '<a href="../index.html" class="alert-link">Retour à l\'accueil</a>';
      zone.classList.remove('d-none');
      zone.classList.remove('alert-danger');
      zone.classList.add('alert-info');
    }
  }
}

// ---- vérification en temps réel de la confirmation ----
function initConfirmationTempsReel() {
  var confirmInput = document.getElementById('confirm-password');
  if (!confirmInput) return;

  confirmInput.addEventListener('input', function() {
    var pwd = document.getElementById('password').value;
    var pwdConfirm = confirmInput.value;

    confirmInput.classList.remove('is-invalid', 'is-valid');

    if (pwdConfirm.length > 0) {
      if (pwd === pwdConfirm) {
        confirmInput.classList.add('is-valid');
      } else {
        confirmInput.classList.add('is-invalid');
        setErreur(confirmInput, 'Les mots de passe ne correspondent pas.');
      }
    }
  });
}

// ---- initialisation au chargement ----
document.addEventListener('DOMContentLoaded', function() {
  console.log('--- initialisation inscription.js ---');

  // 1. vérifier si déjà connecté
  checkDejaConnecte();

  // 2. toggle passwords
  initTogglePasswords();

  // 3. indicateur de force
  initPasswordStrength();

  // 4. confirmation en temps réel
  initConfirmationTempsReel();

  // 5. soumission
  var form = document.getElementById('inscription-form');
  if (form) {
    form.addEventListener('submit', soumettreInscription);
  }

  console.log('inscription.js initialisé');
});