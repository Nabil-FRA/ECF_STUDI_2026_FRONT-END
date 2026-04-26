// ui.js
// Composants d'interface communs à toutes les pages
// Menu hamburger, notifications toast, année footer, lien actif nav, smooth scroll

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // MENU HAMBURGER (header custom avec .menu-toggle + .nav-list)
  // ══════════════════════════════════════════════════════════

  function initMenuHamburger() {
    var toggle = document.getElementById('menu-toggle');
    var navList = document.getElementById('nav-list');

    if (!toggle || !navList) return;

    toggle.addEventListener('click', function() {
      var isOpen = navList.classList.contains('is-open');

      if (isOpen) {
        // fermer
        navList.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Ouvrir le menu de navigation');
      } else {
        // ouvrir
        navList.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Fermer le menu de navigation');

        // focus sur le premier lien pour l'accessibilité
        var premierLien = navList.querySelector('.nav-link');
        if (premierLien) premierLien.focus();
      }
    });

    // fermer le menu si on clique sur un lien (mobile)
    navList.querySelectorAll('.nav-link').forEach(function(lien) {
      lien.addEventListener('click', function() {
        navList.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // fermer le menu si on clique en dehors
    document.addEventListener('click', function(e) {
      if (!toggle.contains(e.target) && !navList.contains(e.target)) {
        navList.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // fermer avec Échap
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navList.classList.contains('is-open')) {
        navList.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });

    console.log('ui.js: menu hamburger initialisé');
  }

  // ══════════════════════════════════════════════════════════
  // NOTIFICATIONS TOAST
  // ══════════════════════════════════════════════════════════

  /**
   * Affiche une notification toast temporaire
   * @param {string} message - Le texte à afficher
   * @param {string} type    - 'success', 'danger', 'warning' (défaut: 'success')
   * @param {number} duree   - Durée en ms (défaut: 4000)
   */
  window.afficherToast = function(message, type, duree) {
    type = type || 'success';
    duree = duree || 4000;

    // créer le conteneur s'il n'existe pas
    var container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }

    // créer le toast
    var toast = document.createElement('div');
    toast.className = 'toast-vg toast-' + type;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    // icône selon le type
    var icone = '';
    if (type === 'success') icone = '✓ ';
    else if (type === 'danger') icone = '✗ ';
    else if (type === 'warning') icone = '⚠ ';

    toast.textContent = icone + message;

    container.appendChild(toast);

    // suppression automatique après la durée
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'opacity 0.3s, transform 0.3s';

      setTimeout(function() {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duree);
  };

  // ══════════════════════════════════════════════════════════
  // ANNÉE AUTOMATIQUE DANS LE FOOTER
  // ══════════════════════════════════════════════════════════

  function initAnneeFooter() {
    var el = document.getElementById('current-year');
    if (el) {
      el.textContent = new Date().getFullYear();
    }
  }

  // ══════════════════════════════════════════════════════════
  // SURLIGNAGE DU LIEN ACTIF DANS LA NAVIGATION
  // ══════════════════════════════════════════════════════════

  function initLienActif() {
    var pageCourante = window.location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.nav-list .nav-link, .navbar-nav .nav-link').forEach(function(lien) {
      var href = lien.getAttribute('href');
      if (!href) return;

      var hrefPage = href.split('/').pop();

      // vérifier la correspondance
      if (hrefPage === pageCourante) {
        lien.classList.add('active');
        lien.setAttribute('aria-current', 'page');
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  // SMOOTH SCROLL (pour les liens ancre comme le skip link)
  // ══════════════════════════════════════════════════════════

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(lien) {
      lien.addEventListener('click', function(e) {
        var cible = lien.getAttribute('href');
        if (cible === '#') return;

        var element = document.querySelector(cible);
        if (element) {
          e.preventDefault();
          element.scrollIntoView({ behavior: 'smooth' });

          // mettre le focus sur l'élément cible pour l'accessibilité
          element.setAttribute('tabindex', '-1');
          element.focus({ preventScroll: true });
        }
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  // INITIALISATION AU CHARGEMENT
  // ══════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', function() {
    initMenuHamburger();
    initAnneeFooter();
    initLienActif();
    initSmoothScroll();
  });

  console.log('ui.js chargé');
})();