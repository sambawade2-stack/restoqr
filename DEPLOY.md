# Déploiement RestoQR sur Dokploy

## Prérequis

- Un VPS avec Dokploy installé (≥ 2 Go RAM, Ubuntu 22.04 recommandé)
- Un domaine pointé vers l'IP du VPS (enregistrement A `app.votredomaine.com → IP`)
- Dokploy installé : `curl -sSL https://dokploy.com/install.sh | sh`

---

## Étape 1 — Pousser le code sur un dépôt Git

Dokploy clone votre dépôt pour déployer. Assurez-vous que le code est sur GitHub/GitLab/Gitea.

```bash
git add .
git commit -m "chore: adapt for Dokploy"
git push origin main
```

---

## Étape 2 — Créer l'application dans Dokploy

1. Ouvrez l'interface Dokploy (ex. `http://votre-vps:3000`)
2. **Projects** → **New Project** → donnez un nom (ex. `RestoQR`)
3. Dans le projet : **New Service** → **Application** → type **Docker Compose**
4. Choisissez **GitHub** (ou GitLab) et sélectionnez votre dépôt
5. Branch : `main`
6. Docker Compose file : `docker-compose.yml`

---

## Étape 3 — Configurer les variables d'environnement

Dans Dokploy > votre application > **Environment Variables**, copiez-collez :

```env
DOMAIN=app.votredomaine.com
APP_ENV=production
APP_DEBUG=false
LOG_LEVEL=error
APP_KEY=base64:VOTRE_CLE_ICI
DB_DATABASE=restodb
DB_USERNAME=restouser
DB_PASSWORD=MotDePasseFort123!
DB_ROOT_PASSWORD=RootMotDePasseFort123!
REDIS_PASSWORD=null
```

### Générer APP_KEY

Sur votre machine locale (avec PHP installé) :
```bash
cd backend && php artisan key:generate --show
```

Ou depuis le conteneur après un premier démarrage :
```bash
# Dans Dokploy > Terminal > service backend
php artisan key:generate --show
# Copier la valeur dans les env vars puis redéployer
```

---

## Étape 4 — Configurer le domaine SSL dans Dokploy

1. Dokploy > votre application > **Domains**
2. Ajouter le domaine : `app.votredomaine.com`
3. Cocher **HTTPS** → Dokploy génère automatiquement le certificat Let's Encrypt via Traefik

> Le Traefik de Dokploy utilise déjà `letsencrypt` comme certresolver. Les labels dans `docker-compose.yml` s'en chargent automatiquement.

---

## Étape 5 — Déployer

1. Dokploy > votre application > **Deploy**
2. Suivez les logs de build dans l'onglet **Deployments**
3. Le premier déploiement prend ~3-5 minutes (build des images Docker)

---

## Étape 6 — Initialiser la base de données

Après le premier déploiement réussi, lancez le seeder via le terminal Dokploy :

1. Dokploy > votre application > **Terminal** → sélectionnez le service `backend`
2. Exécutez :

```bash
php artisan migrate --force
php artisan db:seed --force
```

> Les migrations sont aussi lancées automatiquement au démarrage via `docker-entrypoint.sh`,
> mais le seeder doit être lancé manuellement une seule fois.

---

## Étape 7 — Vérifier

| URL | Attendu |
|-----|---------|
| `https://app.votredomaine.com` | Interface React (page login) |
| `https://app.votredomaine.com/api/health` | `{"status":"ok"}` |
| `https://app.votredomaine.com/storage/` | Fichiers uploadés accessibles |

---

## Comptes de démonstration (après seeder)

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| sambawade2@gmail.com | Gm@2026 | Super Admin (plateforme) |
| admin@chezmamie.sn | password | Admin restaurant |
| caisse@chezmamie.sn | password | Caissier |
| cuisine@chezmamie.sn | password | Cuisine |

---

## Mises à jour

Pour déployer une nouvelle version :

```bash
git push origin main
```

Puis dans Dokploy > **Deploy** (ou activer l'auto-deploy sur push).

---

## Architecture déployée

```
Internet
    │
    ▼
Traefik (Dokploy) — SSL Let's Encrypt, port 80/443
    │
    ▼
frontend:80 (Nginx)
    ├── /api/*       → PHP-FPM backend:9000 (FastCGI)
    ├── /sanctum/*   → PHP-FPM backend:9000 (FastCGI)
    ├── /storage/*   → volume partagé backend_storage
    └── /*           → React SPA (index.html)
    
backend:9000 (PHP-FPM Laravel)
    ├── db:3306      (MySQL 8)
    └── redis:6379   (Redis 7)

queue (Laravel queue worker, même image que backend)
```

---

## Développement local

Pour tester localement **sans** Dokploy/Traefik, modifiez temporairement `docker-compose.yml` :

```yaml
frontend:
  ports:
    - "80:80"
  # Supprimer les labels Traefik et le réseau dokploy-network
  networks:
    - restoqr
```

Et dans votre `.env` local :
```env
DOMAIN=localhost
APP_KEY=base64:VOTRE_CLE
DB_PASSWORD=secret
DB_ROOT_PASSWORD=rootsecret
REDIS_PASSWORD=null
```

```bash
docker compose up --build
```

---

## Dépannage

**Les appels API retournent 502 Bad Gateway**
→ Le service `backend` n'est pas encore prêt. Vérifiez les logs du service `backend` dans Dokploy.

**`storage:link` échoue**
→ Normal si le lien existe déjà. Le `docker-entrypoint.sh` gère ce cas (`|| true`).

**Certificat SSL non émis**
→ Vérifiez que le DNS pointe bien vers l'IP du VPS (`dig app.votredomaine.com`). Let's Encrypt a besoin que le port 80 soit accessible.

**`APP_KEY` manquante — erreur 500**
→ Ajoutez la variable `APP_KEY` dans les env vars Dokploy et redéployez.
