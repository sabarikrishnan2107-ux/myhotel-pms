<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class GuestRequest extends Model {
    protected $table = 'guest_requests';
    protected $guarded = ['id'];
}
