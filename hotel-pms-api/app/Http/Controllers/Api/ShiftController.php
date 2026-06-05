<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierShift;
use App\Models\FolioPayment;
use Illuminate\Http\Request;

/**
 * Front-desk cashier shift. Collected amounts (cash/card/upi/online) are
 * derived live from real folio_payments; opening/refunds/expenses and the
 * close-out reconciliation are persisted on the cashier_shifts row.
 */
class ShiftController extends Controller
{
    /** Return the open shift (auto-opening one if none), with live mode totals. */
    public function current(Request $request)
    {
        $shift = CashierShift::where('status', 'open')->orderByDesc('id')->first();

        if (! $shift) {
            $last = CashierShift::orderByDesc('id')->first();
            $shift = CashierShift::create([
                'number'    => $last ? $last->number + 1 : 4218,
                'cashier'   => optional($request->user())->name ?: 'Front Desk',
                'startedAt' => now()->format('H:i'),
                'endsAt'    => now()->addHours(8)->format('H:i'),
                'opening'   => $last->physicalCount ?? 2000,
                'refunds'   => 0,
                'expenses'  => 0,
                'status'    => 'open',
            ]);
        }

        return response()->json($this->withTotals($shift));
    }

    /** Close the open shift with the physical count + reconciliation notes. */
    public function close(Request $request)
    {
        $data = $request->validate([
            'physicalCount'   => 'required|integer',
            'variance'        => 'integer',
            'varianceRemarks' => 'nullable|string|max:2000',
            'handoverNotes'   => 'nullable|string|max:2000',
            'refunds'         => 'integer|min:0',
            'expenses'        => 'integer|min:0',
        ]);

        $shift = CashierShift::where('status', 'open')->orderByDesc('id')->firstOrFail();
        $shift->update(array_merge($data, [
            'status'   => 'closed',
            'closedAt' => now()->format('Y-m-d H:i'),
        ]));

        \App\Models\AuditLog::record([
            'module' => 'Cashier', 'action' => 'Shift closed',
            'entity' => "Shift #{$shift->number}",
            'after'  => 'Variance ' . ($shift->variance ?? 0),
            'severity' => abs((int) ($shift->variance ?? 0)) > 100 ? 'warning' : 'info',
        ], $request);

        return response()->json($this->withTotals($shift));
    }

    /** Sum real folio payments into the four cashier buckets. */
    private function withTotals(CashierShift $shift): array
    {
        $buckets = ['cash' => 0, 'card' => 0, 'upi' => 0, 'online' => 0];

        foreach (FolioPayment::all() as $p) {
            $m = strtolower((string) $p->mode);
            if (str_contains($m, 'cash')) {
                $buckets['cash'] += (int) $p->amount;
            } elseif (str_contains($m, 'card')) {
                $buckets['card'] += (int) $p->amount;
            } elseif (str_contains($m, 'upi') || in_array($m, ['phonepe', 'paytm', 'gpay', 'imps'], true)) {
                $buckets['upi'] += (int) $p->amount;
            } else {
                $buckets['online'] += (int) $p->amount;
            }
        }

        return array_merge($shift->toArray(), $buckets);
    }
}
