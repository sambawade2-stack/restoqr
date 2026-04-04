# RestoQR — Monitoring Setup

Ce document décrit le système de monitoring mis en place pour la production.

---

## 1. Health Check Endpoint

### Accès
```
GET /api/health
```

### Réponse
```json
{
  "status": "ok",
  "timestamp": "2026-03-09T12:34:56Z",
  "version": "1.0.0",
  "database": "ok",
  "cache": "ok"
}
```

### Utilisation
- **UptimeRobot** (gratuit) : Ping `/api/health` toutes les 5 min
- Alertes email si status ≠ "ok"

---

## 2. Logs Applicatifs

### Localisation
```
backend/storage/logs/laravel.log
```

### Consulter les logs
```bash
# En direct
tail -f backend/storage/logs/laravel.log

# Dernières 100 lignes
tail -100 backend/storage/logs/laravel.log

# Chercher une commande
grep "Order created" backend/storage/logs/laravel.log

# Chercher des erreurs
grep "ERROR" backend/storage/logs/laravel.log
```

### Types d'événements loggés

#### Authentification
```
User login attempt (success)
User login attempt (failed)
```

#### Commandes
```
Order created (restaurant, user, montant)
Order payment success
Order payment failed
```

#### Gestion du personnel
```
Staff created
Staff updated
Staff deleted
```

#### Suspension restaurant
```
Restaurant suspension status changed
```

#### Erreurs API
```
Error: {message, exception, file, line}
```

---

## 3. Service d'Audit (`AuditLogger`)

### Localisation
```
backend/app/Services/AuditLogger.php
```

### Utilisation dans les contrôleurs

```php
use App\Services\AuditLogger;

// Login
AuditLogger::logLogin($user, true); // success
AuditLogger::logLogin($user, false); // failed

// Commande
AuditLogger::logOrderCreation($order, $user);
AuditLogger::logPayment($order, $user, 'success');

// Personnel
AuditLogger::logStaffCreation($staff, $admin, 'created');
AuditLogger::logStaffCreation($staff, $admin, 'updated');
AuditLogger::logStaffCreation($staff, $admin, 'deleted');

// Suspension
AuditLogger::logRestaurantSuspension($restaurant, $admin, true);

// Erreurs
AuditLogger::logError('Payment processing error', $exception, ['order_id' => 123]);
```

---

## 4. Frontend Logger

### Localisation
```
frontend/src/utils/logger.js
```

### Utilisation
```jsx
import { logger } from '../../utils/logger'

// Info
logger.info('Menu loaded', { itemCount: 42 })

// Warning
logger.warn('Slow response', { duration: 5000 })

// Error
logger.error('Form submit failed', error)

// Critical
logger.critical('Payment system down', error)
```

### Comportement
- **Développement** : Logs visibles dans la console
- **Production** : Logs envoyés vers le backend (à configurer)

---

## 5. Configuration cPanel/Dokploy

### `.env` pour logs
```env
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=info
```

### Vérifier les logs
```bash
# SSH dans le serveur
ssh user@resto.com

# Voir logs temps réel
tail -f public_html/backend/storage/logs/laravel.log
```

---

## 6. Setup Uptime Monitoring (Gratuit)

### UptimeRobot
1. Aller sur https://uptimerobot.com
2. S'inscrire gratuitement
3. Ajouter un nouveau monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://resto.com/api/health`
   - **Interval**: 5 minutes
   - **Notifications**: Email
4. Reçevoir une alerte si le site est down

### Pinger manuellement
```bash
curl https://resto.com/api/health
# Doit retourner: {"status":"ok", ...}
```

---

## 7. Monitoring avancé (optionnel)

### Sentry (Erreur Tracking)
Si tu veux du monitoring d'erreurs graphique gratuit :

1. Créer compte sur https://sentry.io
2. Créer un nouveau projet (Laravel + React)
3. Ajouter DSN à `.env`:
   ```env
   SENTRY_DSN=https://YOUR_KEY@sentry.io/PROJECT_ID
   ```
4. Toutes les erreurs → dashboard Sentry (gratuit jusqu'à 5k/mois)

### New Relic (Performance)
Si tu veux monitorer la performance (temps réponse, CPU, etc.) :
- Gratuit pour petit usage
- Plus complexe à setup

---

## 8. Checklist avant production

- [ ] `.env` configuré avec `LOG_LEVEL=info`
- [ ] Vérifier que `/api/health` répond (GET)
- [ ] Créer compte UptimeRobot
- [ ] Ajouter `/api/health` à UptimeRobot
- [ ] Tester une commande et vérifier le log (admin@example.com)
- [ ] Vérifier `storage/logs/laravel.log` contient "Order created"
- [ ] Optionnel : Créer compte Sentry si tu veux plus de détails

---

## 9. Troubleshooting

### Les logs ne s'écrivent pas
```bash
# Vérifier permissions
chmod -R 755 backend/storage/logs

# Vérifier que le dossier existe
mkdir -p backend/storage/logs

# Vérifier la configuration
cat backend/config/logging.php
```

### Health check retourne `degraded`
```bash
# Vérifier la DB
mysql -u restouser -p restodb -e "SELECT 1;"

# Vérifier le cache
php artisan cache:clear
```

### Pas d'emails d'alerte
- Vérifier SMTP config dans `config/mail.php`
- Utiliser "Mailer: log" pour dev (logs seulement)
- Pour production: configurer SMTP (SendGrid, Mailgun, etc.)

---

## 10. Bonnes pratiques

✅ Vérifier les logs une fois par jour en prod
✅ Archiver les logs chaque mois (au-delà de 100MB)
✅ Monitorer le disque (/api/health incluera ça à l'avenir)
✅ Ajouter des logs aux fonctions critiques

❌ Ne pas oublier les sauvegardes de DB
❌ Ne pas exposer de logs détaillés sur `/health` en prod
❌ Ne pas loger les mots de passe

---

## Résumé rapide

| Outil | Setup | Coût | Bénéfice |
|-------|-------|------|----------|
| Health check | ✅ Fait | €0 | Savoir si le site est up |
| AuditLogger | ✅ Fait | €0 | Historique des actions |
| UptimeRobot | ⚠️ À faire | €0 | Alertes si site down |
| Sentry | ⚠️ Optionnel | €0-29 | Dashboard erreurs temps réel |

---

**Auteur**: Claude Code
**Date**: 2026-03-09
