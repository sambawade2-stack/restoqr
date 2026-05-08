<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Restaurant;
use App\Models\Table;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    /**
     * Create a new order from client (QR scan or delivery/takeaway).
     */
    public function createOrder(Restaurant $restaurant, array $data, ?Table $table = null): Order
    {
        return DB::transaction(function () use ($restaurant, $data, $table) {
            $items = $this->validateAndPrepareItems($restaurant, $data['items']);

            $subtotal = collect($items)->sum('total_price');
            $tax      = 0; // Configurable per restaurant
            $total    = $subtotal + $tax;

            $order = Order::create([
                'restaurant_id'    => $restaurant->id,
                'table_id'         => $table?->id,
                'order_number'     => $this->generateOrderNumber($restaurant->id),
                'type'             => $table ? 'dine_in' : ($data['type'] ?? 'delivery'),
                'status'           => 'pending',
                'customer_name'    => $data['customer_name'] ?? null,
                'customer_phone'   => $data['customer_phone'] ?? null,
                'delivery_address' => $data['delivery_address'] ?? null,
                'notes'            => $data['notes'] ?? null,
                'subtotal'         => $subtotal,
                'tax'              => $tax,
                'total'            => $total,
            ]);

            foreach ($items as $item) {
                $order->items()->create($item);
            }

            // Mark table as occupied for dine-in
            if ($table) {
                $table->update(['status' => 'occupied']);
            }

            ActivityLog::record('order.created', $restaurant->id, $order);

            return $order->load('items.product', 'table');
        });
    }

    /**
     * Transition order to a new status. Uses state machine defined in Order model.
     */
    public function transitionStatus(Order $order, string $newStatus): Order
    {
        if (!$order->canTransitionTo($newStatus)) {
            throw ValidationException::withMessages([
                'status' => "Transition de '{$order->status}' vers '{$newStatus}' non autorisée.",
            ]);
        }

        DB::transaction(function () use ($order, $newStatus) {
            $oldStatus = $order->status;

            $order->update(['status' => $newStatus]);

            // Release table when order is paid or closed
            if (in_array($newStatus, ['paid', 'closed', 'cancelled']) && $order->table_id) {
                $order->table->update(['status' => 'available']);
            }

            ActivityLog::record('order.status_changed', $order->restaurant_id, $order, [
                'from' => $oldStatus,
                'to'   => $newStatus,
            ]);
        });

        return $order->fresh('items.product', 'table', 'payment');
    }

    /**
     * Generate unique order number: ORD-{shortHash}-{YYYYMMDD}-{seq}
     * Le hash est dérivé de restaurant_id mais n'est pas réversible.
     */
    private function generateOrderNumber(int $restaurantId): string
    {
        $date      = now()->format('Ymd');
        $shortHash = strtoupper(substr(hash('sha256', 'resto-' . $restaurantId), 0, 4));
        $count     = Order::where('restaurant_id', $restaurantId)
            ->whereDate('created_at', today())
            ->count() + 1;

        return sprintf('ORD-%s-%s-%04d', $shortHash, $date, $count);
    }

    /**
     * Validate cart items against DB prices and availability.
     */
    private function validateAndPrepareItems(Restaurant $restaurant, array $cartItems): array
    {
        $productIds = collect($cartItems)->pluck('product_id');
        $products   = Product::where('restaurant_id', $restaurant->id)
            ->whereIn('id', $productIds)
            ->available()
            ->get()
            ->keyBy('id');

        $prepared = [];

        foreach ($cartItems as $item) {
            $product = $products->get($item['product_id']);

            if (!$product) {
                throw ValidationException::withMessages([
                    'items' => "Produit ID {$item['product_id']} indisponible ou introuvable.",
                ]);
            }

            $qty = (int) $item['quantity'];

            $prepared[] = [
                'product_id'  => $product->id,
                'quantity'    => $qty,
                'unit_price'  => $product->price,
                'total_price' => $product->price * $qty,
                'notes'       => $item['notes'] ?? null,
            ];
        }

        return $prepared;
    }
}
