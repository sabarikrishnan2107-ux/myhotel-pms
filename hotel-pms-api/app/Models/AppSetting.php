<?php
namespace App\Models;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class AppSetting extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['value'=>'array'];
}
