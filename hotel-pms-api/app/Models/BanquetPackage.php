<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BanquetPackage extends Model {
    protected $table = 'banquet_packages';
    protected $guarded = ['id'];
    protected $casts = ['pricePerPax' => 'integer', 'veg' => 'boolean', 'active' => 'boolean'];
}
