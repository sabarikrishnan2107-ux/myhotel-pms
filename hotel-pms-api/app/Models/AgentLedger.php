<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;

class AgentLedger extends Model
{
    use BelongsToCompany;
    protected $table = 'agent_ledgers';

    protected $guarded = ['id'];

    protected $casts = [
        'debit'   => 'integer',
        'credit'  => 'integer',
        'balance' => 'integer',
    ];
}
