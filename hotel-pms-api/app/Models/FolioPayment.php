<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FolioPayment extends Model {
    protected $table = 'folio_payments';
    protected $guarded = ['id'];
    protected $casts = ['amount'=>'integer'];
}
