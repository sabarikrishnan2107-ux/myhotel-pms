<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Process;

/**
 * Real database backups via pg_dump / psql against the configured Postgres.
 */
class BackupController extends Controller
{
    private function dir(): string
    {
        $d = storage_path('app/backups');
        if (! is_dir($d)) {
            mkdir($d, 0777, true);
        }

        return $d;
    }

    private function bin(string $tool): string
    {
        // PostgreSQL 15 client binaries (match the local server).
        return 'C:\\Program Files\\PostgreSQL\\15\\bin\\' . $tool . '.exe';
    }

    private function db(string $key)
    {
        return config("database.connections.pgsql.$key");
    }

    private function meta(string $path): array
    {
        return [
            'name'       => basename($path),
            'size'       => filesize($path),
            'created_at' => date('c', filemtime($path)),
        ];
    }

    /** GET /api/backups — list saved backups, newest first. */
    public function index()
    {
        $files = array_map(fn ($f) => $this->meta($f), glob($this->dir() . DIRECTORY_SEPARATOR . '*.sql') ?: []);
        usort($files, fn ($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return response()->json($files);
    }

    /** POST /api/backups — run pg_dump now. */
    public function run()
    {
        $name = 'backup_' . date('Y-m-d_His') . '.sql';
        $path = $this->dir() . DIRECTORY_SEPARATOR . $name;

        $result = Process::env(['PGPASSWORD' => $this->db('password')])
            ->timeout(180)
            ->run([
                $this->bin('pg_dump'),
                '-U', $this->db('username'),
                '-h', $this->db('host'),
                '-p', (string) $this->db('port'),
                '-d', $this->db('database'),
                '--clean', '--if-exists',
                '-f', $path,
            ]);

        if (! $result->successful()) {
            return response()->json(['message' => 'Backup failed', 'error' => $result->errorOutput()], 500);
        }

        return response()->json($this->meta($path), 201);
    }

    /** GET /api/backups/{file}/download */
    public function download(string $file)
    {
        $path = $this->dir() . DIRECTORY_SEPARATOR . basename($file);
        abort_unless(is_file($path), 404);

        return response()->download($path);
    }

    /** POST /api/backups/{file}/restore — restore the database from a backup. */
    public function restore(string $file)
    {
        $path = $this->dir() . DIRECTORY_SEPARATOR . basename($file);
        abort_unless(is_file($path), 404);

        $result = Process::env(['PGPASSWORD' => $this->db('password')])
            ->timeout(180)
            ->run([
                $this->bin('psql'),
                '-U', $this->db('username'),
                '-h', $this->db('host'),
                '-p', (string) $this->db('port'),
                '-d', $this->db('database'),
                '-f', $path,
            ]);

        if (! $result->successful()) {
            return response()->json(['message' => 'Restore failed', 'error' => $result->errorOutput()], 500);
        }

        return response()->json(['message' => 'Database restored from ' . basename($file)]);
    }
}
