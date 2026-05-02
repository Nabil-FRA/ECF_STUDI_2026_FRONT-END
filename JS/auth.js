// auth.js
// Gestion de l'authentification côté client
// Fonctions globales : getUtilisateurConnecte, setUtilisateurConnecte, deconnexion
// Met à jour dynamiquement la zone #auth-area du header

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // GESTION DU STOCKAGE UTILISATEUR
  // ══════════════════════════════════════════════════════════

  /**
   * Récupère l'utilisateur connecté depuis le localStorage
   * @returns {object|null} L'objet utilisateur ou null si non connecté
   */
  window.getUtilisateurConnecte = function() {
    try {
      var userData = localStorage.getItem('user');
      if (!userData) return null;

      var user = JSON.parse(userData);

      // vérification basique : l'objet doit avoir au moins un email
      if (!user || !user.email) {
        return null;
      }

      // vérifier que le token existe aussi
      var token = localStorage.getItem('token');
      if (!token) {
        // pas de token = pas vraiment connecté
        localStorage.removeItem('user');
        return null;
      }

      return user;

    } catch (e) {
      // JSON corrompu dans le localStorage
      console.error('auth.js: données utilisateur corrompues, nettoyage');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  };

  /**
   * Stocke l'utilisateur connecté et son token
   * @param {object} user  - L'objet utilisateur (email, nom, prenom, role...)
   * @param {string} token - Le JWT ou token de session
   */
  window.setUtilisateurConnecte = function(user, token) {
    if (!user || !token) {
      console.error('auth.js: setUtilisateurConnecte appelé sans user ou token');
      return;
    }

    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);

    // mettre à jour l'interface
    mettreAJourAuthArea();

    console.log('auth.js: utilisateur connecté —', user.email, '(' + user.role + ')');
  };

  /**
   * Déconnecte l'utilisateur : supprime les données et met à jour l'UI
   */
  window.deconnexion = function() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // mettre à jour l'interface
    mettreAJourAuthArea();

    console.log('auth.js: utilisateur déconnecté');
  };

  // ══════════════════════════════════════════════════════════
  // MISE À JOUR DYNAMIQUE DU HEADER (zone #auth-area)
  // ══════════════════════════════════════════════════════════

  function mettreAJourAuthArea() {
    var authArea = document.getElementById('auth-area');
    if (!authArea) return;

    var user = getUtilisateurConnecte();

    if (!user) {
      // Non connecté : afficher boutons Connexion + Inscription
      // On détecte si on est dans /pages/ ou à la racine
      var prefix = estDansPages() ? '' : 'pages/';

      authArea.innerHTML =
        '<a href="' + prefix + 'connexion.html" class="btn btn-secondary btn-sm">Connexion</a> ' +
        '<a href="' + prefix + 'inscription.html" class="btn btn-primary btn-sm">Inscription</a>';

    } else {
      // Connecté : afficher le prénom + lien espace + bouton déconnexion
      var prefix = estDansPages() ? '' : 'pages/';
      var espaceUrl = prefix;

      // rediriger vers le bon espace selon le rôle
      // L'API retourne : 'administrateur', 'employe', 'utilisateur'
      if (user.role === 'administrateur' || user.role === 'admin') {
        espaceUrl += 'espace-admin.html';
      } else if (user.role === 'employe') {
        espaceUrl += 'espace-employe.html';
      } else {
        espaceUrl += 'espace-client.html';
      }

      var prenom = user.prenom || user.nom || user.email.split('@')[0];
      var echap = typeof echapperHTML === 'function' ? echapperHTML : function(s) { return s; };

      authArea.innerHTML =
        '<a href="' + espaceUrl + '" class="btn btn-outline-primary btn-sm" aria-label="Mon espace">' +
          echap(prenom) +
        '</a> ' +
        '<button type="button" class="btn btn-outline-danger btn-sm" id="btn-header-deconnexion" aria-label="Se déconnecter">' +
          'Déconnexion' +
        '</button>';

      // événement déconnexion sur le bouton du header
      var btnDeco = document.getElementById('btn-header-deconnexion');
      if (btnDeco) {
        btnDeco.addEventListener('click', function() {
          deconnexion();
          // recharger pour mettre à jour toute la page
          window.location.reload();
        });
      }
    }
  }

  /**
   * Détecte si la page courante est dans le dossier /pages/
   * (pour construire les chemins relatifs correctement)
   */
  function estDansPages() {
    return window.location.pathname.includes('/pages/');
  }

  // ══════════════════════════════════════════════════════════
  // INITIALISATION AU CHARGEMENT
  // ══════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', function() {
    mettreAJourAuthArea();
  });

  console.log('auth.js chargé');
})();