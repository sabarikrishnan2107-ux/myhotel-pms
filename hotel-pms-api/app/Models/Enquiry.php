<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Enquiry extends Model {
    protected $guarded = ['id'];
    protected $casts = ['followUps'=>'array','thankYouSent'=>'boolean','vip'=>'boolean','roomNights'=>'integer','roomCount'=>'integer','guestCount'=>'integer','budget'=>'integer','quotedAmount'=>'integer'];
}
