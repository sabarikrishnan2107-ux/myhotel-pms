<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class LinenItem extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['issued'=>'integer','returned'=>'integer','wastage'=>'integer','inUse'=>'integer'];
}
