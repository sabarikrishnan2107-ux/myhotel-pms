<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class ChannelSyncLog extends Model {
    use BelongsToCompany;
    protected $table = 'channel_sync_logs';
    protected $guarded = ['id'];
    protected $casts = [];
}
