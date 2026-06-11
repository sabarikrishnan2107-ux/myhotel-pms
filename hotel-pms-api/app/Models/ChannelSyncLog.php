<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ChannelSyncLog extends Model {
    protected $table = 'channel_sync_logs';
    protected $guarded = ['id'];
    protected $casts = [];
}
