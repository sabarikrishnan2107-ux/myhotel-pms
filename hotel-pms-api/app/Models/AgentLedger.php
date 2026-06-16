<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AgentLedger extends Model
{
    protected $table = 'agent_ledgers';

    protected $guarded = ['id'];

    protected $casts = [
        'debit'   => 'integer',
        'credit'  => 'integer',
        'balance' => 'integer',
    ];
}
