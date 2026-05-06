// page commande.js
// gestion du formulaire de commande multi-étapes
// fait par moi le 12/04/2026

// les codes postaux de bordeaux (j'en ai mis les principaux)
const cpBordeaux = ['33000', '33100', '33200', '33300', '33800'];

// prix livraison hors bordeaux
const FRAIS_LIVRAISON = 5.00;
const FRAIS_KM = 1.50; // €/km — tarif traiteur affiché (estimation côté client)

// distance estimée par défaut pour livraison hors Bordeaux (km)
const DISTANCE_ESTIMEE_KM = 20;

// pour la remise
const REMISE_PERSONNES = 5; // faut 5 personnes de plus que le min
const REMISE = 0.10; // 10%

// je récupère tous les éléments dont j'ai besoin
let etapeActuelle = 1;
let menus = [];
let menuCourant = null;

// ---- fonctions utilitaires ----

// pour éviter les injections xss (vu en cours)
function echapper(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// formate un prix en euros
function formatPrix(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant);
}

// formate une date lisible
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// affiche une alerte en haut de page
function afficherAlerte(msg, type) {
  // type = danger, success, warning
  const zone = document.getElementById('alert-global');
  zone.innerHTML = `
    <div class="alert alert-${type} alert-dismissible" role="alert">
      ${echapper(msg)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer l'alerte"></button>
    </div>
  `;
}

function effacerAlerte() {
  document.getElementById('alert-global').innerHTML = '';
}

// ---- vérifier si l'utilisateur est connecté ----
function checkAuth() {
  // getUtilisateurConnecte() est dans auth.js
  const user = getUtilisateurConnecte();
  if (!user) {
    // je redirige vers la page de connexion
    // je garde l'url pour rediriger après connexion
    const urlActuelle = encodeURIComponent(window.location.href);
    window.location.href = 'connexion.html?retour=' + urlActuelle;
    return null;
  }
  return user;
}

// ---- pré remplir les champs avec les infos du compte ----
function preremplir(user) {
  if (!user) return;

  // je remplis ce que j'ai
  if (user.prenom) document.getElementById('prenom').value = user.prenom;
  if (user.nom) document.getElementById('nom').value = user.nom;
  if (user.email) document.getElementById('email').value = user.email;
  if (user.gsm) document.getElementById('gsm').value = user.gsm;

  // je préviens l'utilisateur
  document.getElementById('prefill-notice').textContent =
    'Vos informations ont été pré-remplies depuis votre compte.';

  console.log('champs pré-remplis pour :', user.prenom, user.nom);
}

// ---- charger les menus depuis l'api ----
async function chargerMenus() {
  try {
    const data = await fetchAPI('/menus');
    menus = Array.isArray(data) ? data : (data.menus || []);

    const select = document.getElementById('menu-choisi');
    select.innerHTML = '<option value="">-- Choisissez un menu --</option>';

    menus.forEach(function(menu) {
      const opt = document.createElement('option');
      opt.value = menu.id;
      const prixAff = menu.prix_par_personne || menu.prix || 0;
      const minPers = menu.nombre_personne_minimum || menu.nb_personnes_min || 0;
      opt.textContent = menu.titre + ' - ' + minPers + ' pers. min - ' + formatPrix(prixAff);
      select.appendChild(opt);
    });

    // si on vient depuis la page détail avec ?menu=id dans l'url
    const params = new URLSearchParams(window.location.search);
    const menuId = params.get('menu');
    if (menuId) {
      select.value = menuId;
      // je simule le changement pour mettre à jour les infos
      mettreAJourInfosMenu();
      console.log('menu pré-selectionné :', menuId);
    }

  } catch(e) {
    console.error('erreur chargement menus', e);
    afficherAlerte('Impossible de charger les menus, veuillez réessayer.', 'danger');
  }
}

// ---- mettre à jour les infos quand on change de menu ----
function mettreAJourInfosMenu() {
  const select = document.getElementById('menu-choisi');
  const id = select.value;

  const infoDiv = document.getElementById('menu-info');
  const stockDiv = document.getElementById('menu-stock');

  if (!id) {
    infoDiv.classList.add('d-none');
    stockDiv.classList.add('d-none');
    menuCourant = null;
    return;
  }

  // je cherche le menu dans la liste
  menuCourant = menus.find(function(m) {
    return m.id == id; // == et pas === car l'id peut être string ou int
  });

  if (!menuCourant) return;

  // normaliser les champs API → local
  menuCourant._minPersonnes = menuCourant.nombre_personne_minimum || menuCourant.nb_personnes_min || 1;
  menuCourant._prix         = menuCourant.prix_par_personne || menuCourant.prix_base || menuCourant.prix || 0;
  menuCourant._stock        = (menuCourant.quantite_restante !== undefined) ? menuCourant.quantite_restante : menuCourant.stock;
  menuCourant._theme        = (menuCourant.theme && menuCourant.theme.libelle) ? menuCourant.theme.libelle : (menuCourant.theme || '');
  menuCourant._regime       = (menuCourant.regime && menuCourant.regime.libelle) ? menuCourant.regime.libelle : (menuCourant.regime || '');

  // je mets à jour le champ nombre de personnes
  const inputNbP = document.getElementById('nb-personnes');
  inputNbP.min = menuCourant._minPersonnes;
  inputNbP.value = menuCourant._minPersonnes;

  document.getElementById('nb-personnes-hint').textContent =
    'Minimum pour ce menu : ' + menuCourant._minPersonnes + ' personne(s)';

  // j'affiche les infos du menu
  infoDiv.classList.remove('d-none');
  infoDiv.innerHTML =
    '<strong>' + echapper(menuCourant.titre) + '</strong><br>' +
    'Thème : ' + echapper(menuCourant._theme) + ' | ' +
    'Régime : ' + echapper(menuCourant._regime) + '<br>' +
    'Prix : <strong>' + formatPrix(menuCourant._prix) + '</strong>' +
    '/pers. — min ' + menuCourant._minPersonnes + ' pers.';

  // AJOUT : afficher le stock restant (c'était dans le cahier des charges)
  const btnSuivant = document.getElementById('btn-etape-2-suivant');

  if (menuCourant._stock !== undefined && menuCourant._stock !== null) {
    stockDiv.classList.remove('d-none');

    if (menuCourant._stock <= 0) {
      // plus de stock, on bloque
      stockDiv.className = 'alert alert-danger';
      stockDiv.innerHTML = '<strong>Rupture !</strong> Ce menu n\'est plus disponible pour le moment.';
      btnSuivant.disabled = true;
      console.log('menu en rupture de stock');
    } else if (menuCourant._stock <= 3) {
      // stock faible, on prévient
      stockDiv.className = 'alert alert-warning';
      stockDiv.innerHTML = '<strong>Attention :</strong> Plus que ' + menuCourant._stock + ' commande(s) disponible(s) pour ce menu !';
      btnSuivant.disabled = false;
    } else {
      // stock ok
      stockDiv.className = 'alert alert-info';
      stockDiv.innerHTML = 'Stock disponible : ' + menuCourant._stock + ' commande(s).';
      btnSuivant.disabled = false;
    }
  } else {
    // pas d'info stock, je cache le div
    stockDiv.classList.add('d-none');
    btnSuivant.disabled = false;
  }
}

// ---- calculer le prix ----
function calculerPrix() {
  if (!menuCourant) return null;

  const nbP = parseInt(document.getElementById('nb-personnes').value);
  const min = menuCourant._minPersonnes;
  const prixBase = menuCourant._prix;

  // Prix = prix par personne × nombre de personnes
  const prixMenu = prixBase * nbP;

  // Remise de 10% si nombre de personnes >= minimum + 5
  let remise = 0;
  let aRemise = false;
  if (nbP >= min + REMISE_PERSONNES) {
    remise = prixMenu * REMISE;
    aRemise = true;
  }

  // Frais de livraison : forfait 5€ + 1,50€/km estimé hors Bordeaux
  const cp = document.getElementById('code-postal').value.trim();
  const horsBoirdeaux = !cpBordeaux.includes(cp);

  // Estimation distance : DISTANCE_ESTIMEE_KM pour hors Bordeaux (sera recalculée côté serveur)
  let fraisLiv = 0;
  let distanceEstimee = 0;
  if (horsBoirdeaux) {
    distanceEstimee = DISTANCE_ESTIMEE_KM;
    fraisLiv = FRAIS_LIVRAISON + (FRAIS_KM * distanceEstimee);
  }

  const total = prixMenu - remise + fraisLiv;

  return {
    prixMenu: prixMenu,
    aRemise: aRemise,
    remise: remise,
    horsBoirdeaux: horsBoirdeaux,
    fraisLiv: fraisLiv,
    distanceEstimee: distanceEstimee,
    total: total
  };
}

// ---- afficher le récapitulatif étape 3 ----
function afficherRecap() {
  const nbP = parseInt(document.getElementById('nb-personnes').value);
  const prix = calculerPrix();

  // recap infos client et prestation
  document.getElementById('recap-contenu').innerHTML = `
    <dl class="row mb-0">
      <dt class="col-sm-4">Nom</dt>
      <dd class="col-sm-8">${echapper(document.getElementById('prenom').value)} ${echapper(document.getElementById('nom').value)}</dd>
      <dt class="col-sm-4">E-mail</dt>
      <dd class="col-sm-8">${echapper(document.getElementById('email').value)}</dd>
      <dt class="col-sm-4">Téléphone</dt>
      <dd class="col-sm-8">${echapper(document.getElementById('gsm').value)}</dd>
      <dt class="col-sm-4">Date</dt>
      <dd class="col-sm-8">${formatDate(document.getElementById('date-prestation').value)}</dd>
      <dt class="col-sm-4">Heure</dt>
      <dd class="col-sm-8">${echapper(document.getElementById('heure-livraison').value)}</dd>
      <dt class="col-sm-4">Adresse</dt>
      <dd class="col-sm-8">
        ${echapper(document.getElementById('adresse-livraison').value)},
        ${echapper(document.getElementById('code-postal').value)}
        ${echapper(document.getElementById('ville').value)}
      </dd>
      <dt class="col-sm-4">Menu</dt>
      <dd class="col-sm-8">${menuCourant ? echapper(menuCourant.titre) : '-'}</dd>
      <dt class="col-sm-4">Nombre de personnes</dt>
      <dd class="col-sm-8">${nbP}</dd>
      <dt class="col-sm-4">Prêt de matériel</dt>
      <dd class="col-sm-8">${document.getElementById('pret-materiel') && document.getElementById('pret-materiel').checked
        ? '<span class="badge bg-warning text-dark"><i class="bi bi-check-lg"></i> Demandé</span>'
        : '<span class="text-muted">Non</span>'
      }</dd>
    </dl>
  `;

  // tableau des prix
  if (prix) {
    let lignes = `
      <tr>
        <td>Prix menu (${nbP} pers.)</td>
        <td class="text-end">${formatPrix(prix.prixMenu)}</td>
      </tr>
    `;

    if (prix.aRemise) {
      lignes += `
        <tr class="prix-remise">
          <td>Remise 10% (5+ pers. au dessus du min)</td>
          <td class="text-end">- ${formatPrix(prix.remise)}</td>
        </tr>
      `;
    }

    lignes += `
      <tr>
        <td>Livraison ${prix.horsBoirdeaux ? '(hors Bordeaux, ~' + prix.distanceEstimee + ' km)' : '(Bordeaux)'}</td>
        <td class="text-end">${prix.horsBoirdeaux ? formatPrix(prix.fraisLiv) + '*' : 'Incluse'}</td>
      </tr>
    `;

    document.getElementById('prix-tbody').innerHTML = lignes;
    document.getElementById('prix-total').textContent = formatPrix(prix.total);
  }

  // conditions du menu
  const condDiv = document.getElementById('conditions-contenu');
  if (menuCourant && menuCourant.conditions) {
    condDiv.innerHTML = '<p class="mb-0">' + echapper(menuCourant.conditions) + '</p>';
  } else {
    condDiv.innerHTML = '<p class="mb-0">Aucune condition particulière pour ce menu.</p>';
  }
}

// ---- validation d'une étape ----
function validerEtape(num) {
  const fieldset = document.getElementById('etape-' + num);
  const champs = fieldset.querySelectorAll('input, select');
  let ok = true;

  champs.forEach(function(champ) {
    champ.classList.remove('is-invalid', 'is-valid');

    if (!champ.checkValidity()) {
      champ.classList.add('is-invalid');
      ok = false;
    } else {
      champ.classList.add('is-valid');
    }
  });

  // vérification custom : date dans le futur
  if (num === 1) {
    const dateInput = document.getElementById('date-prestation');
    const dateChoisie = new Date(dateInput.value);
    const auj = new Date();
    auj.setHours(0, 0, 0, 0);

    if (dateInput.value && dateChoisie <= auj) {
      dateInput.classList.add('is-invalid');
      document.getElementById('date-prestation-error').textContent =
        'La date doit être dans le futur.';
      ok = false;
    }
  }

  // vérification custom : nb personnes >= min du menu
  if (num === 2 && menuCourant) {
    const nbP = parseInt(document.getElementById('nb-personnes').value);
    if (nbP < menuCourant._minPersonnes) {
      document.getElementById('nb-personnes').classList.add('is-invalid');
      document.getElementById('nb-personnes-error').textContent =
        'Minimum ' + menuCourant._minPersonnes + ' personne(s) pour ce menu.';
      ok = false;
    }
  }

  // vérification étape 3 : checkbox CGV
  if (num === 3) {
    const checkbox = document.getElementById('accepte-cgv');
    if (!checkbox.checked) {
      checkbox.classList.add('is-invalid');
      ok = false;
    }
  }

  if (!ok) {
    // focus sur le premier champ en erreur
    const premierErreur = fieldset.querySelector('.is-invalid');
    if (premierErreur) premierErreur.focus();
    afficherAlerte('Merci de corriger les erreurs.', 'danger');
  } else {
    effacerAlerte();
  }

  return ok;
}

// ---- navigation entre les étapes ----
function allerEtape(num) {
  // cache l'étape actuelle
  document.getElementById('etape-' + etapeActuelle).hidden = true;
  const indicActuel = document.getElementById('step-indicator-' + etapeActuelle);
  indicActuel.classList.remove('active');
  indicActuel.removeAttribute('aria-current');
  indicActuel.classList.add('completed');

  // affiche la nouvelle étape
  etapeActuelle = num;
  document.getElementById('etape-' + etapeActuelle).hidden = false;
  const indicNouveau = document.getElementById('step-indicator-' + etapeActuelle);
  indicNouveau.classList.add('active');
  indicNouveau.setAttribute('aria-current', 'step');
  indicNouveau.classList.remove('completed');

  // focus sur le titre pour les lecteurs d'écran (accessibilité)
  const legend = document.getElementById('etape-' + etapeActuelle).querySelector('legend');
  if (legend) {
    legend.setAttribute('tabindex', '-1');
    legend.focus();
  }

  // scroll en haut du formulaire
  document.getElementById('form-commande').scrollIntoView({ behavior: 'smooth' });
}

function revenirEtape(num) {
  document.getElementById('etape-' + etapeActuelle).hidden = true;
  const indicActuel = document.getElementById('step-indicator-' + etapeActuelle);
  indicActuel.classList.remove('active', 'completed');
  indicActuel.removeAttribute('aria-current');

  etapeActuelle = num;
  document.getElementById('etape-' + etapeActuelle).hidden = false;
  const indicNouveau = document.getElementById('step-indicator-' + etapeActuelle);
  indicNouveau.classList.add('active');
  indicNouveau.setAttribute('aria-current', 'step');
  indicNouveau.classList.remove('completed');

  const legend = document.getElementById('etape-' + etapeActuelle).querySelector('legend');
  if (legend) {
    legend.setAttribute('tabindex', '-1');
    legend.focus();
  }

  document.getElementById('form-commande').scrollIntoView({ behavior: 'smooth' });
}

// ---- soumission finale ----
async function envoyerCommande(e) {
  e.preventDefault();

  // sécurité : n'accepter la soumission que depuis l'étape 3
  if (etapeActuelle !== 3) return;

  // je valide l'étape 3 avant d'envoyer
  if (!validerEtape(3)) {
    return;
  }

  const btn = document.getElementById('btn-confirmer');

  // je désactive le bouton pour éviter le double clic
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> Envoi en cours...';

  const prix = calculerPrix();

  // construire lieu_prestation à partir des champs adresse
  const adresse    = document.getElementById('adresse-livraison').value.trim();
  const cp         = document.getElementById('code-postal').value.trim();
  const ville      = document.getElementById('ville').value.trim();
  const lieuPrestation = [adresse, cp, ville].filter(Boolean).join(', ');

  // je construis l'objet à envoyer (champs attendus par /api/user/commandes)
  const data = {
    menu_id:         parseInt(document.getElementById('menu-choisi').value),
    nombre_personne: parseInt(document.getElementById('nb-personnes').value),
    date_prestation: document.getElementById('date-prestation').value,
    heure_livraison: document.getElementById('heure-livraison').value,
    lieu_prestation: lieuPrestation,
    pret_materiel:   document.getElementById('pret-materiel') ? document.getElementById('pret-materiel').checked : false,
    distance_km:     cp && !cpBordeaux.includes(cp) ? DISTANCE_ESTIMEE_KM : 0
  };

  try {
    // je capture la réponse de l'API (elle contient le numéro de commande et les prix réels)
    const reponse = await fetchAPI('/user/commandes', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    // je récupère les données de la commande créée
    const commandeData = (reponse && reponse.commande) ? reponse.commande : {};

    // je construis l'objet à stocker pour la page de confirmation
    // - sousTotal et reduction : valeurs frontend (avant envoi), lisibles par l'utilisateur
    // - fraisLivraison et total : valeurs réelles renvoyées par le serveur
    const derniereCommande = {
      numero:         commandeData.numero_commande || commandeData.id || '',
      menuNom:        menuCourant ? menuCourant.titre : (commandeData.menu ? commandeData.menu.titre : ''),
      date:           data.date_prestation,
      heure:          data.heure_livraison,
      nbPersonnes:    data.nombre_personne,
      adresse:        adresse,
      codePostal:     cp,
      ville:          ville,
      sousTotal:      prix ? prix.prixMenu : (commandeData.prix_menu || 0),
      reduction:      prix && prix.aRemise ? prix.remise : 0,
      fraisLivraison: commandeData.prix_livraison !== undefined ? commandeData.prix_livraison : (prix ? prix.fraisLiv : 0),
      total:          commandeData.prix_total     !== undefined ? commandeData.prix_total     : (prix ? prix.total   : 0),
    };

    // je sauvegarde pour la page de confirmation (lue par confirmation.js via sessionStorage)
    sessionStorage.setItem('derniere_commande', JSON.stringify(derniereCommande));

    // ça a marché, je redirige vers la page de confirmation
    console.log('commande envoyée avec succès !', derniereCommande.numero);
    window.location.href = 'confirmation-commande.html';

  } catch(err) {
    console.error('erreur envoi commande', err);
    afficherAlerte(err.message || 'Une erreur est survenue, veuillez réessayer.', 'danger');

    // je réactive le bouton
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = 'Confirmer la commande';
  }
}

// ---- initialisation au chargement de la page ----
document.addEventListener('DOMContentLoaded', async function() {
  console.log('--- initialisation commande.js ---');

  // 1. vérifier que l'utilisateur est connecté
  const user = checkAuth();
  if (!user) return; // si pas connecté, on arrête là (redirection en cours)

  // 2. pré remplir les champs avec les infos du compte
  preremplir(user);

  // 3. charger les menus depuis l'API
  await chargerMenus();

  // 4. date minimum = demain (on peut pas commander pour aujourd'hui)
  const demain = new Date();
  demain.setDate(demain.getDate() + 1);
  document.getElementById('date-prestation').min = demain.toISOString().split('T')[0];

  // 5. injecter le token csrf dans le champ hidden
  const csrf = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
  document.getElementById('csrf-token-field').value = csrf;

  // 6. événements sur les boutons de navigation

  // étape 1 -> 2
  document.getElementById('btn-etape-1-suivant').addEventListener('click', function() {
    if (validerEtape(1)) {
      allerEtape(2);
    }
  });

  // étape 2 -> 1
  document.getElementById('btn-etape-2-precedent').addEventListener('click', function() {
    revenirEtape(1);
  });

  // étape 2 -> 3
  document.getElementById('btn-etape-2-suivant').addEventListener('click', function() {
    if (validerEtape(2)) {
      afficherRecap();
      allerEtape(3);
    }
  });

  // étape 3 -> 2
  document.getElementById('btn-etape-3-precedent').addEventListener('click', function() {
    revenirEtape(2);
  });

  // quand on change de menu, on met à jour les infos
  document.getElementById('menu-choisi').addEventListener('change', mettreAJourInfosMenu);

  // recalcul du prix si nb personnes change
  document.getElementById('nb-personnes').addEventListener('input', function() {
    // seulement si on est déjà passé à l'étape 3
    if (etapeActuelle === 3) {
      afficherRecap();
    }
  });

  // soumission du formulaire
  document.getElementById('form-commande').addEventListener('submit', envoyerCommande);

  console.log('commande.js initialisé avec succès');
});