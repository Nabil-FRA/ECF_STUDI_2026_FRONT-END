// api.js
// Couche d'abstraction pour les appels API
// Gère : base URL, token d'authentification, CSRF, erreurs réseau
// Toutes les pages utilisent fetchAPI() au lieu de fetch() direct

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // CONFIGURATION
  // ══════════════════════════════════════════════════════════

  // URL de base de l'API — à modifier selon l'environnement
  // En production : 'https://api.viteetgourmand.fr'
  // En dev local  : le back-end Symfony tourne sur le port 8080 via Docker
  const API_BASE_URL = 'https://vite-et-gourmand-ecf-nar-7b5ab7722b1a.herokuapp.com/api';

  // Timeout par défaut (en ms)
  const TIMEOUT_MS = 15000;

  // ══════════════════════════════════════════════════════════
  // JETON CSRF
  // ══════════════════════════════════════════════════════════

  // Le jeton est émis et signé par le back-end (GET /api/csrf-token) : un jeton
  // fabriqué ici ne prouverait rien. Ce qui protège, c'est que le CORS interdit
  // à un site tiers de lire cette réponse, donc d'obtenir un jeton valide.
  // On le garde en mémoire pour la durée de l'onglet et on le renouvelle
  // automatiquement quand le serveur le refuse.

  const METHODES_MODIFIANTES = ['POST', 'PUT', 'PATCH', 'DELETE'];

  let csrfToken = null;
  let csrfEnVol = null;

  function recupererTokenCSRF(forcer) {
    if (csrfToken && !forcer) {
      return Promise.resolve(csrfToken);
    }

    // Une seule requête en vol, même si plusieurs appels partent en parallèle.
    if (csrfEnVol) {
      return csrfEnVol;
    }

    csrfEnVol = fetch(API_BASE_URL + '/csrf-token', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
      .then(function(reponse) {
        return reponse.ok ? reponse.json() : null;
      })
      .then(function(donnees) {
        csrfToken = (donnees && donnees.token) || null;
        return csrfToken;
      })
      .catch(function() {
        return null;
      })
      .then(function(jeton) {
        csrfEnVol = null;
        return jeton;
      });

    return csrfEnVol;
  }

  // Exposées pour les scripts de page (main.js notamment).
  window.getCSRFToken = function() {
    return csrfToken || '';
  };
  window.ensureCSRFToken = function() {
    return recupererTokenCSRF(false);
  };

  // ══════════════════════════════════════════════════════════
  // FONCTION PRINCIPALE : fetchAPI
  // ══════════════════════════════════════════════════════════

  /**
   * Wrapper autour de fetch() avec gestion automatique de :
   * - l'URL de base
   * - le token d'authentification (Bearer)
   * - le token CSRF
   * - le Content-Type JSON par défaut
   * - les erreurs HTTP (status !== 2xx)
   * - le timeout
   *
   * @param {string} endpoint - Le chemin de l'API (ex: '/menus', '/auth/login')
   * @param {object} options  - Options fetch (method, headers, body, etc.)
   * @returns {Promise<object>} - La réponse JSON parsée
   * @throws {object} - { status, message, data } en cas d'erreur
   */
  window.fetchAPI = async function(endpoint, options) {
    options = options || {};

    // Construire l'URL complète
    const url = API_BASE_URL + endpoint;

    // Headers par défaut
    const headers = options.headers || {};

    // Ajouter le Content-Type JSON si pas déjà défini et si on envoie un body
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Ajouter le token d'authentification si disponible
    const token = localStorage.getItem('token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    // Jeton CSRF sur les méthodes qui modifient des données. On écrase une
    // éventuelle valeur fournie par l'appelant : seul le jeton signé par le
    // serveur est accepté côté back-end.
    const methode = (options.method || 'GET').toUpperCase();

    if (METHODES_MODIFIANTES.indexOf(methode) !== -1) {
      const jetonCsrf = await recupererTokenCSRF(false);
      if (jetonCsrf) {
        headers['X-CSRF-Token'] = jetonCsrf;
      }
    }

    // Fusionner les options
    const fetchOptions = {
      method: methode,
      headers: headers,
      credentials: 'same-origin' // envoie les cookies
    };

    if (options.body) {
      fetchOptions.body = options.body;
    }

    // Timeout avec AbortController
    let controller = null;
    let timeoutId = null;

    if (window.AbortController) {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      timeoutId = setTimeout(function() {
        controller.abort();
      }, TIMEOUT_MS);
    }

    try {
      const response = await fetch(url, fetchOptions);

      // Annuler le timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Vérifier le statut HTTP
      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch (e) {
          // la réponse n'est pas du JSON
        }

        // Jeton CSRF expiré (durée de vie 2 h) : on en redemande un et on
        // rejoue la requête une seule fois, de façon transparente.
        const csrfRefuse = response.status === 403
          && errorData
          && typeof errorData.message === 'string'
          && errorData.message.indexOf('CSRF') !== -1;

        if (csrfRefuse && !options._csrfRejoue) {
          await recupererTokenCSRF(true);

          const optionsRejeu = Object.assign({}, options, { _csrfRejoue: true });
          optionsRejeu.headers = Object.assign({}, options.headers || {});
          delete optionsRejeu.headers['X-CSRF-Token'];

          return window.fetchAPI(endpoint, optionsRejeu);
        }

        // Session expiree. L'en-tete Authorization part sur TOUS les appels des
        // qu'un jeton existe : un jeton perime bloquait donc aussi les routes
        // publiques, et rien ne purgeait la session, l'utilisateur restait
        // coince. On nettoie ici, dans fetchAPI, pour que ce soit vrai meme
        // quand l'appelant attrape l'erreur lui-meme.
        if (response.status === 401) {
          const avaitUnJeton = !!localStorage.getItem('token');

          if (avaitUnJeton) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }

          // On rejoue une fois en anonyme : si la route etait publique, la
          // page se remplit normalement et l'utilisateur ne voit rien.
          if (avaitUnJeton && !options._sansJeton) {
            const optionsAnonymes = Object.assign({}, options, { _sansJeton: true });
            optionsAnonymes.headers = Object.assign({}, options.headers || {});
            delete optionsAnonymes.headers['Authorization'];

            return window.fetchAPI(endpoint, optionsAnonymes);
          }

          // La route exige vraiment une authentification : retour au login, en
          // conservant la page d'origine. Sauf si on y est deja, sinon un
          // echec de connexion provoquerait une boucle.
          if (!window.location.pathname.includes('connexion')) {
            const retour = encodeURIComponent(window.location.href);
            window.location.href =
              (window.location.pathname.includes('/pages/') ? '' : 'pages/') +
              'connexion.html?retour=' + retour;
          }
        }

        const errorObj = {
          status: response.status,
          message: (errorData && errorData.message) || getMessageErreurHTTP(response.status),
          data: errorData
        };

        throw errorObj;
      }

      // Si la réponse est vide (204 No Content)
      if (response.status === 204) {
        return {};
      }

      // Parser le JSON
      const data = await response.json();
      return data;

    } catch (error) {
      // Annuler le timeout en cas d'erreur
      if (timeoutId) clearTimeout(timeoutId);

      // Si c'est déjà un objet d'erreur formaté (from above)
      if (error && error.status) {
        throw error;
      }

      // Erreur réseau ou timeout
      if (error.name === 'AbortError') {
        throw {
          status: 0,
          message: 'La requête a expiré. Vérifiez votre connexion internet.',
          data: null
        };
      }

      throw {
        status: 0,
        message: 'Erreur de connexion au serveur. Vérifiez votre connexion internet.',
        data: null
      };
    }
  };

  // ══════════════════════════════════════════════════════════
  // MESSAGES D'ERREUR HTTP
  // ══════════════════════════════════════════════════════════

  function getMessageErreurHTTP(status) {
    const messages = {
      400: 'Requête invalide. Vérifiez les données envoyées.',
      401: 'Non autorisé. Veuillez vous reconnecter.',
      403: 'Accès interdit.',
      404: 'Ressource introuvable.',
      409: 'Conflit : cette ressource existe déjà.',
      422: 'Données invalides.',
      429: 'Trop de requêtes. Veuillez patienter.',
      500: 'Erreur interne du serveur.',
      502: 'Le serveur est temporairement indisponible.',
      503: 'Service indisponible. Réessayez plus tard.'
    };

    return messages[status] || 'Une erreur est survenue (code ' + status + ').';
  }

  // ══════════════════════════════════════════════════════════
  // INTERCEPTION GLOBALE DES 401 (session expirée)
  // ══════════════════════════════════════════════════════════

  // On écoute les erreurs 401 pour rediriger vers la connexion
  // Ceci est géré dans les catch des scripts individuels,
  // mais on ajoute une couche de sécurité ici
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.status === 401) {
      // Session expirée — on nettoie et on redirige
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      // Ne pas rediriger si on est déjà sur la page de connexion
      if (!window.location.pathname.includes('connexion')) {
        const retour = encodeURIComponent(window.location.href);
        window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') +
          'connexion.html?retour=' + retour;
      }
    }
  });

  console.log('api.js chargé — base URL:', API_BASE_URL);
})();