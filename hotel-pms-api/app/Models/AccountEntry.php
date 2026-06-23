<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class AccountEntry extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['amount'=>'integer','cgst'=>'integer','sgst'=>'integer','igst'=>'integer','lines'=>'array','attachment'=>'array'];
}
