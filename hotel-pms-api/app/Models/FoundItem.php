<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FoundItem extends Model {
    protected $table = 'found_items';
    protected $guarded = ['id'];
    protected $casts = ['timeline'=>'array','photos'=>'array','hvi'=>'boolean','qty'=>'integer','value'=>'integer','daysHeld'=>'integer'];
}
