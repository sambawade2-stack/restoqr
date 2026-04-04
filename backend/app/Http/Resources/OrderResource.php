<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'order_number'     => $this->order_number,
            'number'           => (int) substr($this->order_number, strrpos($this->order_number, '-') + 1),
            'type'             => $this->type,
            'status'           => $this->status,
            'status_label'     => $this->status_label,
            'customer_name'    => $this->customer_name,
            'customer_phone'   => $this->customer_phone,
            'delivery_address' => $this->delivery_address,
            'notes'            => $this->notes,
            'subtotal'         => (float) $this->subtotal,
            'tax'              => (float) $this->tax,
            'total'            => (float) $this->total,
            'table'            => $this->whenLoaded('table', fn () => [
                'id'     => $this->table->id,
                'number' => $this->table->number,
                'name'   => $this->table->name,
            ]),
            'items'     => OrderItemResource::collection($this->whenLoaded('items')),
            'payment'   => $this->whenLoaded('payment', fn () => [
                'method' => $this->payment?->method,
                'status' => $this->payment?->status,
                'amount' => (float) ($this->payment?->amount ?? 0),
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
