<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Table;
use App\Services\OrderService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService  $orderService,
        private readonly PaymentService $paymentService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;

        $query = Order::where('restaurant_id', $restaurantId)
            ->with(['items.product', 'table', 'payment'])
            ->latest();

        // Filters
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($request->boolean('today')) {
            $query->today();
        }

        $orders = $query->paginate(25);

        return response()->json([
            'data' => OrderResource::collection($orders->items()),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page'    => $orders->lastPage(),
                'total'        => $orders->total(),
            ],
        ]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        abort_if($order->restaurant_id !== $request->user()->restaurant_id, 403);

        $order->load('items.product', 'table', 'payment');

        return response()->json(new OrderResource($order));
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        abort_if($order->restaurant_id !== $request->user()->restaurant_id, 403);

        $request->validate([
            'status' => ['required', 'string'],
        ]);

        $order = $this->orderService->transitionStatus($order, $request->status);

        return response()->json(new OrderResource($order));
    }

    public function processPayment(Request $request, Order $order): JsonResponse
    {
        abort_if($order->restaurant_id !== $request->user()->restaurant_id, 403);

        $request->validate([
            'method'         => ['required', 'in:cash,card,mobile_money,wave,orange_money'],
            'transaction_id' => ['nullable', 'string'],
        ]);

        $payment = $this->paymentService->recordPayment(
            $order,
            $request->method,
            $request->transaction_id
        );

        return response()->json([
            'message' => 'Paiement enregistré.',
            'payment' => $payment,
        ]);
    }

    public function activeOrders(Request $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;

        $orders = Order::where('restaurant_id', $restaurantId)
            ->active()
            ->with(['items.product', 'table'])
            ->latest()
            ->get();

        return response()->json(OrderResource::collection($orders));
    }

    /**
     * POST /api/cashier/orders
     * Staff creates an order (dine-in, takeaway, delivery) without QR token.
     */
    public function createOrder(Request $request): JsonResponse
    {
        $restaurant = $request->user()->restaurant;

        $validated = $request->validate([
            'type'               => ['required', 'in:dine_in,delivery,takeaway'],
            'table_id'           => ['nullable', 'integer'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'   => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.notes'      => ['nullable', 'string', 'max:200'],
            'customer_name'      => ['nullable', 'string', 'max:100'],
            'customer_phone'     => ['nullable', 'string', 'max:30'],
            'delivery_address'   => ['required_if:type,delivery', 'nullable', 'string', 'max:300'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ]);

        $table = null;
        if ($validated['type'] === 'dine_in' && !empty($validated['table_id'])) {
            $table = Table::where('id', $validated['table_id'])
                ->where('restaurant_id', $restaurant->id)
                ->firstOrFail();
        }

        $order = $this->orderService->createOrder($restaurant, $validated, $table);

        return response()->json(new OrderResource($order), 201);
    }
}
