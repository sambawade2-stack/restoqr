<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TableResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'number'       => $this->number,
            'name'         => $this->name,
            'capacity'     => $this->capacity,
            'status'       => $this->status,
            'qr_url'       => $this->qr_url,
            'qr_code_url'  => $this->qr_code_path
                ? asset('storage/' . $this->qr_code_path)
                : null,
            'active_order' => $this->whenLoaded('activeOrder', fn () =>
                $this->activeOrder
                    ? new OrderResource($this->activeOrder)
                    : null
            ),
        ];
    }
}
