<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class ExtraService extends Model {
    use BelongsToCompany;
    protected $table = 'extra_services';
    protected $guarded = ['id'];
    protected $casts = ['price' => 'integer', 'active' => 'boolean'];
}
