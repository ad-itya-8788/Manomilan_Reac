<?php

namespace App\Support;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

class ApiToken
{
    public const DEFAULT_LIFETIME_SECONDS = 28800;
    public const CANDIDATE_LIFETIME_SECONDS = 2592000;

    public static function create(int $userId, int $lifetimeSeconds = self::DEFAULT_LIFETIME_SECONDS): string
    {
        $expiresAt = time() + $lifetimeSeconds;
        $tokenId = bin2hex(random_bytes(32));
        $token = Crypt::encryptString(json_encode([
            'user_id' => $userId,
            'expires_at' => $expiresAt,
            'token_id' => $tokenId,
        ], JSON_THROW_ON_ERROR));

        DB::table('api_token_sessions')->insert([
            'token_hash' => hash('sha256', $tokenId),
            'user_id' => $userId,
            'expires_at' => date('Y-m-d H:i:s', $expiresAt),
            'created_at' => now(),
        ]);

        return $token;
    }

    public static function userId(string $token): ?int
    {
        $payload = self::decode($token);

        if (! is_array($payload)
            || ! isset($payload['user_id'], $payload['expires_at'])
            || (int) $payload['expires_at'] <= time()
            || (int) $payload['user_id'] < 1) {
            return null;
        }

        if (array_key_exists('token_id', $payload)) {
            if (! is_string($payload['token_id']) || preg_match('/^[a-f0-9]{64}$/', $payload['token_id']) !== 1) {
                return null;
            }

            $active = DB::table('api_token_sessions')
                ->where('token_hash', hash('sha256', $payload['token_id']))
                ->where('user_id', (int) $payload['user_id'])
                ->where('expires_at', '>', now())
                ->exists();

            if (! $active) {
                return null;
            }
        }

        return (int) $payload['user_id'];
    }

    public static function expiresAt(string $token): ?int
    {
        $payload = self::decode($token);

        return is_array($payload) && isset($payload['expires_at'])
            ? (int) $payload['expires_at']
            : null;
    }

    public static function revoke(string $token, int $userId): void
    {
        $payload = self::decode($token);
        $tokenId = $payload['token_id'] ?? null;

        if ((int) ($payload['user_id'] ?? 0) !== $userId
            || ! is_string($tokenId)
            || preg_match('/^[a-f0-9]{64}$/', $tokenId) !== 1) {
            return;
        }

        DB::table('api_token_sessions')
            ->where('token_hash', hash('sha256', $tokenId))
            ->where('user_id', $userId)
            ->delete();
    }

    private static function decode(string $token): ?array
    {
        try {
            $payload = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException $exception) {
            return null;
        }

        return is_array($payload) ? $payload : null;
    }
}
