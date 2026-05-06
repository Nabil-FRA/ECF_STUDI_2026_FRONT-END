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
    var horairesFooter  = document.getElementById('horaires-footer');
    var horairesContact = document.getElementById('horaires-contact');
    if (!horairesFooter && !horairesContact) return;

    // Charger les horaires depuis l'API (GET /api/horaires — public)
    fetchAPI('/horaires').then(function(data) {
      var liste = Array.isArray(data) ? data : (data.horaires || []);
      if (!liste || liste.length === 0) return; // garder le contenu HTML par défaut

      var ORDRE = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
      // Indexer par jour
      var map = {};
      liste.forEach(function(h) { map[(h.jour || '').toLowerCase()] = h; });

      // Regrouper les jours consécutifs ayant les mêmes horaires
      var lignes = [];
      var groupe = [];
      var horaireCourant = null;

      ORDRE.forEach(function(jour, i) {
        var h = map[jour];
        var ouv  = h ? (h.heure_ouverture || null) : null;
        var ferm = h ? (h.heure_fermeture || null) : null;
        var cle  = ouv ? (ouv + '-' + ferm) : 'ferme';

        if (cle === horaireCourant) {
          groupe.push(jour);
        } else {
          if (groupe.length > 0) lignes.push({ jours: groupe, ouv: horaireCourant });
          groupe = [jour];
          horaireCourant = cle;
        }
      });
      if (groupe.length > 0) lignes.push({ jours: groupe, ouv: horaireCourant });

      // Noms courts des jours (footer) et noms longs (page contact)
      var NOMS_COURTS = { lundi:'Lun', mardi:'Mar', mercredi:'Mer', jeudi:'Jeu', vendredi:'Ven', samedi:'Sam', dimanche:'Dim' };
      var NOMS_LONGS  = { lundi:'Lundi', mardi:'Mardi', mercredi:'Mercredi', jeudi:'Jeudi', vendredi:'Vendredi', samedi:'Samedi', dimanche:'Dimanche' };

      function genererHtml(noms) {
        var html = '';
        lignes.forEach(function(l) {
          var jours = l.jours;
          var label = jours.length === 1
            ? noms[jours[0]]
            : noms[jours[0]] + ' – ' + noms[jours[jours.length - 1]];

          if (l.ouv === 'ferme') {
            html += '<p>' + label + ' : Fermé</p>';
          } else {
            var parts = l.ouv.split('-');
            var heureOuv  = parts[0] ? parts[0].substring(0, 5) : '';
            var heureFerm = parts[1] ? parts[1].substring(0, 5) : '';
            html += '<p>' + label + ' : ' + heureOuv + ' – ' + heureFerm + '</p>';
          }
        });
        return html;
      }

      var htmlFooter  = genererHtml(NOMS_COURTS);
      var htmlContact = genererHtml(NOMS_LONGS);

      if (horairesFooter  && htmlFooter)  horairesFooter.innerHTML  = htmlFooter;
      if (horairesContact && htmlContact) horairesContact.innerHTML = htmlContact;

    }).catch(function() {
      // En cas d'erreur API, on garde le contenu HTML par défaut
    });
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