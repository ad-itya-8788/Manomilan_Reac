<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\BrowseTableRequest;
use App\Http\Requests\SuperAdmin\DeleteCandidateRequest;
use App\Http\Requests\SuperAdmin\DeleteRelatedRecordRequest;
use App\Http\Requests\SuperAdmin\RelatedRecordsRequest;
use App\Http\Requests\SuperAdmin\SearchCandidateRequest;
use App\Http\Requests\SuperAdmin\UpdateCandidatePasswordRequest;
use App\Http\Requests\SuperAdmin\UpdateCandidateRequest;
use App\Http\Requests\SuperAdmin\UpdateRelatedRecordRequest;
use App\Services\DatabaseMasterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DatabaseMasterController extends Controller
{
    public function __construct(private readonly DatabaseMasterService $databaseMaster)
    {
    }

    public function search(SearchCandidateRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json([
            'success' => true,
            'data' => $this->databaseMaster->searchCandidates(
                (string) $data['q'],
                (int) ($data['per_page'] ?? 20)
            ),
        ]);
    }

    public function show(int $profile): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->databaseMaster->candidateOverview($profile),
        ]);
    }

    public function update(UpdateCandidateRequest $request, int $profile): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Candidate profile updated.',
            'data' => $this->databaseMaster->updateProfile(
                $profile,
                $request->validated(),
                $request->user()
            ),
        ]);
    }

    public function related(RelatedRecordsRequest $request, int $profile, string $table): JsonResponse
    {
        $data = $request->validated();

        return response()->json([
            'success' => true,
            'data' => $this->databaseMaster->relatedRecords(
                $profile,
                $table,
                (int) ($data['per_page'] ?? 20)
            ),
        ]);
    }

    public function updateRelated(
        UpdateRelatedRecordRequest $request,
        int $profile,
        string $table,
        int $record
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => 'Related record updated.',
            'data' => $this->databaseMaster->updateRelatedRecord(
                $profile,
                $table,
                $record,
                $request->validated()['values'],
                $request->user()
            ),
        ]);
    }

    public function deleteRelated(
        DeleteRelatedRecordRequest $request,
        int $profile,
        string $table,
        int $record
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => 'Related record deleted.',
            'data' => $this->databaseMaster->deleteRelatedRecord(
                $profile,
                $table,
                $record,
                $request->user()
            ),
        ]);
    }

    public function password(UpdateCandidatePasswordRequest $request, int $profile): JsonResponse
    {
        $changed = $this->databaseMaster->changePassword(
            $profile,
            (string) $request->validated()['password'],
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Candidate password changed. Login sessions were revoked.',
            'data' => ['accounts_updated' => $changed],
        ]);
    }

    public function dependencies(int $profile): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->databaseMaster->deletionPlan($profile),
        ]);
    }

    public function destroy(DeleteCandidateRequest $request, int $profile): JsonResponse
    {
        $data = $request->validated();
        if ((int) $data['profile_id'] !== $profile) {
            throw ValidationException::withMessages([
                'profile_id' => 'The confirmation does not match the selected candidate.',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Candidate and verified owned records were permanently deleted.',
            'data' => $this->databaseMaster->deleteCandidate(
                $profile,
                $request->user(),
                $data['reason'] ?? null
            ),
        ]);
    }

    public function tables(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->databaseMaster->listTables(),
        ]);
    }

    public function table(BrowseTableRequest $request, string $table): JsonResponse
    {
        $data = $request->validated();

        return response()->json([
            'success' => true,
            'data' => $this->databaseMaster->browseTable(
                $table,
                $data['q'] ?? null,
                (int) ($data['per_page'] ?? 20)
            ),
        ]);
    }

    public function updateTableRecord(Request $request, string $table): JsonResponse
    {
        $data = $request->validate([
            'primary_key' => ['required', 'string', 'max:64'],
            'record_key' => ['required', 'string', 'max:255'],
            'values' => ['required', 'array', 'min:1', 'max:50'],
            'values.*' => ['nullable'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Database record updated.',
            'data' => $this->databaseMaster->updateTableRecord(
                $table,
                $data['primary_key'],
                $data['record_key'],
                $data['values'],
                $request->user()
            ),
        ]);
    }

    public function deleteTableRecord(Request $request, string $table): JsonResponse
    {
        $data = $request->validate([
            'primary_key' => ['required', 'string', 'max:64'],
            'record_key' => ['required', 'string', 'max:255'],
            'confirm_table' => ['required', 'string', 'max:64'],
        ]);
        if (! hash_equals($table, $data['confirm_table'])) {
            throw ValidationException::withMessages([
                'confirm_table' => 'Type the exact table name to confirm this permanent deletion.',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Database record permanently deleted.',
            'data' => $this->databaseMaster->deleteTableRecord(
                $table,
                $data['primary_key'],
                $data['record_key'],
                $request->user()
            ),
        ]);
    }

    public function audit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->databaseMaster->auditLogs((int) ($data['per_page'] ?? 50)),
        ]);
    }
}
