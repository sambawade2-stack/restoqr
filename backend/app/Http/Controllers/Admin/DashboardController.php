<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;
        $restaurant   = $request->user()->restaurant;

        // ── Journée métier (ex: 08h → 03h lendemain) ─────────────────────
        [$dayStart, $dayEnd] = $restaurant->businessDayBounds();

        // Cache 60s — les stats "actives" changent vite, inutile de dépasser 1min
        // Clé stable (pas de timestamp) pour que invalidateCache() fonctionne avec Redis
        $cacheKey = "stats:{$restaurantId}";
        return Cache::remember($cacheKey, 60, function () use ($restaurantId, $restaurant, $dayStart, $dayEnd) {
            return $this->buildStats($restaurantId, $restaurant, $dayStart, $dayEnd);
        });
    }

    private function buildStats(int $restaurantId, $restaurant, $dayStart, $dayEnd): JsonResponse
    {

        // ── Stats journée en cours ─────────────────────────────────────────
        $today = DB::table('orders')
            ->where('restaurant_id', $restaurantId)
            ->whereBetween('created_at', [$dayStart, $dayEnd])
            ->selectRaw("
                COUNT(*) as total_orders,
                SUM(CASE WHEN type = 'delivery' THEN 1 ELSE 0 END) as deliveries,
                SUM(CASE WHEN status NOT IN ('paid','closed','cancelled') THEN 1 ELSE 0 END) as active
            ")
            ->first();

        // Revenue de la journée métier en cours
        $todayRevenue = DB::table('payments')
            ->where('restaurant_id', $restaurantId)
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$dayStart, $dayEnd])
            ->sum('amount');

        // ── Weekly sales : 7 dernières journées métier ─────────────────────
        $weeklySales = Order::where('restaurant_id', $restaurantId)
            ->where('status', 'paid')
            ->where('created_at', '>=', $dayStart->copy()->subDays(6))
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        // Zero-fill sur 7 jours
        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date    = $dayStart->copy()->subDays($i)->toDateString();
            $dayData = $weeklySales->get($date);
            $days[]  = [
                'date'    => $date,
                'label'   => $dayStart->copy()->subDays($i)->locale('fr')->isoFormat('ddd'),
                'revenue' => (float) ($dayData?->revenue ?? 0),
                'orders'  => (int)   ($dayData?->orders  ?? 0),
            ];
        }

        // ── Top produits de la journée métier ─────────────────────────────
        $topProducts = DB::table('order_items')
            ->join('orders',   'orders.id',   '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.restaurant_id', $restaurantId)
            ->whereBetween('orders.created_at', [$dayStart, $dayEnd])
            ->select('products.name', DB::raw('SUM(order_items.quantity) as total_qty'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->get();

        return response()->json([
            'today' => [
                'orders'     => (int)   ($today->total_orders ?? 0),
                'revenue'    => (float) $todayRevenue,
                'deliveries' => (int)   ($today->deliveries   ?? 0),
                'active'     => (int)   ($today->active       ?? 0),
            ],
            'business_day' => [
                'start'            => $dayStart->toIso8601String(),
                'end'              => $dayEnd->toIso8601String(),
                'shift_start_hour' => $restaurant->settings['shift_start_hour'] ?? 3,
            ],
            'weekly_sales' => $days,
            'top_products' => $topProducts,
        ]);
    }

    /** Invalide le cache stats dès qu'une commande change */
    public static function invalidateCache(int $restaurantId): void
    {
        Cache::forget("stats:{$restaurantId}");
    }
}
