<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Valeur par défaut : prix mensuel = 15000 FCFA
        \Illuminate\Support\Facades\DB::table('platform_settings')->insert([
            ['key' => 'subscription_price',    'value' => '15000',    'created_at' => now(), 'updated_at' => now()],
            ['key' => 'subscription_currency', 'value' => 'FCFA',     'created_at' => now(), 'updated_at' => now()],
            ['key' => 'trial_days',            'value' => '30',       'created_at' => now(), 'updated_at' => now()],
            ['key' => 'platform_name',         'value' => 'RestoQR',  'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};
