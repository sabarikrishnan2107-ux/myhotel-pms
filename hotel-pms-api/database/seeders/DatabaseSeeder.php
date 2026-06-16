<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            PropertySettingSeeder::class,
            SetupDataSeeder::class,
            RoomTypeSeeder::class,
            GuestBookingSeeder::class,
            FolioSeeder::class,
            FolioAdjustmentSeeder::class,
            ErpSeeder::class,
            FbMenuSeeder::class,
            FbOrderSeeder::class,
            OpsSeeder::class,
            LostReportSeeder::class,
            LinenSeeder::class,
            LoyaltySeeder::class,
            LoyaltyConfigSeeder::class,
            AccountSeeder::class,
            AppUserRosterSeeder::class,
            HallBookingSeeder::class,
            GroupBookingSeeder::class,
            GroupRoomingSeeder::class,
            ComplianceLicenseSeeder::class,
            FormCSeeder::class,
            ChannelSeeder::class,
            WebRoomSeeder::class,
            PricingRuleSeeder::class,
            CompetitorSeeder::class,
            MealPlanSeeder::class,
            AuditLogSeeder::class,
            OwnerFlashSeeder::class,
            BanquetOrderSeeder::class,
            TableReservationSeeder::class,
            TableWaitlistEntrySeeder::class,
            MaintenanceScheduleSeeder::class,
            AmcContractSeeder::class,
            PosTableSeeder::class,
            RecipeSeeder::class,
            BarItemSeeder::class,
            BarPourCostSeeder::class,
            BarVarianceSeeder::class,
            BarPurchaseOrderSeeder::class,
            BarCocktailSeeder::class,
            LoyaltyRedemptionSeeder::class,
            LoyaltyTransactionSeeder::class,
            LoyaltyEarningRuleSeeder::class,
            LoyaltySettingSeeder::class,
            InventoryPurchaseSeeder::class,
            StockMovementSeeder::class,
            PurchaseOrderSeeder::class,
            InventoryWastageSeeder::class,
            OtaBookingSeeder::class,
            ChannelRateMapSeeder::class,
            ChannelSyncLogSeeder::class,
            GstReturnSeeder::class,
            TdsEntrySeeder::class,
            AuditRunSeeder::class,
            WhatsappTemplateSeeder::class,
            AgentLedgerSeeder::class,
            WebhookSeeder::class,
            EmailScheduleSeeder::class,
            RateRestrictionSeeder::class,
            NotificationContentSeeder::class,
            KitchenAmenitySeeder::class,
            RoomAmenitySeeder::class,
        ]);
    }
}
