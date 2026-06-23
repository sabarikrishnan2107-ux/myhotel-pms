<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class Recipe extends Model {
    use BelongsToCompany;
    protected $table = 'recipes';
    protected $guarded = ['id'];
    protected $casts = [
        'menuPrice'   => 'integer',
        'portions'    => 'integer',
        'prepMin'     => 'integer',
        'cookMin'     => 'integer',
        'labour'      => 'integer',
        'overhead'    => 'integer',
        'ingredients' => 'array',
        'allergens'   => 'array',
        'nutrition'   => 'array',
    ];
}
