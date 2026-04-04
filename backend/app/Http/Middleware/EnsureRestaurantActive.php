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

        if ($user) {
            $restaurant = $user->restaurant;

            if (!$restaurant || !$restaurant->is_active) {
                return response()->json(['message' => 'Restaurant suspendu ou inactif.'], 403);
            }
        }

        return $next($request);
    }
}
