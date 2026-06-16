<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class EInvoice extends Model {
    protected $table = 'einvoices';
    protected $guarded = ['id'];
    protected $casts = ['reverseCharge' => 'boolean', 'signedJson' => 'array'];
}
