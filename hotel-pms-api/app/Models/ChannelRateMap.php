<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class ChannelRateMap extends Model {
    use BelongsToCompany;
    protected $table = 'channel_rate_maps';
    protected $guarded = ['id'];
    protected $casts = ['pms'=>'integer','bdc'=>'integer','agoda'=>'integer','expedia'=>'integer'];
}
