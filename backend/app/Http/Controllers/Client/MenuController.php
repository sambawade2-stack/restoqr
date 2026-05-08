<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Restaurant;
use App\Models\Table;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MenuController extends Controller
{
    /**
     * GET /api/menu/{restaurantSlug}/{tableId}
     * Public endpoint — validates QR token, returns menu.
     */
    public function show(Request $request, string $slug, int $tableId): JsonResponse
    {
        $restaurant = Restaurant::where('slug', $slug)->where('is_active', true)->firstOrFail();

        // Validate QR token to prevent table spoofing
        $table = Table::where('id', $tableId)
            ->where('restaurant_id', $restaurant->id)
            ->firstOrFail();

        // Accepte le token via header (privilégié) ou query param (rétrocompat QR codes existants)
        $token = $request->header('X-QR-Token') ?? $request->query('token', '');

        if (!$table->isTokenValid($token)) {
            return response()->json(['message' => 'QR code invalide ou expiré.'], 403);
        }

        // Cache menu for 5 minutes per restaurant
        $menu = Cache::remember("menu:{$restaurant->id}", 300, function () use ($restaurant) {
            return Category::where('restaurant_id', $restaurant->id)
                ->active()
                ->with(['products' => fn ($q) => $q->available()->orderBy('sort_order')])
                ->orderBy('sort_order')
                ->get()
                ->map(fn (Category $cat) => [
                    'id'          => $cat->id,
                    'name'        => $cat->name,
                    'description' => $cat->description,
                    'image'       => $cat->image ? asset('storage/' . $cat->image) : null,
                    'products'    => ProductResource::collection($cat->products),
                ]);
        });

        return response()->json([
            'restaurant' => [
                'name'     => $restaurant->name,
                'logo'     => $restaurant->logo ? asset('storage/' . $restaurant->logo) : null,
                'currency' => $restaurant->currency,
            ],
            'table' => [
                'id'     => $table->id,
                'number' => $table->number,
                'name'   => $table->name,
            ],
            'categories' => $menu,
        ])->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }

    /**
     * GET /api/menu/{restaurantSlug}
     * Public delivery/takeaway menu (no table verification needed).
     */
    public function delivery(string $slug): JsonResponse
    {
        $restaurant = Restaurant::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $menu = Cache::remember("menu:{$restaurant->id}", 300, function () use ($restaurant) {
            return Category::where('restaurant_id', $restaurant->id)
                ->active()
                ->with(['products' => fn ($q) => $q->available()->orderBy('sort_order')])
                ->orderBy('sort_order')
                ->get()
                ->map(fn (Category $cat) => [
                    'id'       => $cat->id,
                    'name'     => $cat->name,
                    'image'    => $cat->image ? asset('storage/' . $cat->image) : null,
                    'products' => ProductResource::collection($cat->products),
                ]);
        });

        return response()->json([
            'restaurant' => [
                'name'     => $restaurant->name,
                'logo'     => $restaurant->logo ? asset('storage/' . $restaurant->logo) : null,
                'currency' => $restaurant->currency,
            ],
            'categories' => $menu,
        ]);
    }
}
