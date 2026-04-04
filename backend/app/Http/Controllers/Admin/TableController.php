<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Table\StoreTableRequest;
use App\Http\Resources\TableResource;
use App\Models\Table;
use App\Services\QRCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TableController extends Controller
{
    public function __construct(private readonly QRCodeService $qrCodeService) {}

    public function index(Request $request): JsonResponse
    {
        $tables = Table::where('restaurant_id', $request->user()->restaurant_id)
            ->with('activeOrder.items.product')
            ->orderBy('number')
            ->get();

        return response()->json(TableResource::collection($tables));
    }

    public function store(StoreTableRequest $request): JsonResponse
    {
        $restaurantId = $request->user()->restaurant_id;

        $table = Table::create(array_merge($request->validated(), [
            'restaurant_id' => $restaurantId,
        ]));

        $this->qrCodeService->generate($table);

        return response()->json(new TableResource($table->fresh()), 201);
    }

    public function update(StoreTableRequest $request, Table $table): JsonResponse
    {
        abort_if($table->restaurant_id !== $request->user()->restaurant_id, 403);

        $table->update($request->validated());

        return response()->json(new TableResource($table->fresh('activeOrder.items.product')));
    }

    public function destroy(Request $request, Table $table): JsonResponse
    {
        abort_if($table->restaurant_id !== $request->user()->restaurant_id, 403);

        $table->delete();

        return response()->json(null, 204);
    }

    public function regenerateQr(Request $request, Table $table): JsonResponse
    {
        abort_if($table->restaurant_id !== $request->user()->restaurant_id, 403);

        $table = $this->qrCodeService->regenerateToken($table);

        return response()->json([
            'message'     => 'QR code régénéré.',
            'qr_url'      => $table->qr_url,
            'qr_code_url' => $this->qrCodeService->url($table),
        ]);
    }
}
