<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AccountEntry extends Model {
    protected $guarded = ['id'];
    protected $casts = ['amount'=>'integer','cgst'=>'integer','sgst'=>'integer','igst'=>'integer','lines'=>'array','attachment'=>'array'];
}
