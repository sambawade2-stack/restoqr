<?php

namespace App\Http\Controllers\Cashier;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Shift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    /** GET /cashier/shift — session en cours */
    public function current(Request $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;

        $shift = Shift::where('restaurant_id', $restaurantId)
            ->where('status', 'open')
            ->with('openedBy:id,name')
            ->latest('opened_at')
            ->first();

        if (! $shift) {
            return response()->json(['shift' => null]);
        }

        return response()->json([
            'shift' => $this->formatShift($shift, $restaurantId),
        ]);
    }

    /** POST /cashier/shift/open — ouvrir la caisse */
    public function open(Request $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;

        // Vérifier qu'il n'y a pas déjà une caisse ouverte
        $existing = Shift::where('restaurant_id', $restaurantId)
            ->where('status', 'open')
            ->exists();

        if ($existing) {
            return response()->json(['message' => 'Une caisse est déjà ouverte.'], 422);
        }

        $shift = Shift::create([
            'restaurant_id' => $restaurantId,
            'opened_by'     => $request->user()->id,
            'opened_at'     => now(),
            'status'        => 'open',
        ]);

        $shift->load('openedBy:id,name');

        return response()->json([
            'shift'   => $this->formatShift($shift, $restaurantId),
            'message' => 'Caisse ouverte.',
        ], 201);
    }

    /** POST /cashier/shift/close — clôturer la caisse */
    public function close(Request $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;

        $shift = Shift::where('restaurant_id', $restaurantId)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();

        if (! $shift) {
            return response()->json(['message' => 'Aucune caisse ouverte.'], 422);
        }

        // Calculer les totaux depuis l'ouverture
        $totalRevenue = Payment::where('restaurant_id', $restaurantId)
            ->where('status', 'paid')
            ->where('paid_at', '>=', $shift->opened_at)
            ->sum('amount');

        $totalOrders = Order::where('restaurant_id', $restaurantId)
            ->whereIn('status', ['paid', 'closed'])
            ->where('updated_at', '>=', $shift->opened_at)
            ->count();

        $shift->update([
            'closed_by'     => $request->user()->id,
            'closed_at'     => now(),
            'status'        => 'closed',
            'total_orders'  => $totalOrders,
            'total_revenue' => $totalRevenue,
            'notes'         => $request->input('notes'),
        ]);

        $shift->load(['openedBy:id,name', 'closedBy:id,name']);

        return response()->json([
            'shift'   => $shift,
            'message' => 'Caisse clôturée.',
        ]);
    }

    /** GET /cashier/shift/history — historique des sessions */
    public function history(Request $request): JsonResponse
    {
        $shifts = Shift::where('restaurant_id', $request->user()->restaurant_id)
            ->with(['openedBy:id,name', 'closedBy:id,name'])
            ->orderByDesc('opened_at')
            ->limit(30)
            ->get();

        return response()->json($shifts);
    }

    private function formatShift(Shift $shift, int $restaurantId): array
    {
        // Revenue encaissé depuis l'ouverture (seulement les paiements confirmés)
        $revenue = Payment::where('restaurant_id', $restaurantId)
            ->where('status', 'paid')
            ->where('paid_at', '>=', $shift->opened_at)
            ->sum('amount');

        // Toutes les commandes créées depuis l'ouverture (hors annulées)
        $totalOrders = Order::where('restaurant_id', $restaurantId)
            ->where('created_at', '>=', $shift->opened_at)
            ->whereNotIn('status', ['cancelled'])
            ->count();

        // Commandes payées/clôturées
        $paidOrders = Order::where('restaurant_id', $restaurantId)
            ->whereIn('status', ['paid', 'closed'])
            ->where('updated_at', '>=', $shift->opened_at)
            ->count();

        // Commandes en cours (actives)
        $activeOrders = Order::where('restaurant_id', $restaurantId)
            ->whereNotIn('status', ['paid', 'closed', 'cancelled'])
            ->where('created_at', '>=', $shift->opened_at)
            ->count();

        return [
            'id'            => $shift->id,
            'status'        => $shift->status,
            'opened_at'     => $shift->opened_at->toIso8601String(),
            'closed_at'     => $shift->closed_at?->toIso8601String(),
            'opened_by'     => $shift->openedBy?->name,
            'total_revenue' => (float) $revenue,
            'total_orders'  => (int) $totalOrders,
            'paid_orders'   => (int) $paidOrders,
            'active_orders' => (int) $activeOrders,
        ];
    }
}
