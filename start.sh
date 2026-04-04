#!/bin/bash
set -e

# Détecter l'IP WiFi automatiquement
IP=$(hostname -I | awk '{print $1}')
echo "🌐 IP détectée : $IP"

# Mettre à jour FRONTEND_URL dans le backend
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=http://$IP:5173|" backend/.env

# Vider le cache Laravel et régénérer les QR codes
cd backend
php artisan config:clear --quiet
php artisan tinker --execute="
App\Models\Table::all()->each(fn(\$t) => app(App\Services\QRCodeService::class)->generate(\$t));
echo '✅ QR codes régénérés';
" 2>&1 | grep -v "DEPRECATED\|warning\|Implicitly"

# Lancer le backend en arrière-plan
php artisan serve --host=0.0.0.0 --port=8000 &
BACKEND_PID=$!
echo "🚀 Backend lancé (PID $BACKEND_PID) → http://$IP:8000"

# Lancer Vite en avant-plan
cd ../frontend
echo "🎨 Frontend → http://$IP:5173"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Admin    : http://$IP:5173"
echo "  QR Menu  : http://$IP:5173/menu/..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
npm run dev

# Arrêter le backend quand Vite se ferme
kill $BACKEND_PID 2>/dev/null
