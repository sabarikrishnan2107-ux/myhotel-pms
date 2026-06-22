<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VendorBill extends Model {
    protected $table = 'vendor_bills';
    protected $guarded = ['id'];
    protected $casts = [
        'taxableValue' => 'integer',
        'gst' => 'integer',
        'tdsRate' => 'integer',
        'tdsAmount' => 'integer',
        'netPayable' => 'integer',
        'paid' => 'integer',
    ];
}
