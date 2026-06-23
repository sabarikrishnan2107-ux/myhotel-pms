<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class Enquiry extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['followUps'=>'array','thankYouSent'=>'boolean','vip'=>'boolean','roomNights'=>'integer','roomCount'=>'integer','guestCount'=>'integer','budget'=>'integer','quotedAmount'=>'integer'];
}
