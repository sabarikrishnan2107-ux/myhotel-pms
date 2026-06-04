<?php

use App\Http\Controllers\Api\PropertyController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// --- Setup & Settings : Property & Branch ---
Route::get('/property', [PropertyController::class, 'show']);
Route::put('/property', [PropertyController::class, 'update']);
