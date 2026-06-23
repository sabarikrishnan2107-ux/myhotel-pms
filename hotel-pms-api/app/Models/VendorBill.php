<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class VendorBill extends Model {
    use BelongsToCompany;
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
