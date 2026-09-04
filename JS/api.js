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

    // Ajouter le token CSRF si disponible
    if (typeof window.getCSRFToken === 'function' && !headers['X-CSRF-Token']) {
      headers['X-CSRF-Token'] = window.getCSRFToken();
    }

    // Fusionner les options
    const fetchOptions = {
      method: options.method || 'GET',
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