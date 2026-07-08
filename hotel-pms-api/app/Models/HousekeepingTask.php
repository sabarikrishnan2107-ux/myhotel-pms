<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToCompany;
class HousekeepingTask extends Model {
    use BelongsToCompany;
    protected $table = 'housekeeping_tasks';
    protected $guarded = ['id'];
    protected $casts = [
        'roomId' => 'integer',
        'floor' => 'integer',
        'assignedToUserId' => 'integer',
        'assignedByUserId' => 'integer',
        'durationMin' => 'integer',
    ];

    public function photos(): HasMany {
        return $this->hasMany(HousekeepingTaskPhoto::class, 'taskId', 'id');
    }
}
