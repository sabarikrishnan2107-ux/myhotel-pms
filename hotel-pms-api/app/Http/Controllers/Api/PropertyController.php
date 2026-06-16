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
            'property_name'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'owner_email'     => ['sometimes', 'nullable', 'email', 'max:255'],
            'overbooking'     => ['sometimes', 'nullable', 'string', 'max:255'],
            'branch'          => ['sometimes', 'nullable', 'string', 'max:255'],
            'currency'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'country'         => ['sometimes', 'nullable', 'string', 'max:255'],
            'gst_state'       => ['sometimes', 'nullable', 'string', 'max:255'],
            'city'            => ['sometimes', 'nullable', 'string', 'max:255'],
            'pin_code'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'checkin_time'    => ['sometimes', 'nullable', 'string', 'max:255'],
            'checkout_time'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'default_advance' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'gstin'           => ['sometimes', 'nullable', 'string', 'max:255'],
            'pan'             => ['sometimes', 'nullable', 'string', 'max:255'],
            'fssai_license'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'sac_code'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'cin'             => ['sometimes', 'nullable', 'string', 'max:255'],
            'logo'            => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        // The property_settings columns are NOT NULL (with '' / 0 defaults), so a
        // cleared field arrives as null (ConvertEmptyStringsToNull) and would break
        // the insert. Store blanks as '' (or 0 for the numeric advance) to match.
        foreach ($data as $key => $value) {
            if ($value === null) {
                $data[$key] = $key === 'default_advance' ? 0 : '';
            }
        }

        $settings = PropertySetting::firstOrCreate(['id' => 1]);
        $settings->update($data);

        return response()->json($settings);
    }
}
