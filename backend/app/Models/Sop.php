<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sop extends Model
{
    protected $fillable = ['code', 'title', 'category', 'version', 'status', 'summary', 'drive_url'];
}
