<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class GstReturn extends Model {
    use BelongsToCompany;
    protected $table = 'gst_returns';
    protected $guarded = ['id'];
    protected $casts = [
        'taxable' => 'integer',
        'igst'    => 'integer',
        'cgst'    => 'integer',
        'sgst'    => 'integer',
    ];
}
