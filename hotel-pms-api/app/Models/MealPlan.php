<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MealPlan extends Model {
    protected $table = 'meal_plans';
    protected $guarded = ['id'];
    protected $casts = ['perPaxPerDay' => 'integer', 'active' => 'boolean'];
}
