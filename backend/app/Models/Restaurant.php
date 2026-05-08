<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Restaurant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'email', 'phone', 'address',
        'logo', 'currency', 'timezone', 'is_active', 'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings'  => 'array',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function tables()
    {
        return $this->hasMany(Table::class);
    }

    public function categories()
    {
        return $this->hasMany(Category::class)->orderBy('sort_order');
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    // ── Business day helpers ──────────────────────────────────────────────────

    /**
     * Retourne [start, end] de la journée métier en cours.
     * Par défaut la journée commence à 3h du matin (shift_start_hour = 3).
     * Exemple : si maintenant = 01h30, on est encore dans la journée d'hier.
     */
    public function businessDayBounds(): array
    {
        $cutoff = (int) ($this->settings['shift_start_hour'] ?? 3);
        $tz     = $this->timezone ?: 'Africa/Dakar';
        $now    = now($tz);

        if ($now->hour < $cutoff) {
            // Avant la coupure → journée précédente
            $start = $now->copy()->subDay()->setTime($cutoff, 0, 0);
        } else {
            $start = $now->copy()->setTime($cutoff, 0, 0);
        }

        $end = $start->copy()->addDay();

        return [$start, $end];
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public function getOrderQrUrlAttribute(): string
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
        return "{$frontendUrl}/order/{$this->slug}";
    }
}
