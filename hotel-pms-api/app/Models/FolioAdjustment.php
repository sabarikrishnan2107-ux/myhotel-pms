<?php
namespace App\Models;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class FolioAdjustment extends Model {
    use BelongsToCompany;
    protected $table = 'folio_adjustments';
    protected $guarded = ['id'];
    protected $casts = ['amount' => 'integer'];
}
