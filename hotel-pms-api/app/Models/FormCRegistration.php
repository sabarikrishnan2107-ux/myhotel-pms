<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class FormCRegistration extends Model {
    use BelongsToCompany;
    protected $table = 'form_c_registrations';
    protected $guarded = ['id'];
    protected $casts = ['reportedToFrro'=>'boolean'];
}
