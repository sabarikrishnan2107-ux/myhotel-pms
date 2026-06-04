<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PropertySetting;
use Illuminate\Http\Request;

class PropertyController extends Controller
{
    /**
     * GET /api/property — return the single Property & Branch settings row,
     * creating it from defaults on first access.
     */
    public function show()
    {
        return response()->json(PropertySetting::firstOrCreate(['id' => 1]));
    }

    /**
     * PUT /api/property — update the Property & Branch settings.
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            'property_name'   => ['sometimes', 'string', 'max:255'],
            'owner_email'     => ['sometimes', 'nullable', 'email', 'max:255'],
            'overbooking'     => ['sometimes', 'string', 'max:255'],
            'branch'          => ['sometimes', 'string', 'max:255'],
            'currency'        => ['sometimes', 'string', 'max:255'],
            'country'         => ['sometimes', 'string', 'max:255'],
            'gst_state'       => ['sometimes', 'string', 'max:255'],
            'city'            => ['sometimes', 'string', 'max:255'],
            'pin_code'        => ['sometimes', 'string', 'max:255'],
            'checkin_time'    => ['sometimes', 'string', 'max:255'],
            'checkout_time'   => ['sometimes', 'string', 'max:255'],
            'default_advance' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'gstin'           => ['sometimes', 'string', 'max:255'],
            'pan'             => ['sometimes', 'string', 'max:255'],
            'fssai_license'   => ['sometimes', 'string', 'max:255'],
            'sac_code'        => ['sometimes', 'string', 'max:255'],
            'cin'             => ['sometimes', 'string', 'max:255'],
            'logo'            => ['sometimes', 'string', 'max:255'],
        ]);

        $settings = PropertySetting::firstOrCreate(['id' => 1]);
        $settings->update($data);

        return response()->json($settings);
    }
}
