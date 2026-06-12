<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    /** GET /api/admin/settings */
    public function show(Request $request): JsonResponse
    {
        $restaurant = $request->user()->restaurant;

        return response()->json([
            'id'               => $restaurant->id,
            'name'             => $restaurant->name,
            'email'            => $restaurant->email,
            'phone'            => $restaurant->phone,
            'address'          => $restaurant->address,
            'currency'         => $restaurant->currency,
            'timezone'         => $restaurant->timezone,
            'logo'             => $restaurant->logo ? storage_url($restaurant->logo) : null,
            'shift_start_hour' => $restaurant->settings['shift_start_hour'] ?? 3,
        ]);
    }

    /** PATCH /api/admin/settings */
    public function update(Request $request): JsonResponse
    {
        $restaurant = $request->user()->restaurant;

        $validated = $request->validate([
            'name'             => ['sometimes', 'string', 'max:100'],
            'email'            => ['sometimes', 'email', 'max:150'],
            'phone'            => ['sometimes', 'nullable', 'string', 'max:30'],
            'address'          => ['sometimes', 'nullable', 'string', 'max:300'],
            'currency'         => ['sometimes', 'string', 'max:10'],
            'timezone'         => ['sometimes', 'string', 'max:50'],
            'shift_start_hour' => ['sometimes', 'integer', 'min:0', 'max:23'],
            'logo'             => ['sometimes', 'nullable', 'file', 'max:2048', 'mimes:jpeg,jpg,png,webp'],
        ]);

        DB::transaction(function () use ($restaurant, $validated, $request) {
            // Logo upload
            if ($request->hasFile('logo')) {
                if ($restaurant->logo) Storage::disk('public')->delete($restaurant->logo);
                $validated['logo'] = $request->file('logo')->store('logos', 'public');
            }

            // Shift start hour → settings JSON
            $shiftHour = null;
            if (isset($validated['shift_start_hour'])) {
                $shiftHour = $validated['shift_start_hour'];
                unset($validated['shift_start_hour']);
            }

            $restaurant->update($validated);

            if ($shiftHour !== null) {
                $restaurant->settings = array_merge($restaurant->settings ?? [], ['shift_start_hour' => $shiftHour]);
                $restaurant->save();
            }
        });

        return response()->json([
            'message'    => 'Paramètres mis à jour.',
            'restaurant' => [
                'id'               => $restaurant->id,
                'name'             => $restaurant->fresh()->name,
                'email'            => $restaurant->fresh()->email,
                'phone'            => $restaurant->fresh()->phone,
                'address'          => $restaurant->fresh()->address,
                'currency'         => $restaurant->fresh()->currency,
                'timezone'         => $restaurant->fresh()->timezone,
                'logo'             => $restaurant->fresh()->logo ? storage_url($restaurant->fresh()->logo) : null,
                'shift_start_hour' => $restaurant->fresh()->settings['shift_start_hour'] ?? 3,
            ],
        ]);
    }

    /** GET /api/admin/orders/history?date=2026-03-23 */
    public function orderHistory(Request $request): JsonResponse
    {
        $validated = $request->validate(['date' => ['required', 'date_format:Y-m-d']]);

        $restaurantId = $request->user()->restaurant_id;
        $restaurant   = $request->user()->restaurant;

        $date  = $validated['date'];
        $start = \Carbon\Carbon::parse($date, $restaurant->timezone ?? 'Africa/Dakar')->startOfDay();
        $end   = $start->copy()->endOfDay();

        $orders = \App\Models\Order::where('restaurant_id', $restaurantId)
            ->whereBetween('created_at', [$start, $end])
            ->with(['items.product', 'table', 'payment'])
            ->orderByDesc('created_at')
            ->get();

        $revenue = $orders->where('status', 'paid')->sum('total');
        $paid    = $orders->where('status', 'paid')->count();

        return response()->json([
            'date'    => $date,
            'summary' => [
                'total_orders'  => $orders->count(),
                'paid_orders'   => $paid,
                'total_revenue' => (float) $revenue,
            ],
            'orders'  => \App\Http\Resources\OrderResource::collection($orders),
        ]);
    }
}
