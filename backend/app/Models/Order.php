<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'restaurant_id', 'table_id', 'order_number', 'type', 'status',
        'customer_name', 'customer_phone', 'delivery_address', 'notes',
        'subtotal', 'tax', 'total',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax'      => 'decimal:2',
        'total'    => 'decimal:2',
    ];

    // ── Status machine ────────────────────────────────────────────────────────

    public const TRANSITIONS = [
        'pending'   => ['accepted', 'cancelled'],
        'accepted'  => ['preparing', 'cancelled'],
        'preparing' => ['ready'],
        'ready'     => ['served'],
        'served'    => ['paid'],
        'paid'      => ['closed'],
        'cancelled' => [],
        'closed'    => [],
    ];

    public const STATUS_LABELS = [
        'pending'   => 'En Attente',
        'accepted'  => 'Acceptée',
        'preparing' => 'En Préparation',
        'ready'     => 'Prête',
        'served'    => 'Servie',
        'paid'      => 'Payée',
        'closed'    => 'Clôturée',
        'cancelled' => 'Annulée',
    ];

    public function canTransitionTo(string $newStatus): bool
    {
        return in_array($newStatus, self::TRANSITIONS[$this->status] ?? []);
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_LABELS[$this->status] ?? $this->status;
    }

    public function isActive(): bool
    {
        return !in_array($this->status, ['paid', 'closed', 'cancelled']);
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function table()
    {
        return $this->belongsTo(Table::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class)->with('product');
    }

    public function payment()
    {
        return $this->hasOne(Payment::class)->latest();
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['paid', 'closed', 'cancelled']);
    }

    public function scopeForKitchen($query)
    {
        return $query->whereIn('status', ['pending', 'accepted', 'preparing', 'ready']);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }
}
