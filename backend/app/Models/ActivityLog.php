<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'restaurant_id', 'user_id', 'action', 'model_type', 'model_id', 'data', 'ip_address',
    ];

    protected $casts = [
        'data'       => 'array',
        'created_at' => 'datetime',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public static function record(
        string $action,
        ?int $restaurantId = null,
        ?Model $model = null,
        array $data = []
    ): void {
        static::create([
            'restaurant_id' => $restaurantId,
            'user_id'       => auth()->id(),
            'action'        => $action,
            'model_type'    => $model ? get_class($model) : null,
            'model_id'      => $model?->id,
            'data'          => $data ?: null,
            'ip_address'    => request()->ip(),
        ]);
    }
}
