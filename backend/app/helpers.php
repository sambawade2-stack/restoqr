<?php

use Illuminate\Support\Str;

if (!function_exists('storage_url')) {
    /**
     * Build a relative public URL for a file stored on the "public" disk.
     *
     * Returns a domain-relative path (e.g. "/storage/logos/x.png") so the
     * frontend works behind any domain/proxy without depending on APP_URL.
     *
     * @param  string|null  $path  Path relative to storage/app/public
     * @return string|null         Relative URL, or null if no path given
     */
    function storage_url(?string $path): ?string
    {
        if (empty($path)) {
            return null;
        }

        // Already an absolute or root-relative URL — leave it untouched.
        if (Str::startsWith($path, ['http://', 'https://', '/'])) {
            return $path;
        }

        return '/storage/' . ltrim($path, '/');
    }
}
