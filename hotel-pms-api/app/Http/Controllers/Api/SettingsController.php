<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\Request;

/**
 * Single-row settings sections (preferences, security, branding, channels,
 * backup, integrations) stored as a JSON blob keyed by section id.
 */
class SettingsController extends Controller
{
    public function show(string $key)
    {
        $row = AppSetting::firstOrCreate(['key' => $key], ['value' => []]);

        return response()->json($row->value ?? []);
    }

    public function update(string $key, Request $request)
    {
        $row = AppSetting::firstOrCreate(['key' => $key], ['value' => []]);
        $row->value = $request->all();
        $row->save();

        return response()->json($row->value);
    }
}
