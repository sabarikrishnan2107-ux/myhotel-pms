<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class Webhook extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
}
