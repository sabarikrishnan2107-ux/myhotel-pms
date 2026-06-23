<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class BarCocktail extends Model {
    use BelongsToCompany;
    protected $table = 'bar_cocktails';
    protected $guarded = ['id'];
    protected $casts = ['menuPrice'=>'integer','glassCost'=>'integer','recipe'=>'array'];
}
