<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'restaurant_id', 'plan', 'status', 'amount', 'starts_at', 'expires_at',
    ];

    protected $casts = [
        'starts_at'  => 'datetime',
        'expires_at' => 'datetime',
        'amount'     => 'decimal:2',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function isActive(): bool
    {
        // 'active' = abonnement payé ; 'trial' = période d'essai
        // Dans les deux cas, expires_at null = permanent, sinon doit être futur
        return in_array($this->status, ['active', 'trial']) &&
               ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function isExpired(): bool
    {
        return in_array($this->status, ['expired', 'cancelled']) ||
               ($this->expires_at !== null && $this->expires_at->isPast());
    }

    public function daysUntilExpiry(): ?int
    {
        if ($this->expires_at === null) return null;
        return max(0, (int) now()->diffInDays($this->expires_at, false));
    }
}
