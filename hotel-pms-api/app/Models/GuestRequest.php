<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class GuestRequest extends Model {
    use BelongsToCompany;
    protected $table = 'guest_requests';
    protected $guarded = ['id'];
}
