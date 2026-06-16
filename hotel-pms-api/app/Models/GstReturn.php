<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class GstReturn extends Model {
    protected $table = 'gst_returns';
    protected $guarded = ['id'];
    protected $casts = [
        'taxable' => 'integer',
        'igst'    => 'integer',
        'cgst'    => 'integer',
        'sgst'    => 'integer',
    ];
}
