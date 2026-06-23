<?php
namespace App\Models\Concerns;
use App\Support\Tenant;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToCompany {
    protected static function bootBelongsToCompany(): void {
        static::addGlobalScope('company', function (Builder $b) {
            $id = Tenant::id();
            if ($id !== null) {
                $b->where($b->getModel()->getTable() . '.company_id', $id);
            }
        });
        static::creating(function ($model) {
            if (($model->company_id ?? null) === null && Tenant::id() !== null) {
                $model->company_id = Tenant::id();
            }
        });
    }
}
