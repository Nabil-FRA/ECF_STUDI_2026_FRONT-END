// page-accueil.js
// Chargement dynamique des avis validés sur la page d'accueil

document.addEventListener('DOMContentLoaded', function () {
  chargerAvis();

  // Année en cours dans le footer
  var yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// ── charger les avis depuis l'API ────────────────────────────
async function chargerAvis() {
  var container = document.getElementById('avis-container');
  if (!container) return;

  try {
    var avis = await fetchAPI('/avis');
    var liste = Array.isArray(avis) ? avis : (avis.avis || []);

    if (!liste || liste.length === 0) {
      container.innerHTML =
        '<p class="text-center text-muted">Aucun avis disponible pour le moment.</p>';
      return;
    }

    container.innerHTML = '';

    liste.forEach(function (a) {
      var etoiles = '';
      for (var i = 1; i <= 5; i++) {
        etoiles += i <= a.note ? '★' : '☆';
      }

      var card = document.createElement('article');
      card.className = 'avis-card';
      card.setAttribute('aria-label', 'Avis de ' + (a.prenom_utilisateur || 'Anonyme'));

      card.innerHTML =
        '<div class="avis-note" aria-label="Note : ' + a.note + ' sur 5">' +
          '<span aria-hidden="true">' + etoiles + '</span>' +
        '</div>' +
        '<blockquote class="avis-texte">' +
          '<p>' + escapeHtml(a.description || '') + '</p>' +
        '</blockquote>' +
        '<footer class="avis-auteur">— ' + escapeHtml(a.prenom_utilisateur || 'Anonyme') + '</footer>';

      container.appendChild(card);
    });

  } catch (err) {
    console.error('Erreur chargement avis :', err);
    container.innerHTML =
      '<p class="text-center text-muted">Les avis ne sont pas disponibles pour le moment.</p>';
  }
}

// ── échapper le HTML pour éviter les XSS ────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
