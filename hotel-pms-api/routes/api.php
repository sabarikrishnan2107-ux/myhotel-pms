<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\EInvoiceController;
use App\Http\Controllers\Api\EmailController;
use App\Http\Controllers\Api\HallBookingMailController;
use App\Http\Controllers\Api\InvoiceMailController;
use App\Http\Controllers\Api\NightAuditController;
use App\Http\Controllers\Api\OwnerFlashController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\ResourceController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SmtpSettingsController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Support\Facades\Route;

// ---- Public: authentication ----
Route::post('/login', [AuthController::class, 'login']);

// ---- Protected: everything else requires a valid Sanctum token ----
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Account security
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::post('/2fa/setup', [AuthController::class, 'twoFactorSetup']);
    Route::post('/2fa/enable', [AuthController::class, 'twoFactorEnable']);
    Route::post('/2fa/disable', [AuthController::class, 'twoFactorDisable']);

    // Database backups (real pg_dump / psql)
    Route::get('/backups', [BackupController::class, 'index']);
    Route::post('/backups', [BackupController::class, 'run']);
    Route::get('/backups/{file}/download', [BackupController::class, 'download']);
    Route::post('/backups/{file}/restore', [BackupController::class, 'restore']);

    // Setup & Settings : Property & Branch (dedicated table)
    Route::get('/property', [PropertyController::class, 'show']);
    Route::put('/property', [PropertyController::class, 'update']);

    // Dashboard KPIs + live room board (aggregated from real data)
    Route::get('/stats', [StatsController::class, 'index']);
    Route::get('/room-board', [StatsController::class, 'roomBoard']);
    Route::get('/dashboard/revenue-trend', [StatsController::class, 'revenueTrend']);
    Route::get('/dashboard/occupancy-forecast', [StatsController::class, 'occupancyForecast']);
    Route::get('/dashboard/alerts', [StatsController::class, 'alerts']);
    Route::get('/dashboard/goals', [StatsController::class, 'goals']);

    // Revenue management — booking pace + pickup analytics (real Booking aggregates)
    Route::get('/revenue/pace', [StatsController::class, 'pace']);
    Route::get('/revenue/pickup', [StatsController::class, 'pickup']);

    // Accounts dashboards — income/expense by category + recent txns (real account_entries)
    Route::get('/accounts/summary', [StatsController::class, 'accountsSummary']);
    Route::get('/accounts/departmental', [StatsController::class, 'departmentalPnl']);
    Route::get('/accounts/receivables', [StatsController::class, 'receivables']);
    Route::get('/accounts/vat', [StatsController::class, 'vat']);

    // Owner's Flash Dashboard — period KPIs, 30-day trend, manual/scheduled send
    Route::get('/owner/flash', [OwnerFlashController::class, 'flash']);
    Route::get('/owner/flash-trend', [OwnerFlashController::class, 'flashTrend']);
    Route::get('/owner/flash-insights', [OwnerFlashController::class, 'flashInsights']);
    Route::post('/owner/flash/send', [OwnerFlashController::class, 'send']);

    // Night audit — post nightly room charges to in-house folios
    Route::post('/night-audit', [NightAuditController::class, 'run']);

    // e-Invoice — generate a (locally-signed) IRN/ACK from real folio totals.
    // GET /einvoices?bookingNo=… is served by the generic ResourceController.
    Route::post('/einvoices/generate/{bookingNo}', [EInvoiceController::class, 'generate']);

    // Staff accounts — real login users with role + department (password hashed)
    Route::get('/staff-accounts', [StaffController::class, 'index']);
    Route::post('/staff-accounts', [StaffController::class, 'store']);
    Route::put('/staff-accounts/{id}', [StaffController::class, 'update']);
    Route::delete('/staff-accounts/{id}', [StaffController::class, 'destroy']);

    // Cashier shift — live mode totals from real payments + close-out
    Route::get('/shift/current', [ShiftController::class, 'current']);
    Route::post('/shift/close', [ShiftController::class, 'close']);

    // Audit trail — real activity recorded across CRUD, auth, night audit, shifts
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // Image uploads (logos, brand assets)
    Route::post('/upload', [UploadController::class, 'store']);

    // SMTP settings — dedicated controller so the password is encrypted at rest
    // and never returned. Registered before the generic /settings/{key} routes.
    Route::get('/settings/smtp', [SmtpSettingsController::class, 'show']);
    Route::put('/settings/smtp', [SmtpSettingsController::class, 'update']);
    Route::post('/settings/smtp/test', [SmtpSettingsController::class, 'test']);

    // Single-row settings sections (JSON by key)
    Route::get('/settings/{key}', [SettingsController::class, 'show']);
    Route::put('/settings/{key}', [SettingsController::class, 'update']);

    // Generic branded email — every "email" action across the app posts here so
    // they all deliver through the one configured mail account (.env MAIL_*).
    Route::post('/email/send', [EmailController::class, 'send']);

    // Tax-invoice email with a generated PDF attachment (checkout "Email Invoice").
    Route::post('/email/invoice', [InvoiceMailController::class, 'send']);

    // Hall booking confirmation email (synchronous; uses the configured mail driver)
    Route::post('/hall-bookings/{id}/send-email', [HallBookingMailController::class, 'send']);

    // List sections (generic CRUD)
    $resources = implode('|', ResourceController::resources());
    Route::get('/{resource}', [ResourceController::class, 'index'])->where('resource', $resources);
    Route::post('/{resource}', [ResourceController::class, 'store'])->where('resource', $resources);
    Route::put('/{resource}/{id}', [ResourceController::class, 'update'])->where('resource', $resources);
    Route::delete('/{resource}/{id}', [ResourceController::class, 'destroy'])->where('resource', $resources);
});
