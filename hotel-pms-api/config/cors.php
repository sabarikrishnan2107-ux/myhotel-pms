<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Allows the Next.js frontend (luxe-pms, running on localhost:3000) to call
    | this API from the browser.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        // Production frontend domain(s): set FRONTEND_URL in .env, e.g.
        // FRONTEND_URL=https://app.yourhotel.com  (comma-separate for several).
        ...array_map('trim', explode(',', (string) env('FRONTEND_URL', ''))),
    ])),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
