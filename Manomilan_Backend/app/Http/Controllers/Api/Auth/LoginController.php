<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiToken;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Throwable;

class LoginController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $login = trim($credentials['username']);

        try {
            $user = User::where('username', $login)
                ->orWhere('email', $login)
                ->first();

            if (! $user || ! Hash::check($credentials['password'], $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid username or password.',
                ], 401);
            }

            if (in_array(strtolower(trim((string) $user->status)), ['inactive', '0'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your account has been deactivated. Please contact the administrator.',
                ], 403);
            }

            $user->load('role');
            if (! $user->role || $user->role->is_active === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your assigned role is inactive. Please contact the administrator.',
                ], 403);
            }

            $tokenLifetime = $user->portal() === 'candidate'
                ? ApiToken::CANDIDATE_LIFETIME_SECONDS
                : ApiToken::DEFAULT_LIFETIME_SECONDS;
            $token = ApiToken::create((int) $user->id, $tokenLifetime);
            $expiresAt = ApiToken::expiresAt($token);
            $user->setAttribute('portal', $user->portal());
            $this->auditLogger->log($user, 'auth.login', 'authentication_security', 'User', $user->id, $user->profile_id, [], []);

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'token' => $token,
                'expires_at' => $expiresAt,
                'user' => $user->load('profile'),
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Unable to sign in right now. Please try again.',
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            $user = $request->user();
            $token = $request->bearerToken();
            if ($user && $token) {
                ApiToken::revoke($token, (int) $user->id);
            }

            return response()->json(['success' => true, 'message' => 'Logged out successfully']);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Unable to log out right now.',
            ], 500);
        }
    }
}
