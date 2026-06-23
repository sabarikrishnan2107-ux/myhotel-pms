<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class HousekeepingTask extends Model {
    use BelongsToCompany;
    protected $table = 'housekeeping_tasks';
    protected $guarded = ['id'];
}
