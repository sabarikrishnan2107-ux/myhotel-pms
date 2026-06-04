<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Generic image upload (logos, favicons, brand assets).
 * Stores the file under public/uploads (served directly by the app) and
 * returns an absolute URL the frontend can save and display.
 */
class UploadController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'image', 'max:8192'], // ≤ 8 MB
        ]);

        $file = $request->file('file');
        $name = uniqid('img_', true) . '.' . strtolower($file->getClientOriginalExtension() ?: 'png');
        $file->move(public_path('uploads'), $name);

        return response()->json([
            'url'  => rtrim(config('app.url'), '/') . '/uploads/' . $name,
            'path' => 'uploads/' . $name,
        ], 201);
    }
}
