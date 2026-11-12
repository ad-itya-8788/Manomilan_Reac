<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class DatabaseTransaction
{
    public function handle(Request $request, Closure $next)
    {
        DB::beginTransaction();

        try {
            $response = $next($request);

            if ($response->getStatusCode() >= 400) {
                DB::rollBack();
            } else {
                DB::commit();
            }

            return $response;
        } catch (Throwable $exception) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            throw $exception;
        }
    }
}
