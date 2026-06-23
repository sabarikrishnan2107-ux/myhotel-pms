<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private array $tables = [
        'account_entries',
        'agent_ledgers',
        'agents',
        'amc_contracts',
        'app_users',
        'audit_logs',
        'audit_runs',
        'banquet_orders',
        'banquet_packages',
        'bar_cocktails',
        'bar_items',
        'bar_pour_costs',
        'bar_purchase_orders',
        'bar_variances',
        'cashier_shifts',
        'channel_rate_maps',
        'channel_sync_logs',
        'channels',
        'competitor_rates',
        'competitors',
        'compliance_licenses',
        'einvoices',
        'email_schedules',
        'enquiries',
        'extra_services',
        'fb_orders',
        'fb_packages',
        'floors',
        'form_c_registrations',
        'found_items',
        'group_bookings',
        'group_rooming',
        'group_services',
        'gst_returns',
        'guest_requests',
        'hall_bookings',
        'hall_packages',
        'holidays',
        'housekeeping_tasks',
        'inventory_items',
        'inventory_purchases',
        'inventory_wastage',
        'kitchen_amenities',
        'linen_items',
        'lost_reports',
        'loyalty_campaigns',
        'loyalty_earning_rules',
        'loyalty_members',
        'loyalty_redemptions',
        'loyalty_rewards',
        'loyalty_settings',
        'loyalty_tiers',
        'loyalty_transactions',
        'maintenance_schedules',
        'maintenance_tickets',
        'menu_items',
        'notif_logs',
        'notif_templates',
        'notification_templates',
        'ota_bookings',
        'payment_methods',
        'pos_tables',
        'pricing_rules',
        'purchase_orders',
        'rate_plans',
        'rate_restrictions',
        'recipes',
        'room_amenities',
        'room_types',
        'seasons',
        'staff',
        'stock_movements',
        'table_reservations',
        'table_waitlist_entries',
        'tds_entries',
        'vendor_bills',
        'vendors',
        'web_rooms',
        'webhooks',
        'whatsapp_templates',
    ];

    public function up(): void
    {
        foreach ($this->tables as $t) {
            if (Schema::hasTable($t) && !Schema::hasColumn($t, 'company_id')) {
                Schema::table($t, fn (Blueprint $b) => $b->unsignedBigInteger('company_id')->nullable()->index());
            }
        }

        $defaultId = DB::table('master_companies')->where('code', 'DEFAULT-HOTEL')->value('id');
        if ($defaultId) {
            foreach ($this->tables as $t) {
                if (Schema::hasTable($t) && Schema::hasColumn($t, 'company_id')) {
                    DB::table($t)->whereNull('company_id')->update(['company_id' => $defaultId]);
                }
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $t) {
            if (Schema::hasTable($t) && Schema::hasColumn($t, 'company_id')) {
                Schema::table($t, fn (Blueprint $b) => $b->dropColumn('company_id'));
            }
        }
    }
};
