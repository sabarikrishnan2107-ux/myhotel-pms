<?php
namespace App\Models;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class FolioPayment extends Model {
    use BelongsToCompany;
    protected $table = 'folio_payments';
    protected $guarded = ['id'];
    protected $casts = ['amount'=>'integer'];
}
