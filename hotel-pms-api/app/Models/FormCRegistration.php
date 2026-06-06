<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FormCRegistration extends Model {
    protected $table = 'form_c_registrations';
    protected $guarded = ['id'];
    protected $casts = ['reportedToFrro'=>'boolean'];
}
