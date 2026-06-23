<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class EmailSchedule extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['recipients'=>'array','sections'=>'array','enabled'=>'boolean'];
}
