<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class WebRoom extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['price'=>'integer','published'=>'boolean'];
}
