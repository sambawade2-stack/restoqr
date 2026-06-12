# 🍽️ RestoQR

**Solution SaaS de gestion de restaurant avec commande par QR code.**

RestoQR est une plateforme multi-tenant qui permet à plusieurs restaurants de gérer leur menu, leurs commandes et leur personnel depuis une seule application. Les clients scannent un QR code sur leur table pour consulter le menu et commander, sans application à installer.

---

## ✨ Fonctionnalités

### Côté client (sans compte)
- 📱 Menu accessible par scan d'un **QR code** unique par table
- 🛒 Commande à table en quelques clics
- 🚚 Commande en mode livraison / à emporter
- 🔎 Suivi de commande en temps réel via un numéro de commande

### Côté restaurant
- 👨‍🍳 **Interface cuisine** : suivi des commandes en mode sombre, marquage des plats prêts
- 💵 **Interface caisse** : ouverture/fermeture de shift, encaissement, historique
- 🧑‍💼 **Back-office admin** : gestion du menu (catégories & produits), des tables et QR codes, du personnel, des commandes et des statistiques
- 📊 Tableaux de bord et visualisations (ApexCharts)

### Côté plateforme (super admin)
- 🏢 Gestion multi-restaurants (création, suspension, suppression)
- 💳 Gestion des abonnements et périodes d'essai
- ⚙️ Paramètres de tarification de la plateforme

---

## 🧱 Stack technique

| Couche | Technologies |
|--------|--------------|
| **Backend** | Laravel 12 (PHP 8.2+), MySQL 8, Redis, Laravel Sanctum |
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, React Router, ApexCharts |
| **QR Code** | `simplesoftwareio/simple-qrcode` (backend) + `react-qr-code` (frontend) |
| **Infrastructure** | Docker, Nginx (compatible Dokploy) |

---

## 🗂️ Structure du projet

```
resto/
├── backend/            # API REST Laravel
│   ├── app/            # Models, Controllers, Middleware, Services
│   ├── routes/         # api.php (routes API)
│   ├── database/       # Migrations, seeders, factories
│   └── config/
├── frontend/           # SPA React / Vite
│   └── src/
│       ├── pages/      # Vues par rôle (admin, cashier, kitchen, client, platform)
│       ├── components/ # Composants réutilisables
│       ├── store/      # État global (Zustand)
│       └── api/        # Clients HTTP (axios)
├── nginx/              # Configuration du reverse proxy
├── docker-compose.yml  # Orchestration des services
└── DEPLOY.md           # Guide de déploiement
```

---

## 👥 Rôles utilisateurs

| Rôle | Description |
|------|-------------|
| `super_admin` | Propriétaire de la plateforme |
| `platform_viewer` | Lecture seule sur la plateforme |
| `admin` | Administrateur d'un restaurant |
| `cashier` | Caissier |
| `kitchen` | Personnel de cuisine |
| `waiter` | Serveur |

L'isolation multi-tenant repose sur un `restaurant_id` porté par chaque entité métier, et sur un middleware de contrôle des rôles (RBAC).

---

## 🔄 Cycle de vie d'une commande

```
pending → accepted → preparing → ready → served → paid → closed
```

---

## 🚀 Démarrage rapide (Docker)

> ⚠️ Aucune valeur secrète n'est versionnée. Tu dois créer ton propre fichier d'environnement à partir de l'exemple fourni.

```bash
# 1. Cloner le dépôt
git clone https://github.com/sambawade2-stack/restoqr.git
cd restoqr

# 2. Créer le fichier d'environnement
cp .env.example .env
# → Éditer .env et renseigner : APP_KEY, mots de passe DB/Redis, domaine

# 3. Lancer les services
docker compose up --build

# 4. Initialiser la base (migrations + données de démo)
docker compose exec backend php artisan migrate --seed
```

L'application est ensuite disponible sur le domaine configuré.

### Développement local (sans Docker)

```bash
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve

# Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev
```

---

## 🔐 Configuration & sécurité

- Les fichiers `.env` **ne sont pas versionnés** : seuls les modèles `.env.example` le sont. Reporte-toi à eux pour la liste des variables attendues.
- Génère la clé applicative avec `php artisan key:generate`.
- L'authentification est gérée par **Laravel Sanctum** (tokens).
- Les routes publiques sont protégées par du **rate limiting** (throttling).
- Chaque table possède un **token QR unique** vérifié côté serveur.

> Ne committe jamais de secret (clé, mot de passe, token) dans le dépôt.

---

## 📡 Aperçu de l'API

L'API expose un point de santé et des routes regroupées par rôle :

- `GET /api/health` — état de la base de données et du cache
- `POST /api/auth/login` — authentification
- `GET /api/menu/{slug}/{tableId}` — menu d'une table (public)
- `POST /api/menu/{slug}/{tableId}/order` — commande à table (public)
- Routes protégées par rôle : `/platform/*`, `/admin/*`, `/cashier/*`, `/kitchen/*`

Voir [backend/routes/api.php](backend/routes/api.php) pour la liste complète.

---

## 📊 Monitoring

- **Health check** : `GET /api/health`
- **Logs** : `backend/storage/logs/laravel.log` + logger frontend
- **Uptime** : compatible UptimeRobot sur `/api/health`

Voir [MONITORING.md](MONITORING.md) pour les détails.

---

## 📦 Déploiement

Le projet est conçu pour un déploiement conteneurisé (Docker + Nginx), compatible **Dokploy** et VPS classique.

Voir [DEPLOY.md](DEPLOY.md) pour la procédure complète.

---

## 📄 Licence

Projet propriétaire. Tous droits réservés.
