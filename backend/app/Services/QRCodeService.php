<?php

namespace App\Services;

use App\Models\Table;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class QRCodeService
{
    /**
     * Generate and store QR code image for a table. Returns storage path.
     */
    public function generate(Table $table): string
    {
        $url  = $table->qr_url;
        $path = "qrcodes/restaurant-{$table->restaurant_id}/table-{$table->id}.svg";

        $svg = QrCode::format('svg')
            ->size(400)
            ->margin(2)
            ->errorCorrection('H')
            ->generate($url);

        Storage::disk('public')->put($path, $svg);

        $table->update(['qr_code_path' => $path]);

        return $path;
    }

    /**
     * Return the public URL for a table's QR code.
     */
    public function url(Table $table): ?string
    {
        if (!$table->qr_code_path) {
            return null;
        }

        return storage_url($table->qr_code_path);
    }

    /**
     * Regenerate QR token (invalidates old QR codes).
     */
    public function regenerateToken(Table $table): Table
    {
        $table->update(['qr_token' => \Illuminate\Support\Str::random(48)]);
        $this->generate($table);

        return $table->fresh();
    }
}
