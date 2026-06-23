<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class FoundItem extends Model {
    use BelongsToCompany;
    protected $table = 'found_items';
    protected $guarded = ['id'];
    protected $casts = ['timeline'=>'array','photos'=>'array','hvi'=>'boolean','qty'=>'integer','value'=>'integer','daysHeld'=>'integer'];
}
