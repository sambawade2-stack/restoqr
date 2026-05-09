<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\ActivityLog;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            AuditLogger::logLogin($user ?? new User(['email' => $request->email]), false);
            return response()->json(['message' => 'Identifiants incorrects.'], 401);
        }

        if (!$user->is_active) {
            AuditLogger::logLogin($user, false);
            return response()->json(['message' => 'Compte désactivé.'], 403);
        }

        $user->load('restaurant.subscription');

        // Bloquer la connexion si le restaurant est suspendu
        if ($user->restaurant && !$user->restaurant->is_active) {
            AuditLogger::logLogin($user, false);
            return response()->json([
                'message' => 'Ce restaurant a été suspendu. Contactez le support.',
                'code'    => 'restaurant_suspended',
            ], 403);
        }
        $token = $user->createToken('auth_token')->plainTextToken;

        ActivityLog::record('auth.login', $user->restaurant_id);
        AuditLogger::logLogin($user, true);

        return response()->json([
            'user'  => [
                'id'            => $user->id,
                'name'          => $user->name,
                'email'         => $user->email,
                'role'          => $user->role,
                'restaurant_id' => $user->restaurant_id,
                'restaurant'    => $user->restaurant ? $this->formatRestaurant($user->restaurant) : null,
            ],
            'token' => $token,
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Mot de passe actuel incorrect.'], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté avec succès.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('restaurant.subscription');

        return response()->json([
            'id'            => $user->id,
            'name'          => $user->name,
            'email'         => $user->email,
            'role'          => $user->role,
            'restaurant_id' => $user->restaurant_id,
            'restaurant'    => $user->restaurant ? $this->formatRestaurant($user->restaurant) : null,
        ]);
    }

    private function formatRestaurant($restaurant): array
    {
        $sub = $restaurant->subscription;

        return [
            'id'           => $restaurant->id,
            'name'         => $restaurant->name,
            'slug'         => $restaurant->slug,
            'email'        => $restaurant->email,
            'phone'        => $restaurant->phone,
            'address'      => $restaurant->address,
            'currency'     => $restaurant->currency,
            'timezone'     => $restaurant->timezone,
            'logo'         => $restaurant->logo ? asset('storage/' . $restaurant->logo) : null,
            'order_qr_url' => $restaurant->order_qr_url,
            'is_active'    => $restaurant->is_active,
            'subscription' => $sub ? [
                'status'     => $sub->status,
                'plan'       => $sub->plan,
                'is_active'  => $sub->isActive(),
                'expires_at' => $sub->expires_at,
                'days_left'  => $sub->daysUntilExpiry(),
            ] : null,
        ];
    }
}
