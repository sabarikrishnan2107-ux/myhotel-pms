<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class GroupService extends Model {
    use BelongsToCompany;
    protected $table = 'group_services';
    protected $guarded = ['id'];
    protected $casts = ['perPax' => 'boolean', 'active' => 'boolean', 'price' => 'integer', 'gst' => 'integer'];
}
