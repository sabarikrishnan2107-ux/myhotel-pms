<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class HousekeepingTaskPhoto extends Model {
    use BelongsToCompany;
    protected $table = 'housekeeping_task_photos';
    protected $guarded = ['id'];
    protected $casts = [
        'taskId' => 'integer',
        'uploadedByUserId' => 'integer',
    ];
}
