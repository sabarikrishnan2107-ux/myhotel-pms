<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\InvoiceMail;
use App\Models\AuditLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * Renders the tax-invoice PDF (dompdf) from the invoice data the checkout page
 * sends, then emails it as an attachment through the configured mail account.
 */
class InvoiceMailController extends Controller
{
    public function send(Request $request)
    {
        $data = $request->validate([
            'to'           => 'required|email',
            'invoiceNo'    => 'required|string|max:64',
            'hotel'        => 'nullable|string|max:255',
            'guestName'    => 'nullable|string|max:255',
            'date'         => 'nullable|string|max:64',
            'paymentMode'  => 'nullable|string|max:64',
            'items'        => 'nullable|array|max:200',
            'items.*.label'  => 'required_with:items|string|max:255',
            'items.*.amount' => 'required_with:items|numeric',
            'subtotal'     => 'nullable|numeric',
            'tax'          => 'nullable|numeric',
            'discount'     => 'nullable|numeric',
            'grandTotal'   => 'required|numeric',
            'paid'         => 'nullable|numeric',
            'balance'      => 'nullable|numeric',
        ]);

        $pdf = Pdf::loadView('pdf.invoice', ['d' => $data])->output();

        Mail::to($data['to'])->send(new InvoiceMail($data, $pdf));

        AuditLog::record([
            'module' => 'Notifications',
            'action' => 'Email sent',
            'entity' => 'Invoice ' . $data['invoiceNo'] . ' → ' . $data['to'],
            'after'  => 'Tax invoice PDF emailed',
        ], $request);

        return response()->json(['sent' => true, 'to' => $data['to']]);
    }
}
