<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Cashier;
use App\Http\Controllers\Client;
use App\Http\Controllers\Kitchen;
use App\Http\Controllers\Platform\PlatformController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

/*
|--------------------------------------------------------------------------
| API Routes — RestoQR
|--------------------------------------------------------------------------
*/

// ── Public: Health ────────────────────────────────────────────────────────────────
Route::get('/health', function () {
    try {
        $db = DB::connection()->getDatabaseName() ? 'ok' : 'error';
    } catch (\Exception $e) {
        $db = 'error';
    }

    try {
        Cache::put('health_check', true, 60);
        $cache = 'ok';
    } catch (\Exception $e) {
        $cache = 'error';
    }

    return response()->json([
        'status'    => ($db === 'ok' && $cache === 'ok') ? 'ok' : 'degraded',
        'timestamp' => now(),
        'version'   => '1.0.0',
        'database'  => $db,
        'cache'     => $cache,
    ]);
});

// ── Public: Auth ──────────────────────────────────────────────────────────────
Route::post('/auth/login',    [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/auth/register', [\App\Http\Controllers\Auth\RegisterController::class, 'register'])->middleware('throttle:5,1');
// Prix public pour la page d'inscription
Route::get('/platform/pricing', [PlatformController::class, 'getSettings']);

// ── Public: Client Menu & Orders ──────────────────────────────────────────────
Route::prefix('menu/{slug}')->group(function () {
    // Delivery/takeaway menu
    Route::get('/',                    [Client\MenuController::class, 'delivery']);
    // QR table menu
    Route::get('/{tableId}',           [Client\MenuController::class, 'show']);
    // Place order from table
    Route::post('/{tableId}/order',    [Client\OrderController::class, 'storeFromTable'])->middleware('throttle:30,1');
});

// Delivery/takeaway order
Route::post('/orders/{slug}', [Client\OrderController::class, 'storeDelivery'])->middleware('throttle:30,1');
// Track order — throttle strict (5/min) pour éviter l'énumération de commandes
Route::get('/orders/{orderNumber}/track', [Client\OrderController::class, 'track'])->middleware('throttle:5,1');

// ── Auth routes — sanctum uniquement (pas de vérif subscription) ──────────────
// Nécessaire pour que logout/me/password fonctionnent même avec abo expiré
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout',    [AuthController::class, 'logout']);
    Route::get('/auth/me',         [AuthController::class, 'me']);
    Route::patch('/auth/password', [AuthController::class, 'changePassword']);
});

// ── Authenticated routes (sanctum + restaurant actif + abo valide) ─────────────
Route::middleware(['auth:sanctum', 'restaurant.active'])->group(function () {

    // ── Platform — lecture (super_admin + platform_viewer) ────────────────
    Route::middleware('role:super_admin,platform_viewer')
        ->prefix('platform')
        ->group(function () {
            Route::get('/stats',       [PlatformController::class, 'stats']);
            Route::get('/restaurants', [PlatformController::class, 'restaurants']);
            Route::get('/settings',    [PlatformController::class, 'getSettings']);
        });

    // ── Platform — écriture (super_admin ONLY) ─────────────────────────
    Route::middleware('role:super_admin')
        ->prefix('platform')
        ->group(function () {
            Route::post('/restaurants',                             [PlatformController::class, 'createRestaurant']);
            Route::patch('/restaurants/{restaurant}/status',        [PlatformController::class, 'toggleStatus']);
            Route::patch('/restaurants/{restaurant}/subscription',  [PlatformController::class, 'updateSubscription']);
            Route::delete('/restaurants/{restaurant}',              [PlatformController::class, 'destroyRestaurant']);
            Route::post('/settings',                                [PlatformController::class, 'updateSettings']);
            // Gestion des platform_viewers
            Route::get('/viewers',         [PlatformController::class, 'listViewers']);
            Route::post('/viewers',        [PlatformController::class, 'createViewer']);
            Route::delete('/viewers/{id}', [PlatformController::class, 'deleteViewer']);
        });

    // ── Kitchen ───────────────────────────────────────────────────────────
    Route::middleware('role:kitchen,admin,super_admin')
        ->prefix('kitchen')
        ->group(function () {
            Route::get('/orders',                                    [Kitchen\KitchenController::class, 'index']);
            Route::patch('/orders/{order}/status',                   [Kitchen\KitchenController::class, 'updateStatus']);
            Route::patch('/orders/{order}/items/{item}/ready',       [Kitchen\KitchenController::class, 'markItemReady']);
        });

    // ── Cashier (cashier + admin) ─────────────────────────────────────────
    Route::middleware('role:cashier,admin,super_admin')
        ->prefix('cashier')
        ->group(function () {
            // Stats
            Route::get('/stats',                              [Admin\DashboardController::class, 'stats']);
            // Shift (caisse)
            Route::get('/shift',                              [Cashier\ShiftController::class, 'current']);
            Route::post('/shift/open',                        [Cashier\ShiftController::class, 'open']);
            Route::post('/shift/close',                       [Cashier\ShiftController::class, 'close']);
            Route::get('/shift/history',                      [Cashier\ShiftController::class, 'history']);
            // Orders
            Route::get('/orders/history',                     [Admin\SettingsController::class, 'orderHistory']);
            Route::get('/orders',                             [Admin\OrderController::class, 'activeOrders']);
            Route::post('/orders',                            [Admin\OrderController::class, 'createOrder']);
            Route::patch('/orders/{order}/status',            [Admin\OrderController::class, 'updateStatus']);
            Route::post('/orders/{order}/payment',            [Admin\OrderController::class, 'processPayment']);
            // Resources for order creation
            Route::get('/tables',                             [Admin\TableController::class, 'index']);
            Route::get('/categories',                         [Admin\MenuController::class, 'categories']);
            Route::get('/products',                           [Admin\MenuController::class, 'products']);
        });

    // ── Admin ──────────────────────────────────────────────────────────────
    Route::middleware('role:admin,super_admin')
        ->prefix('admin')
        ->group(function () {

            // Dashboard
            Route::get('/stats', [Admin\DashboardController::class, 'stats']);

            // Settings
            Route::get('/settings',   [Admin\SettingsController::class, 'show']);
            Route::post('/settings',  [Admin\SettingsController::class, 'update']); // POST for multipart/form-data (logo)

            // Orders
            Route::get('/orders/history',          [Admin\SettingsController::class, 'orderHistory']);
            Route::get('/orders',                  [Admin\OrderController::class, 'index']);
            Route::get('/orders/{order}',           [Admin\OrderController::class, 'show']);
            Route::patch('/orders/{order}/status',  [Admin\OrderController::class, 'updateStatus']);
            Route::post('/orders/{order}/payment',  [Admin\OrderController::class, 'processPayment']);

            // Tables
            Route::get('/tables',                        [Admin\TableController::class, 'index']);
            Route::post('/tables',                       [Admin\TableController::class, 'store']);
            Route::put('/tables/{table}',                [Admin\TableController::class, 'update']);
            Route::delete('/tables/{table}',             [Admin\TableController::class, 'destroy']);
            Route::post('/tables/{table}/regenerate-qr', [Admin\TableController::class, 'regenerateQr']);

            // Menu — Categories
            Route::get('/categories',           [Admin\MenuController::class, 'categories']);
            Route::post('/categories',           [Admin\MenuController::class, 'storeCategory']);
            Route::put('/categories/{category}', [Admin\MenuController::class, 'updateCategory']);
            Route::delete('/categories/{category}', [Admin\MenuController::class, 'destroyCategory']);

            // Menu — Products
            Route::get('/products',              [Admin\MenuController::class, 'products']);
            Route::post('/products',             [Admin\MenuController::class, 'storeProduct']);
            Route::post('/products/{product}',   [Admin\MenuController::class, 'updateProduct']); // POST for file upload
            Route::delete('/products/{product}', [Admin\MenuController::class, 'destroyProduct']);

            // Staff
            Route::get('/staff',           [Admin\StaffController::class, 'index']);
            Route::post('/staff',          [Admin\StaffController::class, 'store']);
            Route::patch('/staff/{user}',  [Admin\StaffController::class, 'update']);
            Route::delete('/staff/{user}', [Admin\StaffController::class, 'destroy']);
        });
});
