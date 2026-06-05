<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Booking;
use App\Models\Enquiry;
use App\Models\FbPackage;
use App\Models\Floor;
use App\Models\FolioCharge;
use App\Models\FolioPayment;
use App\Models\FbOrder;
use App\Models\FoundItem;
use App\Models\GstSlab;
use App\Models\MaintenanceTicket;
use App\Models\Guest;
use App\Models\HallPackage;
use App\Models\Holiday;
use App\Models\InventoryItem;
use App\Models\LoyaltyMember;
use App\Models\MenuItem;
use App\Models\NotificationTemplate;
use App\Models\PaymentMethod;
use App\Models\RatePlan;
use App\Models\Role;
use App\Models\Room;
use App\Models\Season;
use App\Models\Staff;
use App\Models\Vendor;
use App\Models\Webhook;
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
        'staff'                  => Staff::class,
        'vendors'                => Vendor::class,
        'inventory-items'        => InventoryItem::class,
        'menu-items'             => MenuItem::class,
        'fb-orders'              => FbOrder::class,
        'maintenance-tickets'    => MaintenanceTicket::class,
        'enquiries'              => Enquiry::class,
        'found-items'            => FoundItem::class,
        'loyalty-members'        => LoyaltyMember::class,
    ];

    /** Resources that can be filtered by ?bookingNo= on index. */
    private const FILTER_BY_BOOKING = ['folio-charges', 'folio-payments'];

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
        'rooms' => [
            'number' => 'string|max:50', 'category' => 'string|max:50', 'floor' => 'integer',
            'bedConfig' => 'string|max:50', 'maxAdults' => 'integer|min:1', 'maxChildren' => 'integer|min:0',
            'sizeSqft' => 'integer|min:0', 'view' => 'string|max:50', 'baseTariff' => 'integer|min:0',
            'extraBedAllowed' => 'boolean', 'extraBedRate' => 'integer|min:0', 'connectingRoom' => 'string|max:50',
            'extension' => 'string|max:50', 'wifiSsid' => 'string|max:100', 'smoking' => 'boolean',
            'accessible' => 'boolean', 'amenities' => 'array', 'status' => 'string|max:50', 'hkStatus' => 'string|max:50',
        ],
        'rate-plans' => [
            'code' => 'string|max:50', 'name' => 'string|max:255', 'inclBreakfast' => 'boolean',
            'inclLunch' => 'boolean', 'inclDinner' => 'boolean', 'discountPct' => 'integer|min:0|max:100',
            'refundable' => 'boolean', 'active' => 'boolean',
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
            'gst' => 'integer|min:0|max:100', 'active' => 'boolean',
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
        ],
        'bookings' => [
            'bookingNo' => 'string|max:50', 'guestName' => 'string|max:255', 'roomNumber' => 'string|max:50|nullable',
            'roomType' => 'string|max:50|nullable', 'source' => 'string|max:50', 'checkIn' => 'string|max:50|nullable',
            'checkOut' => 'string|max:50|nullable', 'nights' => 'integer|min:0', 'adults' => 'integer|min:1', 'children' => 'integer|min:0',
            'paymentStatus' => 'string|max:50', 'ratePlan' => 'string|max:50', 'total' => 'integer|min:0',
            'advance' => 'integer|min:0', 'balance' => 'integer', 'vip' => 'boolean', 'status' => 'string|max:50',
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
        ],
        'fb-orders' => [
            'orderNo' => 'string|max:50', 'tableNo' => 'string|max:50', 'server' => 'string|max:100|nullable',
            'items' => 'array', 'total' => 'integer|min:0', 'status' => 'string|max:50',
            'paymentMethod' => 'string|max:100|nullable', 'room' => 'string|max:50|nullable',
        ],
        'maintenance-tickets' => [
            'code' => 'string|max:50', 'room' => 'string|max:50|nullable', 'title' => 'string|max:255',
            'priority' => 'string|max:50', 'status' => 'string|max:50', 'assignee' => 'string|max:100|nullable',
            'reported' => 'string|max:50', 'category' => 'string|max:100',
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
    ];

    /** Fields that must be present (and non-empty) when creating a row. */
    private const REQUIRED_ON_CREATE = [
        'floors' => ['name'], 'rooms' => ['number'], 'rate-plans' => ['code', 'name'],
        'seasons' => ['name'], 'holidays' => ['name'], 'fb-packages' => ['name'],
        'hall-packages' => ['name'], 'agents' => ['name'], 'gst-slabs' => ['label'],
        'payment-methods' => ['name', 'code'], 'notification-templates' => ['event'],
        'roles' => ['name'], 'webhooks' => ['url'],
        'guests' => ['name'], 'bookings' => ['guestName'],
        'folio-charges' => ['bookingNo', 'description'], 'folio-payments' => ['bookingNo'],
        'staff' => ['name'], 'vendors' => ['name'], 'inventory-items' => ['name'],
        'menu-items' => ['name'], 'fb-orders' => ['tableNo'],
        'maintenance-tickets' => ['title'], 'enquiries' => ['name'], 'found-items' => ['name'],
        'loyalty-members' => ['name'],
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
            $rules[$field] = ($required ? 'required|' : 'sometimes|') . $rule;
        }

        $data = $request->validate($rules);
        unset($data['id'], $data['created_at'], $data['updated_at']);

        return $data;
    }

    public function index(string $resource, Request $request)
    {
        $query = $this->model($resource)::query();

        if (in_array($resource, self::FILTER_BY_BOOKING, true) && $request->filled('bookingNo')) {
            $query->where('bookingNo', $request->query('bookingNo'));
        }

        return $query->orderBy('id')->get();
    }

    public function store(string $resource, Request $request)
    {
        $this->model($resource); // 404 if unknown
        $row = $this->model($resource)::create($this->validated($resource, $request, true));

        return response()->json($row, 201);
    }

    public function update(string $resource, Request $request, $id)
    {
        $row = $this->model($resource)::findOrFail($id);
        $row->update($this->validated($resource, $request, false));

        return response()->json($row);
    }

    public function destroy(string $resource, $id)
    {
        $this->model($resource)::findOrFail($id)->delete();

        return response()->noContent();
    }
}
