<?php

namespace App\Http\Controllers\Auth;

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

class RegisterController extends Controller
{
    /**
     * POST /api/register
     * Inscription publique : crée le restaurant + admin + abonnement en attente.
     * L'abonnement est en statut "trial" jusqu'à validation du paiement.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Infos restaurant
            'restaurant_name'    => ['required', 'string', 'max:100'],
            'restaurant_email'   => ['required', 'email', 'unique:restaurants,email'],
            'restaurant_phone'   => ['nullable', 'string', 'max:30'],
            'restaurant_address' => ['nullable', 'string', 'max:300'],
            'currency'           => ['nullable', 'string', 'max:10'],
            'timezone'           => ['nullable', 'string', 'max:50'],
            // Plan
            'plan'               => ['nullable', 'string'], // ignoré, plan unique
            // Compte admin
            'admin_name'         => ['required', 'string', 'max:100'],
            'admin_email'        => ['required', 'email', 'unique:users,email'],
            'admin_password'     => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        DB::transaction(function () use ($validated, &$restaurant, &$admin) {
            $slug = Str::slug($validated['restaurant_name']);
            // Garantir unicité du slug
            $base = $slug ?: 'restaurant';
            $slug = $base . '-' . Str::random(5);

            $restaurant = Restaurant::create([
                'name'      => $validated['restaurant_name'],
                'slug'      => $slug,
                'email'     => $validated['restaurant_email'],
                'phone'     => $validated['restaurant_phone'] ?? null,
                'address'   => $validated['restaurant_address'] ?? null,
                'currency'  => $validated['currency'] ?? 'FCFA',
                'timezone'  => $validated['timezone'] ?? 'Africa/Dakar',
                'is_active' => true, // actif immédiatement (paiement à configurer plus tard)
            ]);

            $price      = (float) PlatformSetting::get('subscription_price', 0);
            $trialDays  = (int)   PlatformSetting::get('trial_days', 30);

            Subscription::create([
                'restaurant_id' => $restaurant->id,
                'plan'          => 'standard',
                'status'        => 'trial',
                'amount'        => $price,
                'starts_at'     => now(),
                'expires_at'    => $trialDays > 0 ? now()->addDays($trialDays) : null,
            ]);

            $admin = User::create([
                'restaurant_id' => $restaurant->id,
                'name'          => $validated['admin_name'],
                'email'         => $validated['admin_email'],
                'password'      => Hash::make($validated['admin_password']),
                'role'          => 'admin',
                'is_active'     => true,
            ]);
        });

        // Connecter automatiquement après inscription
        $token = $admin->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Inscription réussie ! Bienvenue sur RestoQR.',
            'user'    => [
                'id'            => $admin->id,
                'name'          => $admin->name,
                'email'         => $admin->email,
                'role'          => $admin->role,
                'restaurant_id' => $admin->restaurant_id,
                'restaurant'    => [
                    'id'       => $restaurant->id,
                    'name'     => $restaurant->name,
                    'slug'     => $restaurant->slug,
                    'email'    => $restaurant->email,
                    'phone'    => $restaurant->phone,
                    'address'  => $restaurant->address,
                    'currency' => $restaurant->currency,
                    'timezone' => $restaurant->timezone,
                    'logo'     => null,
                ],
            ],
            'token' => $token,
        ], 201);
    }
}
