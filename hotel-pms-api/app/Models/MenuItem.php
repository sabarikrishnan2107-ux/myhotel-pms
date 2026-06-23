<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class MenuItem extends Model {
    use BelongsToCompany;
    protected $table = 'menu_items';
    protected $guarded = ['id'];
    protected $casts = ['veg'=>'boolean','price'=>'integer'];
}
