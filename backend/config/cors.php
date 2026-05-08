<?php

/**
 * CORS — Configuration selon l'environnement.
 *
 * En développement (APP_ENV=local) : autoriser localhost + réseau LAN.
 * En production (APP_ENV=production) : only FRONTEND_URL (domaine Dokploy).
 */

$env         = env('APP_ENV', 'production');
$frontendUrl = rtrim(env('FRONTEND_URL', ''), '/');

if ($env === 'local' || $env === 'development') {
    // Développement — localhost + LAN (192.168.x.x)
    $allowedOrigins         = [];
    $allowedOriginsPatterns = [
        '#^https?://localhost(:\d+)?$#',
        '#^https?://127\.0\.0\.1(:\d+)?$#',
        '#^https?://192\.168\.\d+\.\d+(:\d+)?$#',
    ];
} elseif ($frontendUrl) {
    // Production — uniquement le domaine frontend configuré
    $allowedOrigins         = [$frontendUrl];
    $allowedOriginsPatterns = [];
} else {
    // Fallback sécurisé : aucune origine autorisée (forcer la config)
    $allowedOrigins         = [];
    $allowedOriginsPatterns = [];
}

return [
    'paths'                    => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods'          => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins'          => $allowedOrigins,
    'allowed_origins_patterns' => $allowedOriginsPatterns,
    'allowed_headers'          => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-QR-Token', 'Accept'],
    'exposed_headers'          => [],
    'max_age'                  => 86400,
    'supports_credentials'     => true,
];
