<?php
// In app/Http/Controllers/Auth/ChangePasswordController.php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class ChangePasswordController extends Controller
{
    public function showChangePasswordForm()
    {
        try {
        $force_change = !Auth::user()->is_password_changed;
        return view('auth.passwords.reset', compact('force_change'));
        } catch (\Throwable $e) {
            if ($e instanceof \Illuminate\Validation\ValidationException
                || $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException
                || $e instanceof \Illuminate\Auth\AuthenticationException
                || $e instanceof \Illuminate\Auth\Access\AuthorizationException
                || $e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                throw $e;
            }

            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Something went wrong. Please try again later.',
            ], 500);
        }
    }

    public function changePassword(Request $request)
    {
        try {
        $user = Auth::user();

        // 1. Validate the input
        $request->validate([
            'new_password' => 'required|min:8|confirmed',
        ]);

        // 3. Update the password
        $user->password = Hash::make($request->new_password);
        $user->is_password_changed = true;
        $user->save();

        if ($user->user_type == '21' && $user->profile_id) {
            return redirect()->route('profiles.editDetails', $user->profile_id)
                ->with('success', 'Password changed successfully!')
                ->with('info', 'Please complete your profile to proceed to search your life partner');
        }

        return redirect()->route('home')->with('success', 'Password changed successfully!');
        } catch (\Throwable $e) {
            if ($e instanceof \Illuminate\Validation\ValidationException
                || $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException
                || $e instanceof \Illuminate\Auth\AuthenticationException
                || $e instanceof \Illuminate\Auth\Access\AuthorizationException
                || $e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                throw $e;
            }

            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Something went wrong. Please try again later.',
            ], 500);
        }
    }
}