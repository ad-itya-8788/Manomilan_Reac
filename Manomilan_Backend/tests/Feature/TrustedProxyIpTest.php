<?php

namespace Tests\Feature;

use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Tests\TestCase;

class TrustedProxyIpTest extends TestCase
{
    public function test_untrusted_forwarded_ip_header_is_ignored(): void
    {
        $middleware = $this->trustProxyMiddleware(['10.0.0.10']);
        $request = Request::create('/', 'GET', [], [], [], [
            'REMOTE_ADDR' => '198.51.100.20',
            'HTTP_X_FORWARDED_FOR' => '203.0.113.99',
        ]);

        $middleware->handle($request, fn () => response()->noContent());

        $this->assertSame('198.51.100.20', $request->ip());
    }

    public function test_configured_proxy_forwards_the_visitors_ip(): void
    {
        $middleware = $this->trustProxyMiddleware(['10.0.0.10']);
        $request = Request::create('/', 'GET', [], [], [], [
            'REMOTE_ADDR' => '10.0.0.10',
            'HTTP_X_FORWARDED_FOR' => '198.51.100.20',
        ]);

        $middleware->handle($request, fn () => response()->noContent());

        $this->assertSame('198.51.100.20', $request->ip());
    }

    private function trustProxyMiddleware(array $proxies): TrustProxies
    {
        return new class($proxies) extends TrustProxies
        {
            protected $headers = Request::HEADER_X_FORWARDED_FOR;

            public function __construct(private readonly array $trustedAddresses)
            {
            }

            protected function proxies()
            {
                return $this->trustedAddresses;
            }
        };
    }
}
