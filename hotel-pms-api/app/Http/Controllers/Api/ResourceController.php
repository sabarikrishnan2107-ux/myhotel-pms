<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountEntry;
use App\Models\Agent;
use App\Models\AuditLog;
use App\Models\AppUser;
use App\Models\Booking;
use App\Models\Channel;
use App\Models\BanquetPackage;
use App\Models\Competitor;
use App\Models\CompetitorRate;
use App\Models\ExtraService;
use App\Models\ComplianceLicense;
use App\Models\EInvoice;
use App\Models\EmailSchedule;
use App\Models\Enquiry;
use App\Models\FbPackage;
use App\Models\Floor;
use App\Models\FolioAdjustment;
use App\Models\FolioCharge;
use App\Models\FolioPayment;
use App\Models\FbOrder;
use App\Models\FormCRegistration;
use App\Models\FoundItem;
use App\Models\GroupBooking;
use App\Models\GuestRequest;
use App\Models\HousekeepingTask;
use App\Models\GroupRooming;
use App\Models\GstSlab;
use App\Models\HallBooking;
use App\Models\MaintenanceTicket;
use App\Models\MealPlan;
use App\Models\Guest;
use App\Models\HallPackage;
use App\Models\Holiday;
use App\Models\InventoryItem;
use App\Models\LinenItem;
use App\Models\LostReport;
use App\Models\LoyaltyCampaign;
use App\Models\LoyaltyMember;
use App\Models\LoyaltyReward;
use App\Models\LoyaltyTier;
use App\Models\MenuItem;
use App\Models\NotificationTemplate;
use App\Models\PaymentMethod;
use App\Models\PricingRule;
use App\Models\RatePlan;
use App\Models\Role;
use App\Models\Room;
use App\Models\RoomType;
use App\Models\Season;
use App\Models\Staff;
use App\Models\Vendor;
use App\Models\VendorBill;
use App\Models\Webhook;
use App\Models\WebRoom;
use App\Models\BanquetOrder;
use App\Models\TableReservation;
use App\Models\TableWaitlistEntry;
use App\Models\MaintenanceSchedule;
use App\Models\AmcContract;
use App\Models\PosTable;
use App\Models\Recipe;
use App\Models\BarItem;
use App\Models\BarPourCost;
use App\Models\BarVariance;
use App\Models\BarPurchaseOrder;
use App\Models\BarCocktail;
use App\Models\LoyaltyRedemption;
use App\Models\LoyaltyTransaction;
use App\Models\LoyaltyEarningRule;
use App\Models\LoyaltySetting;
use App\Models\InventoryPurchase;
use App\Models\StockMovement;
use App\Models\PurchaseOrder;
use App\Models\InventoryWastage;
use App\Models\OtaBooking;
use App\Models\ChannelRateMap;
use App\Models\ChannelSyncLog;
use App\Models\GstReturn;
use App\Models\TdsEntry;
use App\Models\AuditRun;
use App\Models\WhatsappTemplate;
use App\Models\AgentLedger;
use App\Models\RateRestriction;
use App\Models\NotifTemplate;
use App\Models\NotifLog;
use App\Models\KitchenAmenity;
use App\Models\RoomAmenity;
use App\Models\GroupService;
use App\Models\CashierShift;
use App\Models\ServiceItem;
use Illuminate\Http\Request;

/**
 * Generic list CRUD for every Setup & Settings list section.
 * Each resource maps to an Eloquent model; the URL slug is the key.
 */
class ResourceController extends Controller
{
    private const MODELS = [
        'floors'                 => Floor::class,
        'rooms'                  => Room::class,
        'room-types'             => RoomType::class,
        'rate-plans'             => RatePlan::class,
        'seasons'                => Season::class,
        'holidays'               => Holiday::class,
        'fb-packages'            => FbPackage::class,
        'hall-packages'          => HallPackage::class,
        'agents'                 => Agent::class,
        'gst-slabs'              => GstSlab::class,
        'payment-methods'        => PaymentMethod::class,
        'notification-templates' => NotificationTemplate::class,
        'roles'                  => Role::class,
        'webhooks'               => Webhook::class,
        'guests'                 => Guest::class,
        'bookings'               => Booking::class,
        'folio-charges'          => FolioCharge::class,
        'folio-payments'         => FolioPayment::class,
        'folio-adjustments'      => FolioAdjustment::class,
        'einvoices'              => EInvoice::class,
        'competitors'            => Competitor::class,
        'competitor-rates'       => CompetitorRate::class,
        'meal-plans'             => MealPlan::class,
        'banquet-packages'       => BanquetPackage::class,
        'extra-services'         => ExtraService::class,
        'staff'                  => Staff::class,
        'vendors'                => Vendor::class,
        'inventory-items'        => InventoryItem::class,
        'menu-items'             => MenuItem::class,
        'fb-orders'              => FbOrder::class,
        'maintenance-tickets'    => MaintenanceTicket::class,
        'guest-requests'         => GuestRequest::class,
        'housekeeping-tasks'     => HousekeepingTask::class,
        'enquiries'              => Enquiry::class,
        'found-items'            => FoundItem::class,
        'loyalty-members'        => LoyaltyMember::class,
        'loyalty-tiers'          => LoyaltyTier::class,
        'loyalty-rewards'        => LoyaltyReward::class,
        'loyalty-campaigns'      => LoyaltyCampaign::class,
        'account-entries'        => AccountEntry::class,
        'app-users'              => AppUser::class,
        'hall-bookings'          => HallBooking::class,
        'group-bookings'         => GroupBooking::class,
        'group-rooming'          => GroupRooming::class,
        'compliance-licenses'    => ComplianceLicense::class,
        'form-c-registrations'   => FormCRegistration::class,
        'channels'               => Channel::class,
        'web-rooms'              => WebRoom::class,
        'pricing-rules'          => PricingRule::class,
        'email-schedules'        => EmailSchedule::class,
        'linen-items'            => LinenItem::class,
        'lost-reports'           => LostReport::class,
        'banquet-orders'         => BanquetOrder::class,
        'table-reservations'     => TableReservation::class,
        'table-waitlist'         => TableWaitlistEntry::class,
        'maintenance-schedules'  => MaintenanceSchedule::class,
        'amc-contracts'          => AmcContract::class,
        'pos-tables'             => PosTable::class,
        'recipes'                => Recipe::class,
        'bar-items'              => BarItem::class,
        'bar-pour-costs'         => BarPourCost::class,
        'bar-variances'          => BarVariance::class,
        'bar-purchase-orders'    => BarPurchaseOrder::class,
        'bar-cocktails'          => BarCocktail::class,
        'loyalty-redemptions'    => LoyaltyRedemption::class,
        'loyalty-transactions'   => LoyaltyTransaction::class,
        'loyalty-earning-rules'  => LoyaltyEarningRule::class,
        'loyalty-settings'       => LoyaltySetting::class,
        'inventory-purchases'    => InventoryPurchase::class,
        'stock-movements'        => StockMovement::class,
        'purchase-orders'        => PurchaseOrder::class,
        'inventory-wastage'      => InventoryWastage::class,
        'ota-bookings'           => OtaBooking::class,
        'channel-rate-maps'      => ChannelRateMap::class,
        'channel-sync-logs'      => ChannelSyncLog::class,
        'gst-returns'            => GstReturn::class,
        'tds-entries'            => TdsEntry::class,
        'audit-runs'             => AuditRun::class,
        'whatsapp-templates'     => WhatsappTemplate::class,
        'agent-ledger'           => AgentLedger::class,
        'rate-restrictions'      => RateRestriction::class,
        'notif-templates'        => NotifTemplate::class,
        'notif-logs'             => NotifLog::class,
        'kitchen-amenities'      => KitchenAmenity::class,
        'room-amenities'         => RoomAmenity::class,
        'vendor-bills'           => VendorBill::class,
        'group-services'         => GroupService::class,
        'cashier-shifts'         => CashierShift::class,
        'service-items'          => ServiceItem::class,
    ];

    /**
     * Resources whose index can be scoped by query params.
     * Each value is an array of filterable column names — any present query
     * param matching a listed column is applied as an exact-match WHERE clause.
     */
    private const FILTER_BY = [
        'folio-charges'     => ['bookingNo'],
        'folio-payments'    => ['bookingNo'],
        'folio-adjustments' => ['bookingNo'],
        'einvoices'         => ['bookingNo'],
        'housekeeping-tasks'=> ['assignee', 'status', 'room'],
        'competitor-rates'  => ['competitorId'],
        'group-rooming'     => ['groupCode'],
        'bookings'          => ['status'],
        'fb-orders'         => ['status', 'room'],
        'guest-requests'    => ['status', 'room'],
        'maintenance-tickets' => ['status'],
        'hall-bookings'     => ['status'],
        'service-items'     => ['kind'],
    ];

    /** Resource slugs, for the route constraint. */
    public static function resources(): array
    {
        return array_keys(self::MODELS);
    }

    /**
     * Validation rules per resource. Fields use `sometimes` so partial
     * updates (PATCH-style) work, but required-on-create is enforced below.
     */
    private const RULES = [
        'floors' => [
            'name' => 'string|max:255', 'number' => 'integer', 'amenities' => 'array',
            'smokingAllowed' => 'boolean', 'vipFloor' => 'boolean', 'hasElevator' => 'boolean',
            'housekeepingZone' => 'string|max:255', 'status' => 'string|max:50',
        ],
        'room-types' => [
            'name' => 'string|max:100', 'code' => 'string|max:20|nullable', 'baseTariff' => 'integer|min:0',
            'maxAdults' => 'integer|min:1', 'maxChildren' => 'integer|min:0', 'sizeSqft' => 'integer|min:0|nullable',
            'description' => 'string|max:500|nullable', 'amenities' => 'array', 'active' => 'boolean',
            'extraAdultRate' => 'integer|min:0', 'extraChildRate' => 'integer|min:0',
        ],
        'rooms' => [
            'number' => 'string|max:50', 'category' => 'string|max:50', 'floor' => 'integer',
            'bedConfig' => 'string|max:50', 'maxAdults' => 'integer|min:1', 'maxChildren' => 'integer|min:0',
            'sizeSqft' => 'integer|min:0', 'view' => 'string|max:50', 'baseTariff' => 'integer|min:0',
            'extraBedAllowed' => 'boolean', 'extraBedRate' => 'integer|min:0', 'connectingRoom' => 'string|max:50',
            'extension' => 'string|max:50', 'wifiSsid' => 'string|max:100', 'smoking' => 'boolean',
            'accessible' => 'boolean', 'amenities' => 'array', 'status' => 'string|max:50', 'hkStatus' => 'string|max:50',
            'hkAssignee' => 'string|max:100|nullable', 'hkStartedAt' => 'string|max:50|nullable',
        ],
        'linen-items' => [
            'name' => 'string|max:255', 'issued' => 'integer|min:0', 'returned' => 'integer|min:0',
            'wastage' => 'integer|min:0', 'inUse' => 'integer|min:0',
        ],
        'rate-plans' => [
            'code' => 'string|max:50', 'name' => 'string|max:255', 'inclBreakfast' => 'boolean',
            'inclLunch' => 'boolean', 'inclDinner' => 'boolean', 'discountPct' => 'integer|min:0|max:100',
            'refundable' => 'boolean', 'active' => 'boolean',
            'breakfastPrice' => 'integer|min:0', 'lunchPrice' => 'integer|min:0', 'dinnerPrice' => 'integer|min:0',
        ],
        'seasons' => [
            'name' => 'string|max:255', 'from' => 'string|max:50', 'to' => 'string|max:50',
            'multiplier' => 'numeric|min:0', 'active' => 'boolean',
        ],
        'holidays' => [
            'name' => 'string|max:255', 'date' => 'string|max:50', 'kind' => 'string|max:50',
            'surchargePct' => 'integer|min:0|max:100',
        ],
        'fb-packages' => [
            'name' => 'string|max:255', 'type' => 'string|max:50', 'pax' => 'integer|min:1',
            'price' => 'integer|min:0', 'gst' => 'integer|min:0|max:100', 'active' => 'boolean',
        ],
        'hall-packages' => [
            'name' => 'string|max:255', 'capacity' => 'integer|min:0', 'hourly' => 'integer|min:0',
            'halfDay' => 'integer|min:0', 'fullDay' => 'integer|min:0', 'setupFee' => 'integer|min:0',
            'gst' => 'integer|min:0|max:100', 'extraPaxFee' => 'integer|min:0', 'active' => 'boolean',
        ],
        'agents' => [
            'type' => 'string|max:50', 'name' => 'string|max:255', 'contact' => 'string|max:255|nullable',
            'phone' => 'string|max:50|nullable', 'email' => 'email|max:255|nullable', 'gstin' => 'string|max:50|nullable',
            'creditLimit' => 'integer|min:0', 'commissionPct' => 'integer|min:0|max:100',
            'creditTerms' => 'string|max:50', 'active' => 'boolean',
        ],
        'gst-slabs' => [
            'label' => 'string|max:255', 'from' => 'integer|min:0', 'to' => 'integer|nullable',
            'rate' => 'integer|min:0|max:100',
        ],
        'payment-methods' => [
            'name' => 'string|max:255', 'code' => 'string|max:50', 'type' => 'string|max:50',
            'feePct' => 'numeric|min:0', 'settlement' => 'string|max:255|nullable', 'active' => 'boolean',
        ],
        'notification-templates' => [
            'event' => 'string|max:255', 'channel' => 'string|max:50', 'language' => 'string|max:50',
            'active' => 'boolean',
        ],
        'roles' => [
            'name' => 'string|max:255', 'users' => 'integer|min:0', 'permissions' => 'array', 'active' => 'boolean',
        ],
        'webhooks' => [
            'url' => 'string|max:1000', 'events' => 'string|max:1000|nullable', 'status' => 'string|max:50',
        ],
        'guests' => [
            'name' => 'string|max:255', 'phone' => 'string|max:50|nullable', 'email' => 'email|max:255|nullable',
            'nationality' => 'string|max:100|nullable', 'idType' => 'string|max:50|nullable', 'idNumber' => 'string|max:100|nullable',
            'vip' => 'boolean', 'blacklist' => 'boolean', 'lifetimeNights' => 'integer|min:0', 'lifetimeSpend' => 'integer|min:0',
            'lastStay' => 'string|max:50|nullable', 'address' => 'string|max:500|nullable', 'birthday' => 'string|max:50|nullable',
            'anniversary' => 'string|max:50|nullable', 'preferences' => 'array', 'allergies' => 'string|max:500|nullable',
            'internalNotes' => 'string|max:2000|nullable', 'blacklistReason' => 'string|max:500|nullable', 'loyaltyPoints' => 'integer|min:0',
            'idFront' => 'string|nullable', 'idBack' => 'string|nullable', 'photo' => 'string|nullable', 'signature' => 'string|nullable',
            'gender' => 'string|max:50|nullable', 'company' => 'string|max:255|nullable', 'gst' => 'string|max:50|nullable',
            'kycVerified' => 'boolean', 'kycVerifiedAt' => 'string|max:50|nullable', 'kycVerifiedBy' => 'string|max:255|nullable',
        ],
        'bookings' => [
            'bookingNo' => 'string|max:50', 'guestName' => 'string|max:255', 'roomNumber' => 'string|max:50|nullable',
            'roomType' => 'string|max:50|nullable', 'source' => 'string|max:50', 'checkIn' => 'string|max:50|nullable',
            'checkOut' => 'string|max:50|nullable', 'nights' => 'integer|min:0', 'adults' => 'integer|min:1', 'children' => 'integer|min:0',
            'paymentStatus' => 'string|max:50', 'ratePlan' => 'string|max:50', 'total' => 'integer|min:0',
            'advance' => 'integer|min:0', 'balance' => 'integer', 'vip' => 'boolean', 'status' => 'string|max:50',
            'draftData' => 'array|nullable',
        ],
        'folio-charges' => [
            'bookingNo' => 'string|max:50', 'date' => 'string|max:50', 'description' => 'string|max:500',
            'type' => 'string|max:50', 'qty' => 'integer', 'rate' => 'integer', 'tax' => 'integer',
            'amount' => 'integer', 'paidBy' => 'string|max:50',
        ],
        'folio-payments' => [
            'bookingNo' => 'string|max:50', 'date' => 'string|max:50', 'mode' => 'string|max:100',
            'reference' => 'string|max:255|nullable', 'amount' => 'integer',
        ],
        'folio-adjustments' => [
            'bookingNo' => 'string|max:50', 'date' => 'string|max:50',
            'type' => 'string|max:50', 'description' => 'string|max:500',
            'amount' => 'integer', 'approver' => 'string|max:255',
        ],
        'einvoices' => [
            'bookingNo' => 'string|max:50', 'irn' => 'string|max:64', 'ackNo' => 'string|max:50',
            'ackDate' => 'string|max:50', 'status' => 'string|max:50',
            'placeOfSupply' => 'string|max:100', 'recipientGstin' => 'string|max:50',
            'reverseCharge' => 'boolean',
        ],
        'competitors' => [
            'slug' => 'string|max:50', 'hotel' => 'string|max:255', 'brand' => 'string|max:255', 'km' => 'numeric|min:0',
            'stars' => 'integer|min:1|max:5', 'source' => 'string|max:100', 'active' => 'boolean',
        ],
        'competitor-rates' => [
            'competitorId' => 'string|max:50', 'date' => 'string|max:50',
            'roomType' => 'string|max:50', 'rate' => 'integer|min:0',
        ],
        'meal-plans' => [
            'code' => 'string|max:20', 'name' => 'string|max:255',
            'perPaxPerDay' => 'integer|min:0', 'desc' => 'string|max:500', 'active' => 'boolean',
        ],
        'banquet-packages' => [
            'name' => 'string|max:255', 'desc' => 'string|max:500', 'pricePerPax' => 'integer|min:0',
            'veg' => 'boolean', 'active' => 'boolean',
        ],
        'extra-services' => [
            'label' => 'string|max:255', 'price' => 'integer|min:0', 'active' => 'boolean',
        ],
        'staff' => [
            'name' => 'string|max:255', 'role' => 'string|max:100', 'dept' => 'string|max:100',
            'phone' => 'string|max:50|nullable', 'email' => 'email|max:255|nullable', 'joined' => 'string|max:50',
            'salary' => 'integer|min:0', 'active' => 'boolean',
        ],
        'vendors' => [
            'name' => 'string|max:255', 'contact' => 'string|max:255|nullable', 'phone' => 'string|max:50|nullable',
            'terms' => 'string|max:50', 'outstanding' => 'integer', 'lastInvoice' => 'string|max:50|nullable',
        ],
        'inventory-items' => [
            'name' => 'string|max:255', 'cat' => 'string|max:100', 'vendor' => 'string|max:255|nullable',
            'qty' => 'integer|min:0', 'min' => 'integer|min:0', 'unit' => 'string|max:50',
            'lastPurchase' => 'string|max:50|nullable', 'price' => 'numeric|min:0',
        ],
        'menu-items' => [
            'cat' => 'string|max:100', 'name' => 'string|max:255', 'price' => 'integer|min:0',
            'veg' => 'boolean', 'spice' => 'string|max:50|nullable', 'tag' => 'string|max:100|nullable',
            'photo' => 'string|max:2000|nullable',
        ],
        'fb-orders' => [
            'orderNo' => 'string|max:50', 'tableNo' => 'string|max:50', 'server' => 'string|max:100|nullable',
            'items' => 'array', 'total' => 'integer|min:0', 'status' => 'string|max:50',
            'paymentMethod' => 'string|max:100|nullable', 'room' => 'string|max:50|nullable',
            'instructions' => 'string|max:2000|nullable',
        ],
        'maintenance-tickets' => [
            'code' => 'string|max:50', 'room' => 'string|max:50|nullable', 'title' => 'string|max:255',
            'priority' => 'string|max:50', 'status' => 'string|max:50', 'assignee' => 'string|max:100|nullable',
            'reported' => 'string|max:50', 'category' => 'string|max:100',
        ],
        'guest-requests' => [
            'code' => 'string|max:50', 'room' => 'string|max:50|nullable', 'guestName' => 'string|max:255',
            'type' => 'string|max:50', 'title' => 'string|max:255', 'status' => 'string|max:50',
            'assignee' => 'string|max:100|nullable', 'requestedAt' => 'string|max:50', 'notes' => 'string|max:1000|nullable',
        ],
        'housekeeping-tasks' => [
            'room' => 'string|max:50', 'roomType' => 'string|max:50', 'type' => 'string|max:100',
            'assignee' => 'string|max:100', 'assignedBy' => 'string|max:100|nullable',
            'status' => 'string|max:50', 'priority' => 'string|max:50',
            'assignedAt' => 'string|max:50', 'startedAt' => 'string|max:50|nullable',
            'completedAt' => 'string|max:50|nullable', 'durationMin' => 'integer|min:0',
            'notes' => 'string|max:2000|nullable',
        ],
        'enquiries' => [
            'enqNo' => 'string|max:50', 'type' => 'string|max:50', 'name' => 'string|max:255',
            'phone' => 'string|max:50|nullable', 'email' => 'email|max:255|nullable', 'company' => 'string|max:255|nullable',
            'source' => 'string|max:50', 'status' => 'string|max:50', 'roomNights' => 'integer|nullable',
            'roomCount' => 'integer|nullable', 'hallName' => 'string|max:255|nullable', 'guestCount' => 'integer|nullable',
            'checkIn' => 'string|max:50|nullable', 'checkOut' => 'string|max:50|nullable', 'eventDate' => 'string|max:50|nullable',
            'budget' => 'integer|nullable', 'quotedAmount' => 'integer|nullable', 'enquiredOn' => 'string|max:50',
            'assignedTo' => 'string|max:100', 'nextFollowUp' => 'string|max:50|nullable', 'followUps' => 'array',
            'notes' => 'string|max:2000|nullable', 'thankYouSent' => 'boolean', 'vip' => 'boolean',
        ],
        'found-items' => [
            'name' => 'string|max:255', 'category' => 'string|max:100', 'status' => 'string|max:50',
            'qty' => 'integer|min:0', 'value' => 'integer|min:0', 'hvi' => 'boolean', 'daysHeld' => 'integer',
            'foundLocation' => 'string|max:255|nullable', 'foundDate' => 'string|max:50|nullable',
            'foundBy' => 'string|max:100|nullable', 'storageLocation' => 'string|max:255|nullable',
            'condition' => 'string|max:50', 'description' => 'string|max:2000|nullable', 'timeline' => 'array',
            'photos' => 'array', 'photos.*' => 'string|max:2000',
        ],
        'channels' => [
            'name' => 'string|max:255', 'status' => 'string|max:50', 'lastSync' => 'string|max:100|nullable',
            'bookings' => 'integer|min:0', 'commission' => 'integer|min:0|max:100', 'rev' => 'integer|min:0',
        ],
        'form-c-registrations' => [
            'guestName' => 'string|max:255', 'passportNo' => 'string|max:100|nullable', 'nationality' => 'string|max:100|nullable',
            'visaNo' => 'string|max:100|nullable', 'visaExpiry' => 'string|max:50|nullable', 'arrivalAt' => 'string|max:50|nullable',
            'departureAt' => 'string|max:50|nullable', 'roomNo' => 'string|max:50|nullable',
            'reportedToFrro' => 'boolean', 'reportedAt' => 'string|max:50|nullable',
        ],
        'web-rooms' => [
            'name' => 'string|max:255', 'price' => 'integer|min:0', 'image' => 'string|max:50|nullable',
            'desc' => 'string|max:500|nullable', 'published' => 'boolean',
        ],
        'pricing-rules' => [
            'name' => 'string|max:255', 'trigger' => 'string|max:255|nullable', 'adjustment' => 'string|max:100|nullable',
            'enabled' => 'boolean', 'scope' => 'string|max:255',
        ],
        'group-rooming' => [
            'groupCode' => 'string|max:50', 'roomNo' => 'string|max:50|nullable', 'roomType' => 'string|max:100',
            'lead' => 'string|max:255', 'pax' => 'integer|min:1', 'phone' => 'string|max:50|nullable',
            'remarks' => 'string|max:500|nullable', 'checkedOut' => 'boolean',
        ],
        'compliance-licenses' => [
            'name' => 'string|max:255', 'authority' => 'string|max:255', 'number' => 'string|max:100|nullable',
            'issueDate' => 'string|max:50|nullable', 'expiryDate' => 'string|max:50|nullable',
            'daysToExpiry' => 'integer', 'fee' => 'integer|min:0', 'status' => 'string|max:50',
            'documents' => 'array', 'reminders' => 'array',
        ],
        'group-bookings' => [
            'code' => 'string|max:50', 'name' => 'string|max:255', 'type' => 'string|max:50',
            'contactName' => 'string|max:255', 'contactPhone' => 'string|max:50|nullable', 'contactEmail' => 'email|max:255|nullable',
            'bookedBy' => 'string|max:255|nullable', 'arrival' => 'string|max:50', 'departure' => 'string|max:50',
            'nights' => 'integer|min:0', 'block' => 'array', 'totalRooms' => 'integer|min:0', 'totalPax' => 'integer|min:0',
            'ratePlan' => 'string|max:255|nullable', 'services' => 'array', 'total' => 'integer|min:0',
            'advance' => 'integer|min:0', 'balance' => 'integer', 'status' => 'string|max:50',
            'notes' => 'string|max:2000|nullable', 'createdAt' => 'string|max:50|nullable',
        ],
        'hall-bookings' => [
            'customer' => 'string|max:255', 'phone' => 'string|max:50|nullable', 'email' => 'email|max:255|nullable', 'hall' => 'string|max:255',
            'date' => 'string|max:50', 'start' => 'string|max:50', 'end' => 'string|max:50',
            'guests' => 'integer|min:0', 'package' => 'string|max:255|nullable', 'advance' => 'integer|min:0',
            'total' => 'integer|min:0', 'status' => 'string|max:50', 'notes' => 'string|max:2000|nullable',
        ],
        'app-users' => [
            'name' => 'string|max:255', 'email' => 'email|max:255', 'role' => 'string|max:50',
            'status' => 'string|max:50', 'last' => 'string|max:100|nullable', 'twoFA' => 'boolean',
            'phone' => 'string|max:50|nullable', 'joinedAt' => 'string|max:50|nullable',
        ],
        'account-entries' => [
            'date' => 'string|max:50', 'type' => 'string|max:50', 'category' => 'string|max:255',
            'description' => 'string|max:500', 'amount' => 'integer', 'mode' => 'string|max:50',
            'ref' => 'string|max:255|nullable', 'vendor' => 'string|max:255|nullable', 'gstin' => 'string|max:50|nullable',
            'cgst' => 'integer|nullable', 'sgst' => 'integer|nullable', 'igst' => 'integer|nullable',
            'hsnSac' => 'string|max:50|nullable', 'voucherNo' => 'string|max:50|nullable',
            'lines' => 'array|nullable', 'attachment' => 'array|nullable',
            'department' => 'string|max:50|nullable',
        ],
        'loyalty-tiers' => [
            'level' => 'string|max:50', 'minSpend' => 'integer|min:0', 'minNights' => 'integer|min:0',
            'pointsRate' => 'numeric|min:0', 'discountPct' => 'integer|min:0|max:100', 'roomUpgrade' => 'string|max:100',
            'lateCheckout' => 'string|max:100|nullable', 'earlyCheckin' => 'string|max:100|nullable',
            'freeBreakfast' => 'boolean', 'welcomeDrink' => 'boolean', 'priorityBooking' => 'boolean', 'vipTag' => 'boolean',
            'color' => 'string|max:50|nullable', 'perks' => 'array',
        ],
        'loyalty-rewards' => [
            'name' => 'string|max:255', 'category' => 'string|max:50', 'pointsCost' => 'integer|min:0',
            'cashValue' => 'integer|min:0', 'description' => 'string|max:500|nullable', 'minTier' => 'string|max:50',
            'active' => 'boolean', 'icon' => 'string|max:20|nullable',
        ],
        'loyalty-campaigns' => [
            'name' => 'string|max:255', 'type' => 'string|max:50', 'description' => 'string|max:1000|nullable',
            'validFrom' => 'string|max:50|nullable', 'validTo' => 'string|max:50|nullable',
            'applicableTiers' => 'array', 'applicableRoomTypes' => 'array', 'minBookingAmount' => 'integer|min:0',
            'rewardValue' => 'string|max:255|nullable', 'active' => 'boolean', 'redemptions' => 'integer|min:0',
        ],
        'loyalty-members' => [
            'membershipId' => 'string|max:50', 'name' => 'string|max:255', 'phone' => 'string|max:50|nullable',
            'email' => 'email|max:255|nullable', 'dob' => 'string|max:50|nullable', 'anniversary' => 'string|max:50|nullable',
            'address' => 'string|max:500|nullable', 'nationality' => 'string|max:100', 'idType' => 'string|max:50',
            'idNumber' => 'string|max:100', 'joinedAt' => 'string|max:50', 'tier' => 'string|max:50',
            'pointsBalance' => 'integer|min:0', 'lifetimePoints' => 'integer|min:0', 'lifetimeStays' => 'integer|min:0',
            'lifetimeNights' => 'integer|min:0', 'lifetimeSpend' => 'integer|min:0', 'lastStayDate' => 'string|max:50|nullable',
            'upcomingBooking' => 'array|nullable', 'preferences' => 'array', 'staffNotes' => 'string|max:2000|nullable',
            'consentMarketing' => 'boolean', 'blocked' => 'boolean',
        ],
        'email-schedules' => [
            'label' => 'string|max:255', 'frequency' => 'string|max:20', 'time' => 'string|max:20',
            'recipients' => 'array', 'recipients.*' => 'string|max:255',
            'format' => 'string|max:20', 'sections' => 'array', 'sections.*' => 'string|max:100',
            'enabled' => 'boolean', 'lastSentAt' => 'string|max:100|nullable',
        ],
        'lost-reports' => [
            'reportNo' => 'string|max:50', 'guest' => 'string|max:255', 'phone' => 'string|max:50|nullable',
            'email' => 'email|max:255|nullable', 'isWalkIn' => 'boolean', 'room' => 'string|max:50|nullable',
            'stayFrom' => 'string|max:50|nullable', 'stayTo' => 'string|max:50|nullable',
            'itemCategory' => 'string|max:100', 'itemName' => 'string|max:255', 'brand' => 'string|max:255|nullable',
            'color' => 'string|max:100|nullable', 'description' => 'string|max:2000|nullable',
            'identification' => 'string|max:500|nullable', 'hasPhoto' => 'boolean',
            'lostDate' => 'string|max:50|nullable', 'lostTime' => 'string|max:50|nullable',
            'lastSeen' => 'string|max:255|nullable', 'reportedOn' => 'string|max:50|nullable',
            'urgency' => 'string|max:50', 'status' => 'string|max:50', 'contactMode' => 'string|max:50',
            'remarks' => 'string|max:2000|nullable', 'estValue' => 'integer|nullable', 'hvi' => 'boolean',
            'timeline' => 'array', 'matches' => 'array',
        ],
        'banquet-orders' => [
            'beoNo' => 'string|max:50',
            'eventName' => 'string|max:255',
            'type' => 'string|max:50',
            'date' => 'string|max:50',
            'venue' => 'string|max:255',
            'host' => 'string|max:255',
            'pax' => 'integer|min:0',
            'pkg' => 'string|max:50',
            'revenue' => 'integer|min:0',
            'margin' => 'numeric|min:0|max:1',
            'advance' => 'integer|min:0',
            'status' => 'string|max:50',
            'startTime' => 'string|max:20|nullable',
            'endTime' => 'string|max:20|nullable',
            'vegPax' => 'integer|min:0',
            'nonVegPax' => 'integer|min:0',
            'dietary' => 'string|max:2000|nullable',
            'barPackage' => 'string|max:100|nullable',
            'cocktails' => 'string|max:2000|nullable',
            'avNotes' => 'string|max:2000|nullable',
            'decorTheme' => 'string|max:255|nullable',
            'decorColor' => 'string|max:255|nullable',
            'staffService' => 'integer|min:0',
            'staffKitchen' => 'integer|min:0',
            'staffCaptains' => 'integer|min:0',
            'parking' => 'integer|min:0',
            'security' => 'integer|min:0',
            'florist' => 'string|max:255|nullable',
            'photographer' => 'string|max:255|nullable',
            'ancillary' => 'integer|min:0',
            'timeline' => 'array',
            'courses' => 'array',
            'bars' => 'array',
            'avEquipment' => 'array',
            'decorVendors' => 'array',
            'staffing' => 'array',
            'vendors' => 'array',
        ],
        'table-reservations' => [
            'table' => 'string|max:50',
            'startHr' => 'numeric|min:0',
            'durHr' => 'numeric|min:0',
            'guest' => 'string|max:255',
            'party' => 'integer|min:0',
            'phone' => 'string|max:50',
            'notes' => 'string|max:2000|nullable',
            'occasion' => 'string|max:50',
            'status' => 'string|max:50',
            'source' => 'string|max:50|nullable',
            'seatedAt' => 'string|max:50|nullable',
            'completedAt' => 'string|max:50|nullable',
        ],
        'table-waitlist' => [
            'guest' => 'string|max:255',
            'party' => 'integer|min:0',
            'phone' => 'string|max:50',
            'waitMin' => 'integer|min:0',
            'arrivedAt' => 'string|max:50',
            'notified' => 'boolean',
        ],
        'maintenance-schedules' => [
            'equipment' => 'string|max:255',
            'area' => 'string|max:255|nullable',
            'category' => 'string|max:100|nullable',
            'frequency' => 'string|max:50',
            'lastDone' => 'string|max:50|nullable',
            'nextDue' => 'string|max:50|nullable',
            'assignee' => 'string|max:100|nullable',
            'durationMin' => 'integer|min:0',
        ],
        'amc-contracts' => [
            'name' => 'string|max:255',
            'category' => 'string|max:100|nullable',
            'contactPerson' => 'string|max:255|nullable',
            'phone' => 'string|max:50|nullable',
            'email' => 'email|max:255|nullable',
            'address' => 'string|max:500|nullable',
            'contractStart' => 'string|max:50|nullable',
            'contractEnd' => 'string|max:50|nullable',
            'annualFee' => 'integer|min:0',
            'visitFrequency' => 'string|max:50',
            'lastVisit' => 'string|max:50|nullable',
            'nextVisit' => 'string|max:50|nullable',
            'slaResponseHours' => 'integer|min:0',
            'status' => 'string|max:50',
            'notes' => 'string|max:2000|nullable',
        ],
        'pos-tables' => [
            'code' => 'string|max:20',
            'seats' => 'integer|min:1',
            'status' => 'string|max:50',
            'server' => 'string|max:100|nullable',
            'covers' => 'integer|min:0|nullable',
            'seatedAt' => 'string|max:20|nullable',
            'zone' => 'string|max:100|nullable',
        ],
        'recipes' => [
            'name' => 'string|max:255',
            'category' => 'string|max:100',
            'menuPrice' => 'integer|min:0',
            'portions' => 'integer|min:1',
            'prepMin' => 'integer|min:0',
            'cookMin' => 'integer|min:0',
            'labour' => 'integer|min:0',
            'overhead' => 'integer|min:0',
            'description' => 'string|max:2000|nullable',
            'ingredients' => 'array',
            'allergens' => 'array',
            'nutrition' => 'array',
        ],
        'bar-items' => [
            'brand' => 'string|max:255',
            'category' => 'string|max:50',
            'size' => 'string|max:50',
            'opened' => 'numeric|min:0',
            'sealed' => 'integer|min:0',
            'par' => 'integer|min:0',
            'reorderQty' => 'integer|min:0',
            'unitCost' => 'integer|min:0',
        ],
        'bar-pour-costs' => [
            'category' => 'string|max:50',
            'soldValue' => 'integer|min:0',
            'theoreticalCost' => 'integer|min:0',
            'actualCost' => 'integer|min:0',
        ],
        'bar-variances' => [
            'sku' => 'string|max:255',
            'category' => 'string|max:50',
            'theoreticalMl' => 'integer|min:0',
            'actualMl' => 'integer|min:0',
            'unitCost' => 'integer|min:0',
            'flag' => 'string|max:20|nullable',
            'note' => 'string|max:2000|nullable',
        ],
        'bar-purchase-orders' => [
            'poNo' => 'string|max:50',
            'vendor' => 'string|max:255',
            'items' => 'string|max:500',
            'itemCount' => 'integer|min:0',
            'value' => 'integer|min:0',
            'raised' => 'string|max:50|nullable',
            'eta' => 'string|max:50|nullable',
            'status' => 'string|max:50',
        ],
        'bar-cocktails' => [
            'name' => 'string|max:255',
            'category' => 'string|max:50',
            'menuPrice' => 'integer|min:0',
            'glassCost' => 'integer|min:0',
            'recipe' => 'array',
        ],
        'loyalty-redemptions' => [
            'date' => 'string|max:50',
            'memberId' => 'string|max:50',
            'memberName' => 'string|max:255',
            'rewardId' => 'string|max:50|nullable',
            'rewardName' => 'string|max:255',
            'pointsUsed' => 'integer|min:0',
            'bookingNo' => 'string|max:50|nullable',
            'status' => 'string|max:50',
            'staff' => 'string|max:100',
            'approver' => 'string|max:100|nullable',
            'notes' => 'string|max:2000|nullable',
        ],
        'loyalty-transactions' => [
            'memberId' => 'string|max:50',
            'date' => 'string|max:50',
            'kind' => 'string|max:50',
            'source' => 'string|max:255',
            'bookingNo' => 'string|max:50|nullable',
            'amount' => 'integer',
            'balance' => 'integer',
            'staff' => 'string|max:100|nullable',
            'notes' => 'string|max:2000|nullable',
            'expiresOn' => 'string|max:50|nullable',
        ],
        'loyalty-earning-rules' => [
            'source' => 'string|max:255',
            'multiplier' => 'numeric|min:0',
            'enabled' => 'boolean',
            'notes' => 'string|max:2000|nullable',
        ],
        'loyalty-settings' => [
            'name' => 'string|max:255',
            'pointsValueRupees' => 'numeric|min:0',
            'pointsExpiryMonths' => 'integer|min:1',
            'taxBeforeDiscount' => 'boolean',
            'approvalRequiredAbove' => 'integer|min:0',
            'manualAdjustNeedsApproval' => 'boolean',
            'redemptionOtp' => 'boolean',
        ],
        'inventory-purchases' => [
            'date' => 'string|max:50',
            'billNo' => 'string|max:100',
            'billDate' => 'string|max:50',
            'vendor' => 'string|max:255',
            'vendorGstin' => 'string|max:50|nullable',
            'vendorPan' => 'string|max:50|nullable',
            'vendorPhone' => 'string|max:50|nullable',
            'category' => 'string|max:100',
            'department' => 'string|max:100',
            'lines' => 'array',
            'discount' => 'integer',
            'freight' => 'integer',
            'roundOff' => 'integer',
            'interState' => 'boolean',
            'paymentStatus' => 'string|max:50',
            'paymentMode' => 'string|max:100|nullable',
            'paymentDate' => 'string|max:50|nullable',
            'paymentRef' => 'string|max:100|nullable',
            'paidAmount' => 'integer|min:0',
            'receivedBy' => 'string|max:255',
            'qcStatus' => 'string|max:50',
            'storage' => 'string|max:100',
            'billPhoto' => 'string|nullable',
            'goodsPhotos' => 'array|nullable',
            'notes' => 'string|max:2000|nullable',
        ],
        'stock-movements' => [
            'time' => 'string|max:50',
            'itemName' => 'string|max:255',
            'type' => 'string|max:50',
            'qty' => 'integer',
            'reason' => 'string|max:500|nullable',
            'by' => 'string|max:100|nullable',
        ],
        'purchase-orders' => [
            'po' => 'string|max:50',
            'vendor' => 'string|max:255',
            'items' => 'integer|min:0',
            'amount' => 'integer|min:0',
            'date' => 'string|max:50',
            'status' => 'string|max:50',
        ],
        'inventory-wastage' => [
            'date' => 'string|max:50',
            'item' => 'string|max:255',
            'qty' => 'integer|min:0',
            'cost' => 'integer|min:0',
            'reason' => 'string|max:500|nullable',
        ],
        'ota-bookings' => [
            'channel' => 'string|max:255',
            'booking' => 'string|max:50',
            'guest' => 'string|max:255',
            'room' => 'string|max:50|nullable',
            'checkIn' => 'string|max:50|nullable',
            'nights' => 'integer|min:0',
            'status' => 'string|max:50',
            'total' => 'integer|min:0',
        ],
        'channel-rate-maps' => [
            'type' => 'string|max:100',
            'pms' => 'integer|min:0',
            'bdc' => 'integer|min:0',
            'agoda' => 'integer|min:0',
            'expedia' => 'integer|min:0',
        ],
        'channel-sync-logs' => [
            'time' => 'string|max:50',
            'channel' => 'string|max:255',
            'action' => 'string|max:255',
            'detail' => 'string|max:500|nullable',
            'status' => 'string|max:50',
        ],
        'gst-returns' => [
            'label' => 'string|max:255',
            'taxable' => 'integer',
            'igst' => 'integer',
            'cgst' => 'integer',
            'sgst' => 'integer',
        ],
        'tds-entries' => [
            'section' => 'string|max:50',
            'description' => 'string|max:500',
            'partyType' => 'string|max:100|nullable',
            'amount' => 'integer|min:0',
            'rate' => 'numeric|min:0',
            'tds' => 'integer|min:0',
        ],
        'audit-runs' => [
            'date' => 'string|max:50',
            'runAt' => 'string|max:50',
            'duration' => 'string|max:50',
            'status' => 'string|max:50',
            'occupancy' => 'integer|min:0|max:100',
            'revenue' => 'integer|min:0',
            'noShows' => 'integer|min:0',
            'cashVariance' => 'integer',
            'anomalies' => 'array',
            'anomalies.*' => 'string|max:500',
            'irn' => 'boolean',
            'backup' => 'boolean',
            'steps' => 'array',
            'steps.*.name' => 'string|max:255',
            'steps.*.duration' => 'string|max:50',
            'steps.*.status' => 'string|max:20',
        ],
        'whatsapp-templates' => [
            'name' => 'string|max:255',
            'status' => 'string|max:50',
            'category' => 'string|max:100',
            'language' => 'string|max:50',
            'body' => 'string|max:2000',
            'header' => 'string|max:500|nullable',
            'footer' => 'string|max:500|nullable',
            'rejectionReason' => 'string|max:500|nullable',
            'submittedOn' => 'string|max:50|nullable',
            'buttons' => 'array',
            'usage30d' => 'integer|min:0',
            'lastEdited' => 'string|max:50',
            'editedBy' => 'string|max:100',
        ],
        'agent-ledger' => [
            'agentName' => 'string|max:255',
            'date' => 'string|max:50',
            'type' => 'string|max:50',
            'description' => 'string|max:500',
            'bookingNo' => 'string|max:50|nullable',
            'mode' => 'string|max:100|nullable',
            'reference' => 'string|max:255|nullable',
            'debit' => 'integer',
            'credit' => 'integer',
            'balance' => 'integer',
        ],
        'rate-restrictions' => [
            'fromIso' => 'string|max:50',
            'toIso' => 'string|max:50',
            'roomType' => 'string|max:50',
            'kind' => 'string|max:50',
            'value' => 'string|max:255',
            'appliedBy' => 'string|max:255|nullable',
            'appliedAt' => 'string|max:50|nullable',
            'channels' => 'array',
            'channels.*' => 'string|max:100',
        ],
        'notif-templates' => [
            'name' => 'string|max:255',
            'trigger' => 'string|max:100',
            'channels' => 'array',
            'channels.*' => 'string|max:50',
            'lastSent' => 'string|max:100|nullable',
        ],
        'notif-logs' => [
            'time' => 'string|max:50',
            'to' => 'string|max:255',
            'channel' => 'string|max:50',
            'template' => 'string|max:255',
            'status' => 'string|max:50',
        ],
        'kitchen-amenities' => [
            'name' => 'string|max:255', 'category' => 'string|max:50', 'qty' => 'integer|min:0',
            'unit' => 'string|max:50', 'purchaseDate' => 'string|max:50|nullable', 'purchasePrice' => 'integer|min:0',
            'vendor' => 'string|max:255|nullable', 'condition' => 'string|max:50', 'location' => 'string|max:100',
            'photo' => 'string|nullable', 'remark' => 'string|max:2000|nullable',
        ],
        'room-amenities' => [
            'name' => 'string|max:255', 'category' => 'string|max:50', 'qty' => 'integer|min:0',
            'unit' => 'string|max:50', 'purchaseDate' => 'string|max:50|nullable', 'purchasePrice' => 'integer|min:0',
            'vendor' => 'string|max:255|nullable', 'condition' => 'string|max:50', 'location' => 'string|max:100',
            'photo' => 'string|nullable', 'remark' => 'string|max:2000|nullable', 'perRoom' => 'integer|min:0|nullable',
        ],
        'vendor-bills' => [
            'billNo' => 'string|max:255', 'vendor' => 'string|max:255',
            'category' => 'string|max:100|nullable', 'billDate' => 'string|max:50',
            'dueDate' => 'string|max:50', 'taxableValue' => 'integer|min:0',
            'gst' => 'integer|min:0', 'tdsRate' => 'integer|min:0',
            'tdsAmount' => 'integer|min:0', 'netPayable' => 'integer|min:0',
            'paid' => 'integer|min:0', 'status' => 'string|max:50',
        ],
        'group-services' => [
            'name' => 'string|max:255', 'category' => 'string|max:50|nullable',
            'price' => 'integer|min:0', 'perPax' => 'boolean',
            'gst' => 'integer|min:0|max:100', 'active' => 'boolean',
        ],
        'cashier-shifts' => [
            'staffName'      => 'string|max:255',
            'openedAt'       => 'string|max:50|nullable',
            'openingBalance' => 'integer|min:0',
            'status'         => 'string|max:50',
            'closingBalance' => 'integer|min:0|nullable',
            'closedAt'       => 'string|max:50|nullable',
            'notes'          => 'string|max:2000|nullable',
        ],
        'service-items' => [
            'kind' => 'string|max:20', 'name' => 'string|max:255',
            'price' => 'integer|min:0', 'hint' => 'string|max:255|nullable', 'active' => 'boolean',
        ],
    ];

    /** Fields that must be present (and non-empty) when creating a row. */
    private const REQUIRED_ON_CREATE = [
        'floors' => ['name'], 'rooms' => ['number'], 'room-types' => ['name'], 'rate-plans' => ['code', 'name'],
        'seasons' => ['name'], 'holidays' => ['name'], 'fb-packages' => ['name'],
        'hall-packages' => ['name'], 'agents' => ['name'], 'gst-slabs' => ['label'],
        'payment-methods' => ['name', 'code'], 'notification-templates' => ['event'],
        'roles' => ['name'], 'webhooks' => ['url'],
        'guests' => ['name'], 'bookings' => ['guestName'],
        'folio-charges' => ['bookingNo', 'description'], 'folio-payments' => ['bookingNo'],
        'folio-adjustments' => ['bookingNo', 'type', 'amount'],
        'einvoices' => ['bookingNo'],
        'competitors' => ['hotel'],
        'competitor-rates' => ['competitorId', 'rate'],
        'meal-plans' => ['code', 'name'],
        'banquet-packages' => ['name'],
        'extra-services' => ['label'],
        'staff' => ['name'], 'vendors' => ['name'], 'inventory-items' => ['name'],
        'menu-items' => ['name'], 'fb-orders' => ['tableNo'],
        'maintenance-tickets' => ['title'], 'guest-requests' => ['title', 'guestName', 'room'], 'housekeeping-tasks' => ['room', 'assignee'], 'enquiries' => ['name'], 'found-items' => ['name'],
        'loyalty-members' => ['name'],
        'loyalty-tiers' => ['level'],
        'loyalty-rewards' => ['name'],
        'loyalty-campaigns' => ['name'],
        'account-entries' => ['category', 'description'],
        'app-users' => ['name', 'email'],
        'hall-bookings' => ['customer'],
        'group-bookings' => ['name'],
        'group-rooming' => ['lead', 'roomType'],
        'compliance-licenses' => ['name', 'authority'],
        'form-c-registrations' => ['guestName'],
        'channels' => ['name'],
        'web-rooms' => ['name'],
        'pricing-rules' => ['name'],
        'email-schedules' => ['label'],
        'linen-items' => ['name'],
        'lost-reports' => ['guest', 'itemName'],
        'banquet-orders' => ['eventName'],
        'table-reservations' => ['guest', 'table'],
        'table-waitlist' => ['guest'],
        'maintenance-schedules' => ['equipment'],
        'amc-contracts' => ['name'],
        'pos-tables' => ['code'],
        'recipes' => ['name'],
        'bar-items' => ['brand', 'category'],
        'bar-pour-costs' => ['category'],
        'bar-variances' => ['sku', 'category'],
        'bar-purchase-orders' => ['poNo', 'vendor'],
        'bar-cocktails' => ['name'],
        'loyalty-redemptions' => ['memberName', 'rewardName'],
        'loyalty-transactions' => ['memberId', 'source'],
        'loyalty-earning-rules' => ['source'],
        'loyalty-settings' => ['name'],
        'inventory-purchases' => ['billNo', 'vendor'],
        'stock-movements' => ['itemName'],
        'purchase-orders' => ['po', 'vendor'],
        'inventory-wastage' => ['item'],
        'ota-bookings' => ['channel', 'guest'],
        'channel-rate-maps' => ['type'],
        'channel-sync-logs' => ['action'],
        'gst-returns' => ['label'],
        'tds-entries' => ['section', 'description'],
        'audit-runs' => ['date'],
        'whatsapp-templates' => ['name'],
        'agent-ledger' => ['agentName'],
        'rate-restrictions' => ['kind', 'value'],
        'notif-templates' => ['name'],
        'notif-logs' => ['to'],
        'kitchen-amenities' => ['name'],
        'room-amenities' => ['name'],
        'vendor-bills' => ['billNo', 'vendor'],
        'group-services'  => ['name'],
        'cashier-shifts'  => ['staffName'],
        'service-items'   => ['name', 'kind'],
    ];

    private function model(string $resource): string
    {
        abort_unless(isset(self::MODELS[$resource]), 404, "Unknown resource: {$resource}");

        return self::MODELS[$resource];
    }

    private function validated(string $resource, Request $request, bool $creating): array
    {
        $rules = [];
        foreach (self::RULES[$resource] ?? [] as $field => $rule) {
            $required = $creating && in_array($field, self::REQUIRED_ON_CREATE[$resource] ?? [], true);
            // Optional fields are `nullable` so a blank input (e.g. an empty ID number that
            // ConvertEmptyStringsToNull turns into null) passes a non-nullable string rule
            // instead of 422-ing. On create, nulls are dropped below so DB defaults apply.
            $rules[$field] = ($required ? 'required|' : 'sometimes|nullable|') . $rule;
        }

        $data = $request->validate($rules);
        unset($data['id'], $data['created_at'], $data['updated_at']);

        // On create, drop nulls so columns fall back to their schema default
        // (Laravel's ConvertEmptyStringsToNull turns "" into null, which would
        // otherwise violate NOT NULL columns like guests.email). On update we
        // keep nulls so a field can be explicitly cleared.
        if ($creating) {
            $data = array_filter($data, static fn ($v) => $v !== null);
        }

        return $data;
    }

    public function show(string $resource, $id)
    {
        $row = $this->model($resource)::findOrFail($id);
        return response()->json($row);
    }

    public function index(string $resource, Request $request)
    {
        $query = $this->model($resource)::query();

        foreach (self::FILTER_BY[$resource] ?? [] as $col) {
            if ($request->filled($col)) {
                $query->where($col, $request->query($col));
            }
        }

        return $query->orderBy('id')->get();
    }

    public function store(string $resource, Request $request)
    {
        $this->model($resource); // 404 if unknown
        $data = $this->validated($resource, $request, true);
        $row = $this->model($resource)::create($data);

        // Every booking must correspond to a searchable guest profile. Bookings
        // reference a guest only by name (no FK), so a booking made through any
        // flow that didn't also create a profile would leave the guest invisible
        // to "Search Existing". Upsert a minimal profile here, keyed on a
        // case-insensitive name match so we never duplicate an existing guest.
        if ($resource === 'bookings' && !empty($data['guestName'])) {
            $name = trim((string) $data['guestName']);
            if ($name !== '' && ! Guest::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists()) {
                Guest::create(['name' => $name, 'vip' => $data['vip'] ?? false]);
            }
        }

        AuditLog::record([
            'module' => $this->moduleLabel($resource), 'action' => 'Created',
            'entity' => $this->entityLabel($resource, $row), 'after' => 'Created',
        ], $request);

        return response()->json($row, 201);
    }

    public function update(string $resource, Request $request, $id)
    {
        $row = $this->model($resource)::findOrFail($id);
        $changes = $this->validated($resource, $request, false);
        $row->update($changes);

        AuditLog::record([
            'module' => $this->moduleLabel($resource),
            'action' => isset($changes['status']) ? 'Status changed' : 'Updated',
            'entity' => $this->entityLabel($resource, $row),
            'after'  => isset($changes['status']) ? (string) $changes['status'] : 'Updated',
        ], $request);

        return response()->json($row);
    }

    public function destroy(string $resource, Request $request, $id)
    {
        $row = $this->model($resource)::findOrFail($id);
        $entity = $this->entityLabel($resource, $row);
        $row->delete();

        AuditLog::record([
            'module' => $this->moduleLabel($resource), 'action' => 'Deleted',
            'entity' => $entity, 'after' => 'Deleted', 'severity' => 'warning',
        ], $request);

        return response()->noContent();
    }

    /** Slugs whose friendly module name differs from a plain title-case. */
    private const MODULE_LABELS = [
        'folio-charges' => 'Folio', 'folio-payments' => 'Payment', 'fb-orders' => 'F&B',
        'menu-items' => 'F&B', 'inventory-items' => 'Inventory', 'maintenance-tickets' => 'Maintenance', 'guest-requests' => 'Guest Requests', 'housekeeping-tasks' => 'Housekeeping',
        'found-items' => 'Lost & Found', 'lost-reports' => 'Lost & Found', 'loyalty-members' => 'Loyalty', 'account-entries' => 'Accounts',
        'app-users' => 'Users', 'hall-bookings' => 'Halls', 'group-bookings' => 'Groups',
        'rate-plans' => 'Rate Plans', 'gst-slabs' => 'GST', 'payment-methods' => 'Payment Methods',
        'notification-templates' => 'Notifications',
        'group-services' => 'Group Services',
    ];

    private function moduleLabel(string $resource): string
    {
        return self::MODULE_LABELS[$resource] ?? ucwords(str_replace('-', ' ', $resource));
    }

    /** Best human label for a row — name/code/booking ref, else #id. */
    private function entityLabel(string $resource, $row): string
    {
        foreach (['name', 'code', 'bookingNo', 'customer', 'guestName', 'membershipId', 'enqNo', 'orderNo', 'title', 'email'] as $field) {
            if (! empty($row->{$field})) {
                return (string) $row->{$field};
            }
        }

        return '#' . $row->id;
    }
}
