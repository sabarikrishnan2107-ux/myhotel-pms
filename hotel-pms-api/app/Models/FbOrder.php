<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class FbOrder extends Model {
    use BelongsToCompany;
    protected $table = 'fb_orders';
    protected $guarded = ['id'];
    protected $casts = ['items'=>'array','total'=>'integer'];
}
