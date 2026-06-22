<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Support\SmtpConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;

class SmtpSettingsController extends Controller
{
    private function rules(): array
    {
        return [
            'host'       => 'required|string|max:255',
            'port'       => 'required|integer|min:1|max:65535',
            'encryption' => 'required|in:tls,ssl,none',
            'username'   => 'nullable|string|max:255',
            'password'   => 'nullable|string|max:500',
            'fromName'   => 'nullable|string|max:255',
            'fromEmail'  => 'required|email|max:255',
            'enabled'    => 'boolean',
        ];
    }

    public function show()
    {
        $v = AppSetting::where('key', 'smtp')->first()?->value ?? [];

        return response()->json([
            'host'        => $v['host'] ?? '',
            'port'        => $v['port'] ?? 587,
            'encryption'  => $v['encryption'] ?? 'tls',
            'username'    => $v['username'] ?? '',
            'fromName'    => $v['fromName'] ?? '',
            'fromEmail'   => $v['fromEmail'] ?? '',
            'enabled'     => (bool) ($v['enabled'] ?? false),
            'hasPassword' => ! empty($v['password']),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate($this->rules());
        $row = AppSetting::firstOrCreate(['key' => 'smtp'], ['value' => []]);
        $existing = $row->value ?? [];

        $value = [
            'host'       => $data['host'],
            'port'       => (int) $data['port'],
            'encryption' => $data['encryption'],
            'username'   => $data['username'] ?? '',
            'fromName'   => $data['fromName'] ?? '',
            'fromEmail'  => $data['fromEmail'],
            'enabled'    => (bool) ($data['enabled'] ?? false),
            'password'   => $existing['password'] ?? null, // keep unless replaced below
        ];
        if (! empty($data['password'])) {
            $value['password'] = Crypt::encryptString($data['password']);
        }

        $row->value = $value;
        $row->save();

        return $this->show();
    }

    public function test(Request $request)
    {
        $data = $request->validate($this->rules() + ['to' => 'nullable|email']);

        $password = $data['password'] ?? '';
        if ($password === '') {
            $stored = AppSetting::where('key', 'smtp')->first()?->value ?? [];
            $password = SmtpConfig::decrypt($stored['password'] ?? null) ?? '';
        }

        SmtpConfig::apply([
            'host'       => $data['host'],
            'port'       => (int) $data['port'],
            'username'   => $data['username'] ?? '',
            'password'   => $password,
            'encryption' => $data['encryption'],
            'fromName'   => $data['fromName'] ?? '',
            'fromEmail'  => $data['fromEmail'],
        ]);

        $to = $data['to'] ?? $data['fromEmail'];
        try {
            Mail::mailer('smtp')->raw('SMTP test from your PMS — your mail settings work. ✓', function ($m) use ($to) {
                $m->to($to)->subject('PMS SMTP test');
            });

            return response()->json(['ok' => true, 'to' => $to]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()]);
        }
    }
}
