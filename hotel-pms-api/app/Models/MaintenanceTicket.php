<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MaintenanceTicket extends Model {
    protected $table = 'maintenance_tickets';
    protected $guarded = ['id'];
}
