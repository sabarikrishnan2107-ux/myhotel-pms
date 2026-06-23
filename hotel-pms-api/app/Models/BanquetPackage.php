<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class BanquetPackage extends Model {
    use BelongsToCompany;
    protected $table = 'banquet_packages';
    protected $guarded = ['id'];
    protected $casts = ['pricePerPax' => 'integer', 'veg' => 'boolean', 'active' => 'boolean'];
}
