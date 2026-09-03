# Vite & Gourmand : Front-end

> **ECF : RNCP37674 Developpeur Web et Web Mobile**
> Bloc de competences BC01 : Developper la partie front-end d'une application web

Application front-end statique (HTML / CSS / JS / Bootstrap 5.3) pour le site de traiteur en ligne **Vite & Gourmand**. Consomme l'API REST du back-end Symfony.

---

## Sommaire

1. [Technologies utilisees](#technologies-utilisees)
2. [Prerequis](#prerequis)
3. [Installation avec Docker (recommande)](#installation-avec-docker-recommande)
4. [Installation sans Docker](#installation-sans-docker)
5. [Configuration de l'URL API](#configuration-de-lurl-api)
6. [Pages disponibles](#pages-disponibles)
7. [Structure du projet](#structure-du-projet)

---

## Technologies utilisees

| Technologie | Role |
|---|---|
| HTML5 | Structure des pages |
| CSS3 | Styles personnalises |
| JavaScript (ES6) | Logique metier, appels API |
| Bootstrap 5.3 | Framework CSS responsive |
| Chart.js | Graphiques (espace admin) |
| Nginx Alpine | Serveur statique (Docker) |

---

## Prerequis

- **Git**
- **Docker Desktop** (Windows/Mac) ou **Docker Engine** (Linux) pour l'installation Docker
- OU un simple serveur HTTP (Live Server, etc.) pour l'installation sans Docker

---

## Installation avec Docker (recommandé)

Le front-end est integre dans le `docker-compose.yml` du back-end. Les deux depots doivent respecter l'arborescence suivante :

```
Projet/
├── ECF_STUDI_2026_FRONT-END/          <-- ce depot
└── Backend/
    └── ECF_STUDI_2026_BACK-END/       <-- depot back-end (contient docker-compose.yml)
```

> Cette arborescence n'est pas decorative : le service `frontend` du
> `docker-compose.yml` se construit depuis `../../ECF_STUDI_2026_FRONT-END`.
> Un niveau de dossier en trop et le build echoue.

### Etapes

**1. Cloner les deux dépots**

```bash
mkdir Projet && cd Projet

git clone https://github.com/Nabil-FRA/ECF_STUDI_2026_FRONT-END.git

mkdir Backend
git clone https://github.com/Nabil-FRA/ECF_STUDI_2026_BACK-END.git Backend/ECF_STUDI_2026_BACK-END
```

Vous restez dans `Projet/` a la fin de cette etape.

**2. Configurer l'URL de l'API pour Docker**

Dans le fichier `ECF_STUDI_2026_FRONT-END/JS/api.js`, ligne 16, remplacer :

```js
var API_BASE_URL = 'https://vite-et-gourmand-ecf-nar-7b5ab7722b1a.herokuapp.com/api';
```

Par :

```js
var API_BASE_URL = 'http://localhost:8080/api';
```

**3. Lancer Docker**

```bash
cd Backend/ECF_STUDI_2026_BACK-END
docker-compose up -d --build
```

**4. Acceder au site**

| Service | URL |
|---|---|
| Front-end | http://localhost:3000 |
| API Back-end | http://localhost:8080 |
| Adminer (BDD) | http://localhost:8081 |
| Mailhog (emails) | http://localhost:8025 |

---

## Installation sans Docker

Ouvrir simplement `index.html` avec un serveur HTTP local (ex : extension Live Server de VS Code). Le front-end pointe par defaut vers l'API en production sur Heroku.

---

## Configuration de l'URL API

Le fichier `JS/api.js` contient l'URL de base de l'API (ligne 16) :

| Environnement | Valeur de `API_BASE_URL` |
|---|---|
| Production (Heroku) | `https://vite-et-gourmand-ecf-nar-7b5ab7722b1a.herokuapp.com/api` |
| Docker local | `http://localhost:8080/api` |

---

## Pages disponibles

| Page | Fichier | Description |
|---|---|---|
| Accueil | `index.html` | Page d'accueil avec avis et horaires |
| Menus | `pages/menus.html` | Liste des menus avec filtres |
| Detail menu | `pages/menu-detail.html` | Detail d'un menu avec plats et allergenes |
| Connexion | `pages/connexion.html` | Formulaire de connexion |
| Inscription | `pages/inscription.html` | Formulaire d'inscription |
| Mot de passe oublie | `pages/mot-de-passe-oublie.html` | Demande de reinitialisation |
| Espace client | `pages/espace-client.html` | Profil, commandes, avis |
| Espace employe | `pages/espace-employe.html` | Gestion commandes et avis |
| Espace admin | `pages/espace-admin.html` | Stats, utilisateurs, employes |
| Commande | `pages/commande.html` | Passer une commande |
| Contact | `pages/contact.html` | Formulaire de contact |
| Mentions legales | `pages/mentions-legales.html` | Mentions legales |
| CGV | `pages/cgv.html` | Conditions generales de vente |
| Politique de confidentialite | `pages/politique-confidentialite.html` | RGPD |

---

## Structure du projet

```
ECF_STUDI_2026_FRONT-END/
├── index.html                  # Page d'accueil
├── pages/                      # Pages du site
├── CSS/                        # Feuilles de style
├── JS/                         # Scripts JavaScript
│   ├── api.js                  # Couche d'abstraction API (fetch)
│   ├── auth.js                 # Authentification et gestion token
│   ├── menus.js                # Page menus
│   ├── menu-detail.js          # Page detail menu
│   ├── commande.js             # Page commande
│   ├── espace-client.js        # Espace client
│   ├── espace-employe.js       # Espace employe
│   ├── espace-admin.js         # Espace admin
│   └── ...
├── assets/                     # Images, logos, favicon
├── Dockerfile                  # Image Nginx Alpine
├── docker/
│   └── nginx/
│       └── nginx.conf          # Configuration Nginx
└── .dockerignore
```

---

*Projet realise dans le cadre de l'ECF RNCP37674 Developpeur Web et Web Mobile, Studi 2026*
