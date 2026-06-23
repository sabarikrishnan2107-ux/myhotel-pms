<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class AppUser extends Model {
    use BelongsToCompany;
    protected $table = 'app_users';
    protected $guarded = ['id'];
    protected $casts = ['twoFA'=>'boolean'];
}
