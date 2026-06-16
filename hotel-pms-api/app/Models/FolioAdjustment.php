<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FolioAdjustment extends Model {
    protected $table = 'folio_adjustments';
    protected $guarded = ['id'];
    protected $casts = ['amount' => 'integer'];
}
