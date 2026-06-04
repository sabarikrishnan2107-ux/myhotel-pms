<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FolioCharge extends Model {
    protected $table = 'folio_charges';
    protected $guarded = ['id'];
    protected $casts = ['qty'=>'integer','rate'=>'integer','tax'=>'integer','amount'=>'integer'];
}
