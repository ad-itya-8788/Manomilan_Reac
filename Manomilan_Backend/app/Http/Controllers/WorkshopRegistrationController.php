<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\WorkshopRegistration;

class WorkshopRegistrationController extends Controller
{

    /**
     * Show Registration Form
     */
    public function create()
    {
        try {
        return view('workshop.register');
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
     * Store Workshop Registration
     */
    public function store(Request $request)
    {
        try {
        $request->validate([
            'full_name'              => 'required|max:150',
            'mobile_number'          => 'required|digits_between:10,15',
            'whatsapp_number'        => 'required|digits_between:10,15',
            'date_of_birth'          => 'required|date',
            'education'              => 'required|max:150',
            'city'                   => 'required|max:100',
            'district'               => 'required|max:100',
            'marital_status'         => 'required',
            'parent_name'            => 'required|max:150',
            'parent_contact_number'  => 'required|digits_between:10,15',
            'payment_screenshot'     => 'required|image|mimes:jpeg,jpg,png|max:4096',
            'transaction_id'         => ['required', 'string', 'regex:/^[A-Za-z0-9]{12,22}$/'],
            'consent'                => 'required'
        ], [
            'transaction_id.regex' => 'Transaction ID / UTR Number must be 12 to 22 letters or numbers, with no spaces or special characters.',
        ]);

        $paymentImage = null;
        if ($request->hasFile('payment_screenshot')) {
            $file = $request->file('payment_screenshot');
            $fileName = time().'_'.$file->getClientOriginalName();
            $file->move(public_path('uploads/workshop_payments'), $fileName);
            $paymentImage = $fileName;
        }

        WorkshopRegistration::create([
            'full_name'             => $request->full_name,
            'mobile_number'         => $request->mobile_number,
            'whatsapp_number'       => $request->whatsapp_number,
            'date_of_birth'         => $request->date_of_birth,
            'education'             => $request->education,
            'city'                  => $request->city,
            'district'              => $request->district,
            'marital_status'        => $request->marital_status,
            'parent_name'           => $request->parent_name,
            'parent_contact_number' => $request->parent_contact_number,
            'payment_screenshot'    => $paymentImage,
            'transaction_id'        => $request->transaction_id,
            'consent'               => 1,
            'status'                => 'Pending'
        ]);
        return redirect()
                ->route('workshop.registration.success')
                ->with('success','Workshop Registration Submitted Successfully.');
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
     * Success Page
     */
    public function success()
    {
        try {
        return view('workshop.success');
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
     * Admin Listing
     */
    public function index(Request $request)
{
    try {
    $query = WorkshopRegistration::query();

    if ($request->filled('name')) {
        $query->where('full_name', 'LIKE', '%' . $request->name . '%');
    }

    if ($request->filled('mobile')) {
        $query->where('mobile_number', 'LIKE', '%' . $request->mobile . '%');
    }

    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }

    if ($request->filled('city')) {
        $query->where('city', 'LIKE', '%' . $request->city . '%');
    }

    if ($request->filled('from_date')) {
        $query->where('created_at', '>=', Carbon::parse($request->from_date)->startOfDay());
    }

    if ($request->filled('to_date')) {
        $query->where('created_at', '<', Carbon::parse($request->to_date)->addDay()->startOfDay());
    }

    $registrations = $query
        ->latest()
        ->paginate(20)
        ->appends($request->all());

    return view(
        'workshop.admin.index',
        compact('registrations')
    );
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
     * Admin View
     */
    public function show($id)
    {
        try {
        $registration = WorkshopRegistration::findOrFail($id);
        return view(
            'workshop.admin.show',
            compact('registration')
        );
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
     * Verify Registration
     */
    public function verify($id)
    {
        try {
        $registration = WorkshopRegistration::findOrFail($id);
        $registration->status = 'Verified';
        $registration->save();
        return back()->with(
            'success',
            'Workshop Registration Verified Successfully.'
        );
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
     * Reject Registration
     */
    public function reject(Request $request,$id)
    {
        try {
        $registration = WorkshopRegistration::findOrFail($id);
        $registration->status = 'Rejected';
        $registration->remarks = $request->remarks;
        $registration->save();
        return back()->with(
            'success',
            'Workshop Registration Rejected.'
        );
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
     * Generate and download workshop payment receipt.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function generateReceipt($id)
    {
        try {
        $registration = WorkshopRegistration::findOrFail($id);

        return view('workshop.admin.receipt', compact('registration'));
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