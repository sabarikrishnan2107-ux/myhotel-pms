<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ExtraService extends Model {
    protected $table = 'extra_services';
    protected $guarded = ['id'];
    protected $casts = ['price' => 'integer', 'active' => 'boolean'];
}
