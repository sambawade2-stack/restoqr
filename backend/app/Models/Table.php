<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Table extends Model
{
    use HasFactory;

    protected $fillable = [
        'restaurant_id', 'number', 'name', 'capacity',
        'qr_token', 'qr_code_path', 'status',
    ];

    // ── Boot ──────────────────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Table $table) {
            if (empty($table->qr_token)) {
                $table->qr_token = Str::random(48);
            }
        });
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function activeOrder()
    {
        return $this->hasOne(Order::class)
            ->whereNotIn('status', ['paid', 'closed', 'cancelled'])
            ->latest();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function getQrUrlAttribute(): string
    {
        $slug = $this->restaurant->slug ?? '';
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
        return "{$frontendUrl}/menu/{$slug}/{$this->id}?token={$this->qr_token}";
    }

    public function isTokenValid(string $token): bool
    {
        return hash_equals($this->qr_token, $token);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }
}
