<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class MaintenanceTicket extends Model {
    use BelongsToCompany;
    protected $table = 'maintenance_tickets';
    protected $guarded = ['id'];
    protected $casts = [
        'photos'        => 'array',
        'photos_before' => 'array',
        'photos_after'  => 'array',
        'parts'         => 'array',
    ];
}
