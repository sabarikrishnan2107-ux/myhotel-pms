<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ChannelRateMap extends Model {
    protected $table = 'channel_rate_maps';
    protected $guarded = ['id'];
    protected $casts = ['pms'=>'integer','bdc'=>'integer','agoda'=>'integer','expedia'=>'integer'];
}
