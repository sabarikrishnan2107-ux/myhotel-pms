<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Per-agent / corporate financial ledger for the travel-agent & corporate
 * accounts. Each agent's rows are kept in date order and carry a running
 * balance (debit increases, credit decreases) so the closing balance of the
 * last row equals that agent's outstanding. A few agents (ABC Travels,
 * TechCorp FZ-LLC, Emirates Bank, Skyline Tours) close with a non-zero
 * outstanding; Global Oil Co. settles to zero.
 *
 * Agent names mirror the AGENTS mock in luxe-pms (@/lib/mock-data-ext).
 */
class AgentLedgerSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('agent_ledgers')->count() > 0) {
            return;
        }

        // [agentName, date, type, bookingNo, description, debit, credit, mode, reference]
        // Rows are grouped per agent in chronological order; balance is computed
        // as a running total below (debit - credit).
        $entries = [
            // ── ABC Travels (Agent) — closes outstanding ₹18,450 ──────────────
            ['ABC Travels',    '2026-05-02', 'Invoice',     'BK100240', 'Room nights — Iyer group (3N x 2 rooms)',           28400, 0,     null,          'INV-2426-001'],
            ['ABC Travels',    '2026-05-10', 'Payment',     null,       'NEFT receipt against INV-2426-001',                 0,     15000, 'NEFT',        'RCP-2026-1122'],
            ['ABC Travels',    '2026-05-18', 'Invoice',     'BK100251', 'Room nights — Mehta family (2N x 1 room)',           18500, 0,     null,          'INV-2426-008'],
            ['ABC Travels',    '2026-05-24', 'Credit Note', 'BK100251', 'Late-checkout waiver — goodwill adjustment',        0,     1450,  null,          'CN-2426-003'],
            ['ABC Travels',    '2026-05-30', 'Payment',     null,       'UPI part-settlement',                               0,     12000, 'UPI',         'RCP-2026-1245'],

            // ── Pearl Holidays (Agent) — closes outstanding ₹4,250 ────────────
            ['Pearl Holidays', '2026-05-05', 'Invoice',     'BK100262', 'Honeymoon package — Sharma',                        14250, 0,     null,          'INV-2426-014'],
            ['Pearl Holidays', '2026-05-16', 'Payment',     null,       'Cheque deposited — clears T+2',                     0,     10000, 'Cheque',      'CHQ-552108'],

            // ── Skyline Tours (Agent) — closes outstanding ₹6,250 ─────────────
            ['Skyline Tours',  '2026-05-03', 'Invoice',     'BK100271', 'Group tour block — Pereira (deluxe x4)',            22000, 0,     null,          'INV-2426-019'],
            ['Skyline Tours',  '2026-05-14', 'Payment',     null,       'Bank transfer — partial',                           0,     15750, 'NEFT',        'RCP-2026-1301'],

            // ── TechCorp FZ-LLC (Corporate) — closes outstanding ₹28,700 ──────
            ['TechCorp FZ-LLC','2026-05-01', 'Invoice',     'BK100280', 'Corporate stay — Q1 consultants (Net 30)',          42000, 0,     null,          'INV-2426-022'],
            ['TechCorp FZ-LLC','2026-05-12', 'Payment',     null,       'RTGS receipt against INV-2426-022',                 0,     20000, 'RTGS',        'RCP-2026-1330'],
            ['TechCorp FZ-LLC','2026-05-26', 'Invoice',     'BK100291', 'Conference room block — 2-day offsite',             8200,  0,     null,          'INV-2426-031'],
            ['TechCorp FZ-LLC','2026-05-28', 'Adjustment',  null,       'Disputed minibar charge reversed',                  0,     1500,  null,          'ADJ-2426-007'],

            // ── Emirates Bank (Corporate) — closes outstanding ₹12,500 ────────
            ['Emirates Bank',  '2026-05-06', 'Invoice',     'BK100302', 'Vendor delegation stay (Net 30)',                   27500, 0,     null,          'INV-2426-035'],
            ['Emirates Bank',  '2026-05-20', 'Payment',     null,       'Corporate wire — partial settlement',               0,     15000, 'Wire',        'RCP-2026-1402'],

            // ── Global Oil Co. (Corporate) — fully settled, balance 0 ─────────
            ['Global Oil Co.', '2026-05-04', 'Invoice',     'BK100311', 'Procurement crew lodging — May',                    19800, 0,     null,          'INV-2426-040'],
            ['Global Oil Co.', '2026-05-21', 'Payment',     null,       'Full settlement against INV-2426-040',              0,     19800, 'NEFT',        'RCP-2026-1455'],
        ];

        $running = [];
        $now = now();
        $rows = [];

        foreach ($entries as [$agentName, $date, $type, $bookingNo, $description, $debit, $credit, $mode, $reference]) {
            $running[$agentName] = ($running[$agentName] ?? 0) + $debit - $credit;

            DB::table('agent_ledgers')->insert([
                'agentName'   => $agentName,
                'date'        => $date,
                'type'        => $type,
                'bookingNo'   => $bookingNo,
                'description' => $description,
                'debit'       => $debit,
                'credit'      => $credit,
                'balance'     => $running[$agentName],
                'mode'        => $mode,
                'reference'   => $reference,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }
    }
}
