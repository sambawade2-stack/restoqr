<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class AuditLogger
{
    /**
     * Log order creation
     */
    public static function logOrderCreation($order, $user)
    {
        Log::info('Order created', [
            'order_id'      => $order->id,
            'order_number'  => $order->order_number,
            'user_id'       => $user->id,
            'user_name'     => $user->name,
            'restaurant_id' => $user->restaurant_id,
            'total'         => $order->total,
            'type'          => $order->type, // dine_in, delivery, takeaway
            'timestamp'     => now()->toDateTimeString(),
        ]);
    }

    /**
     * Log payment processing
     */
    public static function logPayment($order, $user, $status = 'success')
    {
        Log::info("Order payment {$status}", [
            'order_id'      => $order->id,
            'order_number'  => $order->order_number,
            'user_id'       => $user->id,
            'restaurant_id' => $user->restaurant_id,
            'amount'        => $order->total,
            'status'        => $status,
            'timestamp'     => now()->toDateTimeString(),
        ]);
    }

    /**
     * Log staff creation/modification
     */
    public static function logStaffCreation($staff, $admin, $action = 'created')
    {
        Log::info("Staff {$action}", [
            'staff_id'      => $staff->id,
            'staff_name'    => $staff->name,
            'staff_email'   => $staff->email,
            'staff_role'    => $staff->role,
            'created_by'    => $admin->id,
            'created_by_name' => $admin->name,
            'restaurant_id' => $admin->restaurant_id,
            'action'        => $action,
            'timestamp'     => now()->toDateTimeString(),
        ]);
    }

    /**
     * Log authentication events
     */
    public static function logLogin($user, $success = true)
    {
        $level = $success ? 'info' : 'warning';
        Log::$level('User login attempt', [
            'user_id'       => $user->id,
            'user_email'    => $user->email,
            'user_role'     => $user->role,
            'restaurant_id' => $user->restaurant_id,
            'success'       => $success,
            'ip'            => request()->ip(),
            'user_agent'    => request()->userAgent(),
            'timestamp'     => now()->toDateTimeString(),
        ]);
    }

    /**
     * Log restaurant suspension
     */
    public static function logRestaurantSuspension($restaurant, $admin, $suspended)
    {
        Log::warning('Restaurant suspension status changed', [
            'restaurant_id'   => $restaurant->id,
            'restaurant_name' => $restaurant->name,
            'suspended'       => $suspended,
            'changed_by'      => $admin->id,
            'changed_by_name' => $admin->name,
            'timestamp'       => now()->toDateTimeString(),
        ]);
    }

    /**
     * Log API errors
     */
    public static function logError($message, $exception, $context = [])
    {
        Log::error($message, array_merge([
            'exception'   => get_class($exception),
            'message'     => $exception->getMessage(),
            'file'        => $exception->getFile(),
            'line'        => $exception->getLine(),
            'timestamp'   => now()->toDateTimeString(),
        ], $context));
    }
}
