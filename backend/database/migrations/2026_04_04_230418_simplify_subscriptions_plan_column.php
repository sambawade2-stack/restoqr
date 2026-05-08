<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE subscriptions MODIFY COLUMN plan VARCHAR(50) NOT NULL DEFAULT 'standard'");
        DB::statement("UPDATE subscriptions SET plan = 'standard'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE subscriptions MODIFY COLUMN plan ENUM('free','basic','pro') NOT NULL DEFAULT 'free'");
    }
};
