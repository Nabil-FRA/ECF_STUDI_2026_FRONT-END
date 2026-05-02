// reinitialiser-mot-de-passe.js
// Page de réinitialisation du mot de passe (après clic sur le lien reçu par email)
// Le token est passé en paramètre URL : ?token=XXXXX
// Appelle POST /api/auth/reset-password

(function () {
  'use strict';

  // ── utilitaires ──────────────────────────────────────────────
  function echapper(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function afficherAlerte(msg, type) {
    var zone = document.getElementById('alert-global');
    if (!zone) return;
    zone.innerHTML =
      '<div class="alert alert-' + type + ' alert-dismissible" role="alert">' +
        echapper(msg) +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>' +
      '</div>';
  }

  // ── politique de mot de passe (identique au back-end) ────────
  // Min 10 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
  function validerMotDePasse(mdp) {
    return mdp.length >= 10
      && /[A-Z]/.test(mdp)
      && /[a-z]/.test(mdp)
      && /[0-9]/.test(mdp)
      && /[^A-Za-z0-9]/.test(mdp);
  }

  // ── récupérer le token depuis l'URL ──────────────────────────
  function getTokenUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  }

  // ── toggle afficher/masquer le mot de passe ──────────────────
  function initTogglePassword() {
    var btn = document.getElementById('toggle-password');
    var input = document.getElementById('password');
    var iconEye = document.getElementById('icon-eye');
    var iconEyeSlash = document.getElementById('icon-eye-slash');

    if (!btn || !input) return;

    btn.addEventListener('click', function () {
      var isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.setAttribute('aria-label', isPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      btn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      if (iconEye) iconEye.classList.toggle('d-none', isPassword);
      if (iconEyeSlash) iconEyeSlash.classList.toggle('d-none', !isPassword);
      input.focus();
    });
  }

  // ── validation du formulaire ─────────────────────────────────
  function validerFormulaire() {
    var pwdInput = document.getElementById('password');
    var confirmInput = document.getElementById('password-confirm');
    var pwdError = document.getElementById('password-error');
    var confirmError = document.getElementById('confirm-error');
    var ok = true;

    pwdInput.classList.remove('is-invalid', 'is-valid');
    confirmInput.classList.remove('is-invalid', 'is-valid');

    // Valider la politique du mot de passe
    if (!validerMotDePasse(pwdInput.value)) {
      pwdInput.classList.add('is-invalid');
      if (pwdError) pwdError.textContent = 'Le mot de passe doit contenir au moins 10 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial.';
      ok = false;
    } else {
      pwdInput.classList.add('is-valid');
    }

    // Valider la confirmation
    if (confirmInput.value !== pwdInput.value) {
      confirmInput.classList.add('is-invalid');
      if (confirmError) confirmError.textContent = 'Les mots de passe ne correspondent pas.';
      ok = false;
    } else if (confirmInput.value) {
      confirmInput.classList.add('is-valid');
    }

    if (!ok) {
      var premierErreur = document.querySelector('.is-invalid');
      if (premierErreur) premierErreur.focus();
    }

    return ok;
  }

  // ── soumettre le formulaire ───────────────────────────────────
  async function soumettreFormulaire(e) {
    e.preventDefault();

    if (!validerFormulaire()) {
      return;
    }

    var token = getTokenUrl();
    var password = document.getElementById('password').value;
    var btn = document.getElementById('btn-valider');

    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Enregistrement...';

    try {
      await fetchAPI('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: token, password: password })
      });

      // Succès : afficher le bloc de confirmation
      document.getElementById('form-container').classList.add('d-none');
      document.getElementById('succes-container').classList.remove('d-none');

      console.log('Mot de passe réinitialisé avec succès');

    } catch (err) {
      console.error('Erreur reset-password', err);

      var message = 'Une erreur est survenue. Veuillez réessayer.';

      if (err.status === 400) {
        // Token invalide ou expiré → afficher le bloc d'erreur
        document.getElementById('form-container').classList.add('d-none');
        document.getElementById('erreur-container').classList.remove('d-none');
        return;
      } else if (err.message) {
        message = err.message;
      }

      afficherAlerte(message, 'danger');

      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = 'Enregistrer le nouveau mot de passe';
    }
  }

  // ── initialisation ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    console.log('--- initialisation reinitialiser-mot-de-passe.js ---');

    var token = getTokenUrl();

    // Si pas de token dans l'URL → afficher directement l'erreur
    if (!token) {
      document.getElementById('form-container').classList.add('d-none');
      document.getElementById('erreur-container').classList.remove('d-none');
      console.warn('Aucun token dans l\'URL');
      return;
    }

    console.log('Token détecté dans l\'URL');

    // Initialiser le toggle mot de passe
    initTogglePassword();

    // Câbler la soumission du formulaire
    var form = document.getElementById('form-nouveau-mdp');
    if (form) {
      form.addEventListener('submit', soumettreFormulaire);
    }

    // Mettre à jour l'année dans le footer
    var yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    console.log('reinitialiser-mot-de-passe.js initialisé');
  });

})();
