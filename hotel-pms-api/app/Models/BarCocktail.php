<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BarCocktail extends Model {
    protected $table = 'bar_cocktails';
    protected $guarded = ['id'];
    protected $casts = ['menuPrice'=>'integer','glassCost'=>'integer','recipe'=>'array'];
}
