<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::call(fn () => app(\App\Support\WebsiteSettingsService::class)->forget())
    ->everyMinute()
    ->timezone('Asia/Kolkata')
    ->name('website-availability-cache');

Schedule::call(fn () => \Illuminate\Support\Facades\DB::table('api_token_sessions')->where('expires_at', '<=', now())->delete())
    ->dailyAt('02:30')
    ->timezone('Asia/Kolkata')
    ->name('expired-api-token-sessions');
