<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TableWaitlistEntry extends Model
{
    protected $table = 'table_waitlist_entries';
    protected $guarded = ['id'];
    protected $casts = ['party' => 'integer', 'waitMin' => 'integer', 'notified' => 'boolean'];
}
