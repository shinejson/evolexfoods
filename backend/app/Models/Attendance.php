<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    protected $table = 'attendance';

    protected $fillable = [
        'employee_id', 'work_date', 'time_in', 'time_out',
        'status', 'overtime_hours', 'notes',
    ];

    protected function casts(): array
    {
        return ['work_date' => 'date', 'overtime_hours' => 'decimal:2'];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
