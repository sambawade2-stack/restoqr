<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'description'  => $this->description,
            'price'        => (float) $this->price,
            'image'        => $this->image ? asset('storage/' . $this->image) : null,
            'is_available' => $this->is_available,
            'is_featured'  => $this->is_featured,
            'category_id'  => $this->category_id,
            'sort_order'   => $this->sort_order,
        ];
    }
}
