<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('number');
            $table->string('name', 50); // "Table 5", "Terrasse", etc.
            $table->unsignedTinyInteger('capacity')->default(4);
            $table->string('qr_token', 64)->unique(); // signed token for QR URL
            $table->string('qr_code_path')->nullable(); // path to generated QR image
            $table->enum('status', ['available', 'occupied', 'reserved'])->default('available');
            $table->timestamps();

            $table->unique(['restaurant_id', 'number']);
            $table->index('restaurant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tables');
    }
};
