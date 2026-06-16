<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EInvoice;
use Illuminate\Http\Request;

/**
 * e-Invoice generation. NOTE: the IRN/ACK are generated LOCALLY (deterministic
 * hash of the invoice payload) — they are NOT issued by the government NIC
 * e-Invoice portal. This is the integration swap-in point for a real GST
 * Suvidha Provider (GSP): replace the generate() body with a GSP API call.
 */
class EInvoiceController extends Controller
{
    public function generate(Request $request, string $bookingNo)
    {
        $data = $request->validate([
            'taxableValue'   => 'nullable|integer',
            'cgst'           => 'nullable|integer',
            'sgst'           => 'nullable|integer',
            'igst'           => 'nullable|integer',
            'placeOfSupply'  => 'nullable|string|max:100',
            'recipientGstin' => 'nullable|string|max:50',
            'reverseCharge'  => 'nullable|boolean',
        ]);

        $payload = [
            'bookingNo'    => $bookingNo,
            'taxableValue' => $data['taxableValue'] ?? 0,
            'cgst'         => $data['cgst'] ?? 0,
            'sgst'         => $data['sgst'] ?? 0,
            'igst'         => $data['igst'] ?? 0,
            'generatedAt'  => now()->toIso8601String(),
        ];

        // Locally-generated IRN: 64-char SHA-256 of the payload (mirrors the real
        // IRN's shape so the UI/DB are ready for a genuine GSP value later).
        $irn = hash('sha256', json_encode($payload));
        $ackNo = (string) (110000000000000 + (crc32($bookingNo) % 9000000000000));

        $row = EInvoice::updateOrCreate(
            ['bookingNo' => $bookingNo],
            [
                'irn'            => $irn,
                'ackNo'          => $ackNo,
                'ackDate'        => now()->format('d M Y, H:i'),
                'status'         => 'generated',
                'placeOfSupply'  => $data['placeOfSupply'] ?? null,
                'recipientGstin' => $data['recipientGstin'] ?? null,
                'reverseCharge'  => $data['reverseCharge'] ?? false,
                'signedJson'     => $payload,
            ],
        );

        return response()->json($row);
    }
}
