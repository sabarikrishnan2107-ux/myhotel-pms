<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class NotificationTemplate extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['active'=>'boolean'];
}
