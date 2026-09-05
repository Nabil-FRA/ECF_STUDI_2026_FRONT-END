// security.js
// Gestion de la sécurité front-end : CSRF, XSS, headers
// Chargé en premier sur toutes les pages

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // TOKEN CSRF
  // ══════════════════════════════════════════════════════════

  // Le jeton CSRF n'est plus fabriqué ici : un jeton généré par le navigateur
  // ne prouve rien au serveur, qui le rejetterait. Il est désormais demandé au
  // back-end (GET /api/csrf-token) et mis en cache par api.js, qui expose
  // window.getCSRFToken() et window.ensureCSRFToken().

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

  // Protection clickjacking
  protegerClickjacking();

  console.log('security.js chargé');
})();