<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class ServiceItem extends Model {
    use BelongsToCompany;
    protected $table = 'service_items';
    protected $guarded = ['id'];
    protected $casts = ['price' => 'integer', 'active' => 'boolean'];
}
