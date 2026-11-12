<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Profile;
use App\DocumentVerification;

class DocumentVerificationController extends Controller
{
    
    public function index(Profile $profile)
    {
        try {
        // Find or create a verification record for the given profile
        $verification = DocumentVerification::firstOrCreate(['profile_id' => $profile->id]);
        
        return view('verify-documents', compact('profile', 'verification'));
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

    /**
     * Store the document verification status and remarks.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Profile  $profile
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request, Profile $profile)
    {
        try {
        // Define the validation rules based on your form fields
        $rules = [
            'identificationProof_status' => 'required|in:verified,rejected,not_eligible',
            'identificationProof_remarks' => 'nullable|string|max:255',
            'birthDateProof_status' => 'required|in:verified,rejected,not_eligible',
            'birthDateProof_remarks' => 'nullable|string|max:255',
            'addressProof_status' => 'required|in:verified,rejected,not_eligible',
            'addressProof_remarks' => 'nullable|string|max:255',
            'educationProof_status' => 'required|in:verified,rejected,not_eligible',
            'educationProof_remarks' => 'nullable|string|max:255',
            'professionProof_status' => 'required|in:verified,rejected,not_eligible',
            'professionProof_remarks' => 'nullable|string|max:255',
            'incomeProof_status' => 'required|in:verified,rejected,not_eligible',
            'incomeProof_remarks' => 'nullable|string|max:255',
            'casteCertificate_status' => 'required|in:verified,rejected,not_eligible',
            'casteCertificate_remarks' => 'nullable|string|max:255',
            'medicalFitnessCertificate_status' => 'required|in:verified,rejected,not_eligible',
            'medicalFitnessCertificate_remarks' => 'nullable|string|max:255',
            'selfieVerification_status' => 'required|in:verified,rejected,not_eligible',
            'selfieVerification_remarks' => 'nullable|string|max:255',
        ];

        // Validate the request data
        $request->validate($rules);

        DB::transaction(function () use ($profile, $request, $rules) {
            // Find or create the document verification record
            $verification = DocumentVerification::updateOrCreate(
                ['profile_id' => $profile->id],
                $request->only(array_keys($rules)) // Get only the validated fields
            );

            $profile->syncDocumentVerificationStatus();
        });

        return redirect()->back()->with('success', 'Document verification updated successfully!');
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