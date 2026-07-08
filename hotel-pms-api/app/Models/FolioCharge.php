<?php
namespace App\Models;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class FolioCharge extends Model {
    use BelongsToCompany;
    protected $table = 'folio_charges';
    protected $guarded = ['id'];
    protected $casts = ['qty'=>'integer','rate'=>'integer','tax'=>'integer','amount'=>'integer','items'=>'array'];
}
