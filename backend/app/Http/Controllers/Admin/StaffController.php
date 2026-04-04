<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class StaffController extends Controller
{
    // Rôles qu'un admin peut attribuer (pas super_admin)
    private const ALLOWED_ROLES = ['admin', 'cashier', 'kitchen'];

    /**
     * GET /admin/staff
     */
    public function index(Request $request): JsonResponse
    {
        $staff = User::where('restaurant_id', $request->user()->restaurant_id)
            ->where('id', '!=', $request->user()->id) // exclude self
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'is_active', 'created_at']);

        return response()->json($staff);
    }

    /**
     * POST /admin/staff
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => ['required', Password::min(8)],
            'role'     => 'required|in:' . implode(',', self::ALLOWED_ROLES),
        ]);

        $user = User::create([
            'restaurant_id' => $request->user()->restaurant_id,
            'name'          => $data['name'],
            'email'         => $data['email'],
            'password'      => Hash::make($data['password']),
            'role'          => $data['role'],
            'is_active'     => true,
        ]);

        AuditLogger::logStaffCreation($user, $request->user(), 'created');

        return response()->json($user, 201);
    }

    /**
     * PATCH /admin/staff/{user}
     */
    public function update(Request $request, User $user): JsonResponse
    {
        // Ensure the user belongs to the same restaurant
        abort_if($user->restaurant_id !== $request->user()->restaurant_id, 403);

        $data = $request->validate([
            'name'      => 'sometimes|string|max:100',
            'email'     => 'sometimes|email|unique:users,email,' . $user->id,
            'password'  => ['sometimes', 'nullable', Password::min(8)],
            'role'      => 'sometimes|in:' . implode(',', self::ALLOWED_ROLES),
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($data['password']) && $data['password']) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        AuditLogger::logStaffCreation($user, $request->user(), 'updated');

        return response()->json($user->fresh(['restaurant']));
    }

    /**
     * DELETE /admin/staff/{user}
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_if($user->restaurant_id !== $request->user()->restaurant_id, 403);
        abort_if($user->id === $request->user()->id, 422, 'Impossible de se supprimer soi-même.');

        // Log before deletion
        $deletedUser = clone $user;
        AuditLogger::logStaffCreation($deletedUser, $request->user(), 'deleted');

        $user->delete();

        return response()->json(null, 204);
    }
}
