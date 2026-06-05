<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\NightAuditController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\ResourceController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\ShiftController;
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

    // Night audit — post nightly room charges to in-house folios
    Route::post('/night-audit', [NightAuditController::class, 'run']);

    // Cashier shift — live mode totals from real payments + close-out
    Route::get('/shift/current', [ShiftController::class, 'current']);
    Route::post('/shift/close', [ShiftController::class, 'close']);

    // Audit trail — real activity recorded across CRUD, auth, night audit, shifts
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // Image uploads (logos, brand assets)
    Route::post('/upload', [UploadController::class, 'store']);

    // Single-row settings sections (JSON by key)
    Route::get('/settings/{key}', [SettingsController::class, 'show']);
    Route::put('/settings/{key}', [SettingsController::class, 'update']);

    // List sections (generic CRUD)
    $resources = implode('|', ResourceController::resources());
    Route::get('/{resource}', [ResourceController::class, 'index'])->where('resource', $resources);
    Route::post('/{resource}', [ResourceController::class, 'store'])->where('resource', $resources);
    Route::put('/{resource}/{id}', [ResourceController::class, 'update'])->where('resource', $resources);
    Route::delete('/{resource}/{id}', [ResourceController::class, 'destroy'])->where('resource', $resources);
});
