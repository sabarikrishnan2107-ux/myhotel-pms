<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class NotifLog extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
}
