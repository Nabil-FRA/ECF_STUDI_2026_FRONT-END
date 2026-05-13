# ============================================
# Dockerfile — Vite & Gourmand (Front-end)
# Serveur : Nginx Alpine (static files)
# ============================================

FROM nginx:alpine

# Métadonnées
LABEL maintainer="ECF Studi 2026 — Vite & Gourmand"
LABEL description="Front-end statique HTML/CSS/JS Bootstrap 5.3"

# Copier les fichiers du front-end dans le répertoire Nginx
COPY . /usr/share/nginx/html

# Copier la configuration Nginx personnalisée
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Supprimer la config par défaut Nginx
RUN rm -f /etc/nginx/conf.d/default.conf.bak

# Exposer le port HTTP
EXPOSE 80

# Démarrage Nginx au premier plan (requis Docker)
CMD ["nginx", "-g", "daemon off;"]
