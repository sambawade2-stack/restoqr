<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // orders — composites pour les filtres fréquents
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['restaurant_id', 'status', 'created_at'], 'orders_restaurant_status_date');
            $table->index(['restaurant_id', 'type'],                  'orders_restaurant_type');
            $table->index('order_number',                             'orders_order_number');
        });

        // order_items — FK utilisée dans les JOINs dashboard
        Schema::table('order_items', function (Blueprint $table) {
            $table->index('product_id', 'order_items_product_id_idx');
        });

        // payments — filtre fréquent sur paid_at
        Schema::table('payments', function (Blueprint $table) {
            $table->index(['restaurant_id', 'status', 'paid_at'], 'payments_restaurant_status_date');
        });

        // restaurants — filtre is_active pour platform dashboard
        Schema::table('restaurants', function (Blueprint $table) {
            $table->index(['is_active', 'created_at'], 'restaurants_active_date');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_restaurant_status_date');
            $table->dropIndex('orders_restaurant_type');
            $table->dropIndex('orders_order_number');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex('order_items_product_id_idx');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('payments_restaurant_status_date');
        });

        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropIndex('restaurants_active_date');
        });
    }
};
