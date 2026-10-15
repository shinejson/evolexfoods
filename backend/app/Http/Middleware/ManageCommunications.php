<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ManageCommunications
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        abort_unless($user && $user->status === 'active' && (
            in_array(strtolower($user->role), ['owner', 'ceo', 'admin'], true)
            || ($user->roleModel?->is_active && $user->hasPermission('settings.system_config'))
        ), 403, 'Only administrators may manage communication settings and outbound messages.');

        return $next($request);
    }
}
