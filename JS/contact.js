// contact.js
// gestion du formulaire de contact
// fait par moi le 15/04/2026

document.addEventListener('DOMContentLoaded', function() {

  const form = document.getElementById('form-contact');
  const btnEnvoyer = document.getElementById('btn-envoyer');
  const erreurGlobale = document.getElementById('erreur-globale');
  const succesEnvoi = document.getElementById('succes-envoi');

  // ── compteur de caractères du message ─────────────────────
  const messageInput = document.getElementById('contact-message');
  const compteur = document.getElementById('compteur-message');

  messageInput.addEventListener('input', function() {
    compteur.textContent = messageInput.value.length;
  });

  // ── pré-remplir si l'utilisateur est connecté ─────────────
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user) {
    if (user.nom && user.prenom) {
      document.getElementById('contact-nom').value = user.prenom + ' ' + user.nom;
    }
    if (user.email) {
      document.getElementById('contact-email').value = user.email;
    }
    if (user.telephone) {
      document.getElementById('contact-tel').value = user.telephone;
    }
  }

  // ── soumission du formulaire ──────────────────────────────
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // reset des erreurs
    resetErreurs();
    erreurGlobale.classList.add('d-none');
    succesEnvoi.classList.add('d-none');

    // validation
    let valide = true;

    // nom
    const nom = document.getElementById('contact-nom');
    if (!nom.value.trim()) {
      afficherErreur(nom, 'erreur-nom', 'Veuillez saisir votre nom.');
      valide = false;
    }

    // email
    const email = document.getElementById('contact-email');
    if (!email.value.trim()) {
      afficherErreur(email, 'erreur-email', 'Veuillez saisir votre adresse e-mail.');
      valide = false;
    } else if (!email.validity.valid) {
      afficherErreur(email, 'erreur-email', 'Adresse e-mail invalide.');
      valide = false;
    }

    // sujet
    const sujet = document.getElementById('contact-sujet');
    if (!sujet.value) {
      afficherErreur(sujet, 'erreur-sujet', 'Veuillez choisir un sujet.');
      valide = false;
    }

    // message
    if (!messageInput.value.trim()) {
      afficherErreur(messageInput, 'erreur-message', 'Veuillez saisir votre message.');
      valide = false;
    } else if (messageInput.value.trim().length < 10) {
      afficherErreur(messageInput, 'erreur-message', 'Le message doit contenir au moins 10 caractères.');
      valide = false;
    }

    if (!valide) return;

    // ── envoi à l'API ─────────────────────────────────────
    btnEnvoyer.disabled = true;
    btnEnvoyer.querySelector('.btn-texte').classList.add('d-none');
    btnEnvoyer.querySelector('.btn-spinner').classList.remove('d-none');

    try {
      // TODO: remplacer par la vraie URL de l'API
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nom: nom.value.trim(),
          email: email.value.trim(),
          telephone: document.getElementById('contact-tel').value.trim(),
          sujet: sujet.value,
          message: messageInput.value.trim()
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Trop de messages envoyés. Réessayez dans quelques minutes.');
        }
        throw new Error('Erreur lors de l\'envoi. Veuillez réessayer.');
      }

      // succès : afficher le message et vider le formulaire
      succesEnvoi.classList.remove('d-none');
      succesEnvoi.focus();
      form.reset();
      compteur.textContent = '0';

    } catch (erreur) {
      erreurGlobale.textContent = erreur.message;
      erreurGlobale.classList.remove('d-none');
    } finally {
      btnEnvoyer.disabled = false;
      btnEnvoyer.querySelector('.btn-texte').classList.remove('d-none');
      btnEnvoyer.querySelector('.btn-spinner').classList.add('d-none');
    }
  });

  // ── fonctions utilitaires ─────────────────────────────────
  function afficherErreur(input, erreurId, message) {
    input.classList.add('is-invalid');
    document.getElementById(erreurId).textContent = message;
  }

  function resetErreurs() {
    form.querySelectorAll('.is-invalid').forEach(function(el) {
      el.classList.remove('is-invalid');
    });
    form.querySelectorAll('.invalid-feedback').forEach(function(el) {
      el.textContent = '';
    });
  }
});