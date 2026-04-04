<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Restaurant;
use App\Models\Table;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orderService) {}

    /**
     * POST /api/menu/{slug}/{tableId}/order
     * Client places an order from a table (QR scan).
     */
    public function storeFromTable(StoreOrderRequest $request, string $slug, int $tableId): JsonResponse
    {
        $restaurant = Restaurant::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $table = Table::where('id', $tableId)
            ->where('restaurant_id', $restaurant->id)
            ->firstOrFail();

        // Re-verify token on order submission
        if (!$table->isTokenValid($request->query('token', ''))) {
            return response()->json(['message' => 'QR code invalide.'], 403);
        }

        $data = array_merge($request->validated(), ['type' => 'dine_in']);

        $order = $this->orderService->createOrder($restaurant, $data, $table);

        return response()->json(new OrderResource($order), 201);
    }

    /**
     * POST /api/orders/{slug}
     * Delivery or takeaway order (no table).
     */
    public function storeDelivery(StoreOrderRequest $request, string $slug): JsonResponse
    {
        $restaurant = Restaurant::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $order = $this->orderService->createOrder($restaurant, $request->validated());

        return response()->json(new OrderResource($order), 201);
    }

    /**
     * GET /api/orders/{orderNumber}/track
     * Client tracks their order status (public, by order number).
     */
    public function track(string $orderNumber): JsonResponse
    {
        $order = \App\Models\Order::where('order_number', $orderNumber)
            ->with(['items.product', 'table'])
            ->firstOrFail();

        return response()->json(new OrderResource($order));
    }
}
