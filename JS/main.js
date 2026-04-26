// main.js
// Script d'initialisation global — chargé sur toutes les pages après les autres utilitaires
// Gère : injection CSRF dans les formulaires, protection des liens externes, console warnings

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // INJECTION CSRF DANS TOUS LES FORMULAIRES
  // ══════════════════════════════════════════════════════════

  function injecterCSRFDansFormulaires() {
    var token = typeof getCSRFToken === 'function' ? getCSRFToken() : '';
    if (!token) return;

    // Remplir tous les champs hidden _csrf existants
    document.querySelectorAll('input[name="_csrf"]').forEach(function(input) {
      if (!input.value || input.value.includes('<?')) {
        input.value = token;
      }
    });

    // Remplir le champ dédié s'il existe
    var csrfField = document.getElementById('csrf-token-field');
    if (csrfField && (!csrfField.value || csrfField.value.includes('<?'))) {
      csrfField.value = token;
    }
  }

  // ══════════════════════════════════════════════════════════
  // PROTECTION DES LIENS EXTERNES (rel="noopener noreferrer")
  // ══════════════════════════════════════════════════════════

  function securiserLiensExternes() {
    document.querySelectorAll('a[target="_blank"]').forEach(function(lien) {
      // ajouter noopener et noreferrer si pas déjà présent
      var rel = lien.getAttribute('rel') || '';
      if (!rel.includes('noopener')) {
        rel += ' noopener';
      }
      if (!rel.includes('noreferrer')) {
        rel += ' noreferrer';
      }
      lien.setAttribute('rel', rel.trim());
    });
  }

  // ══════════════════════════════════════════════════════════
  // PROTECTION ANTI DOUBLE-SOUMISSION DES FORMULAIRES
  // ══════════════════════════════════════════════════════════

  function protegerDoubleSoumission() {
    document.querySelectorAll('form').forEach(function(form) {
      // on ne protège pas les formulaires qui ont déjà un listener custom
      // (ceux avec novalidate sont gérés par leur propre JS)
      if (form.hasAttribute('novalidate')) return;

      var enCours = false;
      form.addEventListener('submit', function() {
        if (enCours) {
          event.preventDefault();
          return false;
        }
        enCours = true;

        // réactiver après 5 secondes (sécurité)
        setTimeout(function() {
          enCours = false;
        }, 5000);
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  // DÉTECTION DE L'ENVIRONNEMENT (dev vs prod)
  // ══════════════════════════════════════════════════════════

  function detecterEnvironnement() {
    var hostname = window.location.hostname;
    var isDev = (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '');

    if (isDev) {
      console.log(
        '%c⚡ Vite & Gourmand — Mode développement',
        'color: #b5451b; font-weight: bold; font-size: 14px;'
      );
      console.log('Serveur API attendu sur /api — les appels échoueront sans backend.');
    }
  }

  // ══════════════════════════════════════════════════════════
  // GESTION DES HORAIRES DYNAMIQUES (footer)
  // ══════════════════════════════════════════════════════════

  function chargerHorairesFooter() {
    // Les horaires sont en dur dans le HTML pour l'instant
    // En production, on pourrait les charger depuis l'API
    // pour que les employés puissent les modifier
    var horairesDiv = document.getElementById('horaires-footer');
    if (!horairesDiv) return;

    // On vérifie si le contenu est déjà présent (ce qui est le cas dans le HTML)
    // Si un jour on veut charger depuis l'API :
    // fetchAPI('/horaires').then(function(data) { ... });
  }

  // ══════════════════════════════════════════════════════════
  // INITIALISATION GLOBALE
  // ══════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', function() {
    // 1. CSRF dans les formulaires
    injecterCSRFDansFormulaires();

    // 2. Sécuriser les liens externes
    securiserLiensExternes();

    // 3. Protection double soumission
    protegerDoubleSoumission();

    // 4. Horaires footer
    chargerHorairesFooter();

    // 5. Environnement
    detecterEnvironnement();

    console.log('main.js initialisé');
  });

  console.log('main.js chargé');
})();