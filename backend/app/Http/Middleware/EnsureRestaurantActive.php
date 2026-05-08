<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRestaurantActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // super_admin et platform_viewer ne sont liés à aucun restaurant
        if (!$user || in_array($user->role, ['super_admin', 'platform_viewer'])) {
            return $next($request);
        }

        $restaurant = $user->restaurant;

        if (!$restaurant) {
            return response()->json(['message' => 'Aucun restaurant associé à ce compte.'], 403);
        }

        if (!$restaurant->is_active) {
            return response()->json([
                'message' => 'Restaurant suspendu. Contactez le support.',
                'code'    => 'restaurant_suspended',
            ], 403);
        }

        $subscription = $restaurant->subscription;

        if (!$subscription || $subscription->isExpired()) {
            return response()->json([
                'message'  => 'Abonnement expiré. Renouvelez pour continuer.',
                'code'     => 'subscription_expired',
                'expires_at' => $subscription?->expires_at,
            ], 403);
        }

        return $next($request);
    }
}
