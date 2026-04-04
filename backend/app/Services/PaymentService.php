<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    /**
     * Record a cash/manual payment and mark order as paid.
     */
    public function recordPayment(Order $order, string $method = 'cash', ?string $transactionId = null): Payment
    {
        return DB::transaction(function () use ($order, $method, $transactionId) {
            $payment = Payment::create([
                'order_id'       => $order->id,
                'restaurant_id'  => $order->restaurant_id,
                'amount'         => $order->total,
                'method'         => $method,
                'status'         => 'paid',
                'transaction_id' => $transactionId,
                'paid_at'        => now(),
            ]);

            app(OrderService::class)->transitionStatus($order, 'paid');

            ActivityLog::record('payment.recorded', $order->restaurant_id, $payment, [
                'method' => $method,
                'amount' => $order->total,
            ]);

            return $payment;
        });
    }
}
