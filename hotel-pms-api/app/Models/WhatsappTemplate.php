<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class WhatsappTemplate extends Model {
    use BelongsToCompany;
    protected $table = 'whatsapp_templates';
    protected $guarded = ['id'];
    protected $casts = ['buttons'=>'array','usage30d'=>'integer'];
}
