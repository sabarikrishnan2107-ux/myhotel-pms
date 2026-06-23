<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class EInvoice extends Model {
    use BelongsToCompany;
    protected $table = 'einvoices';
    protected $guarded = ['id'];
    protected $casts = ['reverseCharge' => 'boolean', 'signedJson' => 'array'];
}
