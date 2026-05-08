<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function rules(): array
    {
        $restaurantId = $this->user()->restaurant_id;

        return [
            'category_id'  => ['required', Rule::exists('categories', 'id')->where('restaurant_id', $restaurantId)],
            'name'         => ['required', 'string', 'max:150'],
            'description'  => ['nullable', 'string', 'max:500'],
            'price'        => ['required', 'numeric', 'min:0'],
            // 'image' seul accepte SVG (XSS possible) — forcer JPEG/PNG/WebP uniquement
            'image'        => ['nullable', 'file', 'max:2048', 'mimes:jpeg,jpg,png,webp,gif'],
            'is_available' => ['boolean'],
            'is_featured'  => ['boolean'],
            'sort_order'   => ['integer', 'min:0'],
        ];
    }
}
