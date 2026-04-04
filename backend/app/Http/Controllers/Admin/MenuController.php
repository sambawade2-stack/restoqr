<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class MenuController extends Controller
{
    // ── Categories ────────────────────────────────────────────────────────────

    public function categories(Request $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;

        $categories = Category::where('restaurant_id', $restaurantId)
            ->withCount('allProducts')
            ->orderBy('sort_order')
            ->get();

        return response()->json($categories);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:300'],
            'sort_order'  => ['integer', 'min:0'],
        ]);

        $category = Category::create(array_merge($data, [
            'restaurant_id' => $request->user()->restaurant_id,
            'is_active'     => true,
        ]));

        $this->flushMenuCache($request->user()->restaurant_id);

        return response()->json($category, 201);
    }

    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        abort_if($category->restaurant_id !== $request->user()->restaurant_id, 403);

        $data = $request->validate([
            'name'        => ['string', 'max:100'],
            'description' => ['nullable', 'string', 'max:300'],
            'is_active'   => ['boolean'],
            'sort_order'  => ['integer', 'min:0'],
        ]);

        $category->update($data);
        $this->flushMenuCache($request->user()->restaurant_id);

        return response()->json($category);
    }

    public function destroyCategory(Request $request, Category $category): JsonResponse
    {
        abort_if($category->restaurant_id !== $request->user()->restaurant_id, 403);
        $category->delete();
        $this->flushMenuCache($request->user()->restaurant_id);

        return response()->json(null, 204);
    }

    // ── Products ──────────────────────────────────────────────────────────────

    public function products(Request $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;

        $products = Product::where('restaurant_id', $restaurantId)
            ->with('category')
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->get();

        return response()->json(ProductResource::collection($products));
    }

    public function storeProduct(StoreProductRequest $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;

        // Validate category belongs to this restaurant
        $category = Category::where('id', $request->category_id)
            ->where('restaurant_id', $restaurantId)
            ->firstOrFail();

        $data = $request->validated();

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')
                ->store("products/{$restaurantId}", 'public');
        }

        $product = Product::create(array_merge($data, ['restaurant_id' => $restaurantId]));

        $this->flushMenuCache($restaurantId);

        return response()->json(new ProductResource($product->load('category')), 201);
    }

    public function updateProduct(StoreProductRequest $request, Product $product): JsonResponse
    {
        abort_if($product->restaurant_id !== $request->user()->restaurant_id, 403);

        $data = $request->validated();

        if ($request->hasFile('image')) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $data['image'] = $request->file('image')
                ->store("products/{$product->restaurant_id}", 'public');
        }

        $product->update($data);
        $this->flushMenuCache($product->restaurant_id);

        return response()->json(new ProductResource($product->fresh('category')));
    }

    public function destroyProduct(Request $request, Product $product): JsonResponse
    {
        abort_if($product->restaurant_id !== $request->user()->restaurant_id, 403);

        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        $product->delete();
        $this->flushMenuCache($product->restaurant_id);

        return response()->json(null, 204);
    }

    private function flushMenuCache(int $restaurantId): void
    {
        Cache::forget("menu:{$restaurantId}");
    }
}
