<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'quantity'   => $this->quantity,
            'unit_price' => (float) $this->unit_price,
            'total_price'=> (float) $this->total_price,
            'notes'      => $this->notes,
            'is_ready'   => $this->is_ready,
            'product'    => $this->whenLoaded('product', fn () => [
                'id'    => $this->product->id,
                'name'  => $this->product->name,
                'image' => $this->product->image
                    ? storage_url($this->product->image)
                    : null,
            ]),
        ];
    }
}
