// security.js
// Gestion de la sécurité front-end : CSRF, XSS, headers
// Chargé en premier sur toutes les pages

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // TOKEN CSRF
  // ══════════════════════════════════════════════════════════

  // Génère un token CSRF côté client (en attendant le vrai token serveur)
  // En production, ce token serait injecté par le serveur dans la balise meta
  function genererTokenCSRF() {
    // si le serveur a déjà injecté un token, on le garde
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.getAttribute('content') && !meta.getAttribute('content').includes('<?')) {
      return meta.getAttribute('content');
    }

    // sinon on en génère un côté client (mode dev / démo)
    var array = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      // fallback pour les vieux navigateurs
      for (var i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }

    var token = Array.from(array, function(byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');

    // on l'injecte dans la meta tag
    if (meta) {
      meta.setAttribute('content', token);
    }

    return token;
  }

  // ══════════════════════════════════════════════════════════
  // PROTECTION XSS — échappement HTML
  // ══════════════════════════════════════════════════════════

  // Fonction globale pour échapper le HTML
  // (certains scripts ont leur propre copie, celle-ci sert de fallback)
  window.echapperHTML = function(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // ══════════════════════════════════════════════════════════
  // PROTECTION CLICKJACKING
  // ══════════════════════════════════════════════════════════

  // Vérifie que la page n'est pas chargée dans un iframe non autorisé
  function protegerClickjacking() {
    if (window.self !== window.top) {
      // on est dans un iframe — on vérifie si c'est autorisé
      try {
        // si on peut accéder au parent, c'est le même domaine
        var parentHost = window.top.location.hostname;
        if (parentHost !== window.location.hostname) {
          // domaine différent : on bloque
          document.body.innerHTML = '<p>Chargement non autorisé.</p>';
        }
      } catch (e) {
        // cross-origin : on ne peut pas accéder → on bloque
        document.body.innerHTML = '<p>Chargement non autorisé.</p>';
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // SANITISATION DES ENTRÉES
  // ══════════════════════════════════════════════════════════

  // Nettoie une chaîne pour l'utiliser dans une URL
  window.sanitiserURL = function(url) {
    if (!url) return '';
    // bloque les protocoles dangereux
    var lower = url.toLowerCase().trim();
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
      return '#';
    }
    return url;
  };

  // ══════════════════════════════════════════════════════════
  // INITIALISATION
  // ══════════════════════════════════════════════════════════

  // Générer/vérifier le token CSRF au chargement
  var csrfToken = genererTokenCSRF();

  // Rendre le token accessible globalement
  window.getCSRFToken = function() {
    return csrfToken;
  };

  // Protection clickjacking
  protegerClickjacking();

  console.log('security.js chargé');
})();