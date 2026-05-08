<?php

namespace App\Http\Controllers\Kitchen;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KitchenController extends Controller
{
    public function __construct(private readonly OrderService $orderService) {}

    /**
     * GET /api/kitchen/orders
     * Returns orders that the kitchen must handle (accepted, preparing, ready).
     */
    public function index(Request $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;

        $orders = Order::where('restaurant_id', $restaurantId)
            ->forKitchen()
            ->with(['items.product', 'table'])
            ->latest()
            ->get();

        return response()->json([
            'pending'   => OrderResource::collection($orders->where('status', 'pending')->values()),
            'preparing' => OrderResource::collection($orders->whereIn('status', ['accepted', 'preparing'])->values()),
            'ready'     => OrderResource::collection($orders->where('status', 'ready')->values()),
        ]);
    }

    /**
     * PATCH /api/kitchen/orders/{order}/status
     * Kitchen changes order status (accepted → preparing → ready).
     */
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:accepted,preparing,ready,served'],
        ]);

        // Ensure order belongs to this restaurant
        abort_if($order->restaurant_id !== $request->user()->restaurant_id, 403);

        $order = $this->orderService->transitionStatus($order, $validated['status']);

        return response()->json(new OrderResource($order));
    }

    /**
     * PATCH /api/kitchen/orders/{order}/items/{item}/ready
     * Mark individual item as ready.
     */
    public function markItemReady(Request $request, Order $order, int $itemId): JsonResponse
    {
        abort_if($order->restaurant_id !== $request->user()->restaurant_id, 403);

        $item = $order->items()->findOrFail($itemId);
        $item->update(['is_ready' => true]);

        return response()->json(['message' => 'Article prêt.']);
    }
}
