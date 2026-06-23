<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class AuditRun extends Model {
    use BelongsToCompany;
    protected $table = 'audit_runs';
    protected $guarded = ['id'];
    protected $casts = [
        'occupancy'    => 'integer',
        'revenue'      => 'integer',
        'noShows'      => 'integer',
        'cashVariance' => 'integer',
        'anomalies'    => 'array',
        'irn'          => 'boolean',
        'backup'       => 'boolean',
        'steps'        => 'array',
    ];
}
