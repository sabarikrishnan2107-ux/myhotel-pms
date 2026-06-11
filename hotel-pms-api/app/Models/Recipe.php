<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Recipe extends Model {
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
