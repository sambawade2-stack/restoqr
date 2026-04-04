<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
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

        $expiringSoon = Subscription::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now()->addDays(7))
            ->count();

        $expired = Subscription::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->count();

        // New this month
        $newThisMonth = Restaurant::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        return response()->json([
            'total'         => $total,
            'active'        => $active,
            'suspended'     => $suspended,
            'expiring_soon' => $expiringSoon,
            'expired'       => $expired,
            'new_this_month'=> $newThisMonth,
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
            'plan'           => ['required', 'in:free,basic,pro'],
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

            // Create subscription
            $duration = match ($validated['plan']) {
                'free'  => null,
                'basic' => now()->addYear(),
                'pro'   => now()->addYear(),
                default => now()->addMonths(3),
            };

            Subscription::create([
                'restaurant_id' => $restaurant->id,
                'plan'          => $validated['plan'],
                'status'        => 'active',
                'amount'        => match ($validated['plan']) { 'free' => 0, 'basic' => 15000, 'pro' => 35000 },
                'starts_at'     => now(),
                'expires_at'    => $duration,
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
            'plan'       => ['required', 'in:free,basic,pro'],
            'expires_at' => ['nullable', 'date', 'after:today'],
        ]);

        $sub = $restaurant->subscription ?? new Subscription(['restaurant_id' => $restaurant->id]);
        $sub->fill([
            'plan'       => $validated['plan'],
            'status'     => 'active',
            'amount'     => match ($validated['plan']) { 'free' => 0, 'basic' => 15000, 'pro' => 35000 },
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
