<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ressource publique de suivi commande.
 * N'expose AUCUNE donnée personnelle (phone, adresse, nom client).
 * Utilisée par GET /api/orders/{orderNumber}/track (endpoint public).
 */
class TrackOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'order_number' => $this->order_number,
            'type'         => $this->type,
            'status'       => $this->status,
            'status_label' => $this->status_label,
            'items'        => $this->whenLoaded('items', fn () =>
                $this->items->map(fn ($item) => [
                    'name'     => $item->product?->name,
                    'quantity' => $item->quantity,
                ])
            ),
            'table'      => $this->whenLoaded('table', fn () => [
                'name' => $this->table?->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
