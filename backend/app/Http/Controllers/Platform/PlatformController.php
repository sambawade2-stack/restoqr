<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\Restaurant;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PlatformController extends Controller
{
    /**
     * GET /api/platform/stats
     * Platform-level stats only — NO restaurant internal data.
     */
    public function stats(): JsonResponse
    {
        $total     = Restaurant::withTrashed()->count();
        $active    = Restaurant::where('is_active', true)->count();
        $suspended = Restaurant::where('is_active', false)->count();

        // Expire dans ≤ 7 jours (actif ou trial)
        $expiringSoon = Subscription::whereIn('status', ['active', 'trial'])
            ->whereNotNull('expires_at')
            ->whereBetween('expires_at', [now(), now()->addDays(7)])
            ->count();

        // Expiré = statut expired/cancelled OU expires_at passé
        $expired = Subscription::where(function ($q) {
                $q->whereIn('status', ['expired', 'cancelled'])
                  ->orWhere(function ($q2) {
                      $q2->whereNotNull('expires_at')
                         ->where('expires_at', '<', now());
                  });
            })->count();

        $newThisMonth = Restaurant::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        // Revenus
        $activeSubsCount = Subscription::where('status', 'active')->count();
        $trialCount      = Subscription::where('status', 'trial')->count();
        $price           = (float) PlatformSetting::get('subscription_price', 0);
        $currency        = (string) PlatformSetting::get('subscription_currency', 'FCFA');

        // MRR = abonnements actifs × prix mensuel
        $mrr = $activeSubsCount * $price;

        // Revenus ce mois = nouveaux actifs ce mois × prix
        $newActivesThisMonth = Subscription::where('status', 'active')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
        $revenueThisMonth = $newActivesThisMonth * $price;

        return response()->json([
            'total'               => $total,
            'active'              => $active,
            'suspended'           => $suspended,
            'expiring_soon'       => $expiringSoon,
            'expired'             => $expired,
            'new_this_month'      => $newThisMonth,
            'trial'               => $trialCount,
            'mrr'                 => $mrr,
            'revenue_this_month'  => $revenueThisMonth,
            'currency'            => $currency,
        ]);
    }

    /**
     * GET /api/platform/restaurants
     * List all restaurants (platform info only, no orders/revenue).
     */
    public function restaurants(Request $request): JsonResponse
    {
        $query = Restaurant::withTrashed()
            ->with('subscription')
            ->withCount('users')
            ->orderByDesc('created_at');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            if ($status === 'active')    $query->where('is_active', true);
            if ($status === 'suspended') $query->where('is_active', false);
        }

        $restaurants = $query->paginate(20);

        return response()->json([
            'data' => $restaurants->map(fn ($r) => $this->formatRestaurant($r)),
            'meta' => [
                'current_page' => $restaurants->currentPage(),
                'last_page'    => $restaurants->lastPage(),
                'total'        => $restaurants->total(),
            ],
        ]);
    }

    /**
     * POST /api/platform/restaurants
     * Create a restaurant + admin user.
     */
    public function createRestaurant(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', 'unique:restaurants,email'],
            'phone'          => ['nullable', 'string', 'max:30'],
            'address'        => ['nullable', 'string', 'max:300'],
            'currency'       => ['nullable', 'string', 'max:10'],
            'timezone'       => ['nullable', 'string', 'max:50'],
            'admin_name'     => ['required', 'string', 'max:100'],
            'admin_email'    => ['required', 'email', 'unique:users,email'],
            'admin_password' => ['required', 'string', 'min:8'],
        ]);

        DB::transaction(function () use ($validated, &$restaurant) {
            $restaurant = Restaurant::create([
                'name'      => $validated['name'],
                'slug'      => Str::slug($validated['name']) . '-' . Str::random(4),
                'email'     => $validated['email'],
                'phone'     => $validated['phone'] ?? null,
                'address'   => $validated['address'] ?? null,
                'currency'  => $validated['currency'] ?? 'FCFA',
                'timezone'  => $validated['timezone'] ?? 'Africa/Dakar',
                'is_active' => true,
            ]);

            $price     = (float) PlatformSetting::get('subscription_price', 0);
            $trialDays = (int)   PlatformSetting::get('trial_days', 30);

            Subscription::create([
                'restaurant_id' => $restaurant->id,
                'plan'          => 'standard',
                'status'        => 'trial',
                'amount'        => $price,
                'starts_at'     => now(),
                'expires_at'    => $trialDays > 0 ? now()->addDays($trialDays) : null,
            ]);

            // Create admin user
            User::create([
                'restaurant_id' => $restaurant->id,
                'name'          => $validated['admin_name'],
                'email'         => $validated['admin_email'],
                'password'      => Hash::make($validated['admin_password']),
                'role'          => 'admin',
                'is_active'     => true,
            ]);
        });

        return response()->json($this->formatRestaurant($restaurant->fresh(['subscription'])), 201);
    }

    /**
     * PATCH /api/platform/restaurants/{restaurant}/status
     * Activate or suspend a restaurant.
     */
    public function toggleStatus(Restaurant $restaurant): JsonResponse
    {
        $restaurant->update(['is_active' => !$restaurant->is_active]);

        return response()->json($this->formatRestaurant($restaurant->fresh(['subscription'])));
    }

    /**
     * PATCH /api/platform/restaurants/{restaurant}/subscription
     * Update subscription plan and/or expiry.
     */
    public function updateSubscription(Request $request, Restaurant $restaurant): JsonResponse
    {
        $validated = $request->validate([
            'status'     => ['required', 'in:active,trial,expired,cancelled'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $price = (float) PlatformSetting::get('subscription_price', 0);
        $sub   = $restaurant->subscription ?? new Subscription(['restaurant_id' => $restaurant->id]);
        $sub->fill([
            'plan'       => 'standard',
            'status'     => $validated['status'],
            'amount'     => $price,
            'starts_at'  => $sub->starts_at ?? now(),
            'expires_at' => $validated['expires_at'] ?? null,
        ])->save();

        return response()->json($this->formatRestaurant($restaurant->fresh(['subscription'])));
    }

    /**
     * DELETE /api/platform/restaurants/{restaurant}
     * Soft-delete (will block all access via EnsureRestaurantActive).
     */
    public function destroyRestaurant(Restaurant $restaurant): JsonResponse
    {
        $restaurant->update(['is_active' => false]);
        $restaurant->delete();

        return response()->json(null, 204);
    }

    /**
     * GET /api/platform/settings
     */
    public function getSettings(): JsonResponse
    {
        return response()->json([
            'subscription_price'    => (float)  PlatformSetting::get('subscription_price', 0),
            'subscription_currency' => (string) PlatformSetting::get('subscription_currency', 'FCFA'),
            'trial_days'            => (int)    PlatformSetting::get('trial_days', 30),
            'platform_name'         => (string) PlatformSetting::get('platform_name', 'RestoQR'),
        ]);
    }

    /**
     * POST /api/platform/settings
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subscription_price'    => ['required', 'numeric', 'min:0'],
            'subscription_currency' => ['required', 'string', 'max:10'],
            'trial_days'            => ['required', 'integer', 'min:0', 'max:365'],
            'platform_name'         => ['required', 'string', 'max:100'],
        ]);

        $oldTrialDays = (int) PlatformSetting::get('trial_days', 30);
        $newTrialDays = (int) $validated['trial_days'];

        foreach ($validated as $key => $value) {
            PlatformSetting::set($key, $value);
        }

        // Recalculer expires_at de tous les abonnements trial si la durée change
        if ($newTrialDays !== $oldTrialDays) {
            \App\Models\Subscription::where('status', 'trial')
                ->whereNotNull('starts_at')
                ->each(function ($sub) use ($newTrialDays) {
                    $sub->expires_at = $newTrialDays > 0
                        ? $sub->starts_at->copy()->addDays($newTrialDays)
                        : null;
                    $sub->save();
                });
        }

        return response()->json(['message' => 'Paramètres mis à jour.', ...$validated]);
    }

    // ── Platform viewers ───────────────────────────────────────────────────

    public function listViewers(): JsonResponse
    {
        $viewers = User::where('role', 'platform_viewer')
            ->whereNull('restaurant_id')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'created_at']);

        return response()->json($viewers);
    }

    public function createViewer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $viewer = User::create([
            'name'          => $validated['name'],
            'email'         => $validated['email'],
            'password'      => Hash::make($validated['password']),
            'role'          => 'platform_viewer',
            'restaurant_id' => null,
            'is_active'     => true,
        ]);

        return response()->json([
            'id'         => $viewer->id,
            'name'       => $viewer->name,
            'email'      => $viewer->email,
            'created_at' => $viewer->created_at,
        ], 201);
    }

    public function deleteViewer(int $id): JsonResponse
    {
        $viewer = User::where('role', 'platform_viewer')->findOrFail($id);
        $viewer->delete();
        return response()->json(null, 204);
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private function formatRestaurant(Restaurant $r): array
    {
        $sub = $r->subscription;
        return [
            'id'           => $r->id,
            'name'         => $r->name,
            'slug'         => $r->slug,
            'email'        => $r->email,
            'phone'        => $r->phone,
            'address'      => $r->address,
            'currency'     => $r->currency,
            'is_active'    => $r->is_active,
            'users_count'  => $r->users_count ?? 0,
            'created_at'   => $r->created_at,
            'subscription' => $sub ? [
                'plan'       => $sub->plan,
                'status'     => $sub->status,
                'expires_at' => $sub->expires_at,
                'is_active'  => $sub->isActive(),
            ] : null,
        ];
    }
}
