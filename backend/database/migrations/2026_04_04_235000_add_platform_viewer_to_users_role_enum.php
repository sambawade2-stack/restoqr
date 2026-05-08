<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','platform_viewer','admin','cashier','kitchen') NOT NULL DEFAULT 'admin'");
    }

    public function down(): void
    {
        DB::statement("UPDATE users SET role = 'admin' WHERE role = 'platform_viewer'");
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','admin','cashier','kitchen') NOT NULL DEFAULT 'admin'");
    }
};
