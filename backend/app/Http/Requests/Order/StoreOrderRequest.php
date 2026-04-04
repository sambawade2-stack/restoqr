<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'type'                  => ['required', 'in:dine_in,delivery,takeaway'],
            'items'                 => ['required', 'array', 'min:1'],
            'items.*.product_id'    => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'      => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.notes'         => ['nullable', 'string', 'max:200'],
            'customer_name'         => ['nullable', 'string', 'max:100'],
            'customer_phone'        => ['nullable', 'string', 'max:30'],
            'delivery_address'      => ['required_if:type,delivery', 'nullable', 'string', 'max:300'],
            'notes'                 => ['nullable', 'string', 'max:500'],
        ];
    }
}
