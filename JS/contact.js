// contact.js
// gestion du formulaire de contact
// corrigé : champ titre = input text (plus un select)
// corrigé : utilise getUtilisateurConnecte() de auth.js au lieu d'accéder directement au localStorage

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
  // on utilise la fonction globale de auth.js
  if (typeof getUtilisateurConnecte === 'function') {
    var user = getUtilisateurConnecte();
    if (user) {
      if (user.nom && user.prenom) {
        document.getElementById('contact-nom').value = user.prenom + ' ' + user.nom;
      }
      if (user.email) {
        document.getElementById('contact-email').value = user.email;
      }
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
    var valide = true;

    // nom
    var nom = document.getElementById('contact-nom');
    if (!nom.value.trim()) {
      afficherErreur(nom, 'erreur-nom', 'Veuillez saisir votre nom.');
      valide = false;
    }

    // email
    var email = document.getElementById('contact-email');
    if (!email.value.trim()) {
      afficherErreur(email, 'erreur-email', 'Veuillez saisir votre adresse e-mail.');
      valide = false;
    } else if (!email.validity.valid) {
      afficherErreur(email, 'erreur-email', 'Adresse e-mail invalide.');
      valide = false;
    }

    // titre (c'est maintenant un input text, pas un select)
    var sujet = document.getElementById('contact-sujet');
    if (!sujet.value.trim()) {
      afficherErreur(sujet, 'erreur-sujet', 'Veuillez saisir un titre pour votre message.');
      valide = false;
    }

    // message (description)
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
      // Champs attendus par l'API : email, titre, description
      var donnees = {
        email: email.value.trim(),
        titre: sujet.value.trim(),
        description: (nom.value.trim() ? 'De : ' + nom.value.trim() + '\n\n' : '') + messageInput.value.trim()
      };

      if (typeof fetchAPI === 'function') {
        await fetchAPI('/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(donnees)
        });
      } else {
        var response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(donnees)
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Trop de messages envoyés. Réessayez dans quelques minutes.');
          }
          throw new Error('Erreur lors de l\'envoi. Veuillez réessayer.');
        }
      }

      // succès : afficher le message et vider le formulaire
      succesEnvoi.classList.remove('d-none');
      succesEnvoi.focus();
      form.reset();
      compteur.textContent = '0';

    } catch (erreur) {
      erreurGlobale.textContent = erreur.message || 'Une erreur est survenue.';
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