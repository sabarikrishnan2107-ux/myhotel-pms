<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class Channel extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['bookings'=>'integer','commission'=>'integer','rev'=>'integer'];
}
