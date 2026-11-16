import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Database,
  Eye,
  History,
  KeyRound,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Table2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { request } from "../../../api";
import "../../components/admin-ui.css";
import "./databaseMaster.css";

const TABS = [
  { key: "overview", label: "Candidate overview", icon: UserRound },
  { key: "related", label: "Related records", icon: Eye },
  { key: "tables", label: "All database tables", icon: Table2 },
  { key: "password", label: "Password", icon: KeyRound },
  { key: "delete", label: "Permanent deletion", icon: Trash2 },
  { key: "audit", label: "Audit log", icon: History },
];

const PROFILE_FIELDS = [
  "full_name",
  "email",
  "phone",
  "groomorbride",
  "birth_date",
  "birth_time",
  "birth_place",
  "marital_status",
  "height_cm",
  "weight_kg",
  "blood_group",
  "mother_tongue",
  "status",
  "verification_status",
  "about_me",
  "special_cases",
  "monthly_income",
  "annual_income",
  "profile_photo",
  "full_body_photo",
  "half_body_photo",
  "selfie_photo",
];

const NUMERIC_FIELDS = new Set(["height_cm", "weight_kg", "monthly_income", "annual_income"]);

const messageFrom = (error) =>
  error?.status === 403
    ? "Super administrator access is required."
    : error?.message || "Request failed.";

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const dateValue = (value) => (value ? String(value).slice(0, 10) : "");

const formFromProfile = (profile) => {
  const form = {};
  PROFILE_FIELDS.forEach((field) => {
    form[field] = profile?.[field] ?? "";
  });
  form.birth_date = dateValue(form.birth_date);
  if (form.birth_time) form.birth_time = String(form.birth_time).slice(0, 8);
  return form;
};

function Pagination({ meta, onPage }) {
  if (!meta || Number(meta.last_page) <= 1) return null;

  return (
    <div className="dbm-pagination">
      <button
        type="button"
        className="dbm-button dbm-button-quiet"
        disabled={Number(meta.current_page) <= 1}
        onClick={() => onPage(Number(meta.current_page) - 1)}
      >
        Previous
      </button>
      <span>
        Page {meta.current_page} of {meta.last_page} · {meta.total} records
      </span>
      <button
        type="button"
        className="dbm-button dbm-button-quiet"
        disabled={Number(meta.current_page) >= Number(meta.last_page)}
        onClick={() => onPage(Number(meta.current_page) + 1)}
      >
        Next
      </button>
    </div>
  );
}

function RecordTable({ columns, rows, onEditRow, onDeleteRow, deletingRecordId }) {
  const visibleColumns = useMemo(() => {
    if (columns?.length) {
      return columns.map((column) => (typeof column === "string" ? column : column.name));
    }
    return rows?.[0] ? Object.keys(rows[0]) : [];
  }, [columns, rows]);

  if (!rows?.length) {
    return <p className="dbm-empty">No records found for this view.</p>;
  }

  return (
    <div className="dbm-table-wrap">
      <table className="dbm-table">
        <thead>
          <tr>
            {visibleColumns.map((column) => (
              <th key={column}>{column}</th>
            ))}
            {onEditRow || onDeleteRow ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? index}>
              {visibleColumns.map((column) => (
                <td key={column}>{displayValue(row[column])}</td>
              ))}
              {onEditRow || onDeleteRow ? (
                <td>
                  <div className="dbm-row-actions">
                    {onEditRow ? (
                      <button
                        type="button"
                        className="dbm-row-action"
                        onClick={() => onEditRow(row)}
                        disabled={row.id === null || row.id === undefined || deletingRecordId !== null}
                        aria-label={`Edit record ${row.id ?? ""}`}
                        title="Edit record"
                      >
                        <Pencil size={14} />
                      </button>
                    ) : null}
                    {onDeleteRow ? (
                      <button
                        type="button"
                        className="dbm-row-action is-danger"
                        onClick={() => onDeleteRow(row)}
                        disabled={row.id === null || row.id === undefined || deletingRecordId !== null}
                        aria-label={`Delete record ${row.id ?? ""}`}
                        title="Delete record"
                      >
                        {deletingRecordId === row.id
                          ? <RefreshCw size={14} className="dbm-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DatabaseMaster() {
  const [tab, setTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchData, setSearchData] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [editForm, setEditForm] = useState(() => formFromProfile(null));
  const [savingProfile, setSavingProfile] = useState(false);
  const [relatedData, setRelatedData] = useState(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [editingRelatedRecord, setEditingRelatedRecord] = useState(null);
  const [relatedEditValues, setRelatedEditValues] = useState({});
  const [savingRelatedRecord, setSavingRelatedRecord] = useState(false);
  const [deletingRelatedRecordId, setDeletingRelatedRecordId] = useState(null);
  const [tables, setTables] = useState([]);
  const [tableFilter, setTableFilter] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [tableData, setTableData] = useState(null);
  const [tableQuery, setTableQuery] = useState("");
  const [tableLoading, setTableLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", password_confirmation: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletionPlan, setDeletionPlan] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOverview = useCallback(async (id) => {
    setLoadingOverview(true);
    setError("");
    try {
      const response = await request(`/database-master/candidates/${id}`);
      setOverview(response.data);
      setEditForm(formFromProfile(response.data?.profile));
      setDeletionPlan(response.data?.deletion_plan || null);
      setConfirmText("");
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const runSearch = useCallback(async (page = 1, term = searchQuery) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) {
      setError("Enter a name, registration number, mobile, email, or unique ID to search.");
      return;
    }

    setSearching(true);
    setError("");
    setNotice("");
    try {
      const response = await request(
        `/database-master/search?q=${encodeURIComponent(cleanTerm)}&page=${page}&per_page=20`,
      );
      setSearchData(response.data);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const selectTab = useCallback((nextTab) => {
    setTab(nextTab);
    setError("");
    setNotice("");

    if (nextTab === "tables" && tables.length === 0) {
      request("/database-master/tables")
        .then((response) => setTables(response.data?.tables || []))
        .catch((requestError) => setError(messageFrom(requestError)));
    }

    if (nextTab === "audit") {
      setAuditLoading(true);
      request("/database-master/audit-logs?per_page=50")
        .then((response) => setAuditData(response.data))
        .catch((requestError) => setError(messageFrom(requestError)))
        .finally(() => setAuditLoading(false));
    }
  }, [tables.length]);

  const openCandidate = async (id) => {
    setSelectedId(id);
    setTab("overview");
    setRelatedData(null);
    setEditingRelatedRecord(null);
    setDeletionPlan(null);
    setConfirmText("");
    setDeleteReason("");
    setPasswordForm({ password: "", password_confirmation: "" });
    setNotice("");
    await loadOverview(id);
  };

  const loadRelated = async (table, page = 1) => {
    if (!selectedId) return;
    setEditingRelatedRecord(null);
    setRelatedLoading(true);
    setError("");
    try {
      const response = await request(
        `/database-master/candidates/${selectedId}/related/${encodeURIComponent(table)}?page=${page}&per_page=20`,
      );
      setRelatedData(response.data);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setRelatedLoading(false);
    }
  };

  const startRelatedEdit = (record) => {
    const values = {};
    (relatedData?.editable_columns || []).forEach((column) => {
      const value = record[column.name];
      if (column.type === "boolean") {
        values[column.name] = value === true || value === 1 || value === "1";
      } else if (value === null || value === undefined) {
        values[column.name] = "";
      } else if (column.type === "date") {
        values[column.name] = String(value).slice(0, 10);
      } else if (typeof value === "object") {
        values[column.name] = JSON.stringify(value, null, 2);
      } else {
        values[column.name] = String(value);
      }
    });
    setRelatedEditValues(values);
    setEditingRelatedRecord(record);
    setError("");
    setNotice("");
  };

  const saveRelatedRecord = async (event) => {
    event.preventDefault();
    if (!selectedId || !relatedData?.table || !editingRelatedRecord?.id) return;

    const values = {};
    for (const column of relatedData.editable_columns || []) {
      const currentValue = relatedEditValues[column.name];
      const originalValue = editingRelatedRecord[column.name];
      const originalFormValue = column.type === "boolean"
        ? originalValue === true || originalValue === 1 || originalValue === "1"
        : originalValue === null || originalValue === undefined
          ? ""
          : column.type === "date"
            ? String(originalValue).slice(0, 10)
            : typeof originalValue === "object"
              ? JSON.stringify(originalValue, null, 2)
              : String(originalValue);

      if (currentValue === originalFormValue) continue;

      if (column.type === "json" && currentValue !== "") {
        try {
          JSON.parse(currentValue);
        } catch {
          setError(`${column.name.replace(/_/g, " ")} must contain valid JSON.`);
          return;
        }
      }
      values[column.name] = column.type === "boolean"
        ? Boolean(currentValue)
        : currentValue === ""
          ? null
          : currentValue;
    }

    if (Object.keys(values).length === 0) {
      setNotice("No changes to save.");
      setEditingRelatedRecord(null);
      return;
    }

    setSavingRelatedRecord(true);
    setError("");
    setNotice("");
    try {
      const response = await request(
        `/database-master/candidates/${selectedId}/related/${encodeURIComponent(relatedData.table)}/${editingRelatedRecord.id}`,
        { method: "PUT", body: { values } },
      );
      setNotice(response.message || "Related record updated.");
      setEditingRelatedRecord(null);
      await loadRelated(relatedData.table, relatedData.records?.current_page || 1);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setSavingRelatedRecord(false);
    }
  };

  const deleteRelatedRecord = async (record) => {
    if (!selectedId || !relatedData?.table || record?.id === null || record?.id === undefined) return;

    const sharedWarning = relatedData.strategy === "ambiguous"
      ? " This record may be shared with other candidates; deleting it can affect them too."
      : "";
    if (!window.confirm(`Permanently delete record #${record.id} from ${relatedData.table}?${sharedWarning}`)) {
      return;
    }

    setDeletingRelatedRecordId(record.id);
    setError("");
    setNotice("");
    try {
      const response = await request(
        `/database-master/candidates/${selectedId}/related/${encodeURIComponent(relatedData.table)}/${record.id}`,
        { method: "DELETE", body: { confirm: "DELETE" } },
      );
      setNotice(response.message || "Related record deleted.");
      const currentPage = Number(relatedData.records?.current_page) || 1;
      const nextPage = relatedData.records?.data?.length === 1 && currentPage > 1
        ? currentPage - 1
        : currentPage;
      await loadRelated(relatedData.table, nextPage);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setDeletingRelatedRecordId(null);
    }
  };

  const loadTable = async (table, page = 1, term = tableQuery) => {
    setSelectedTable(table);
    setTableLoading(true);
    setError("");
    try {
      const response = await request(
        `/database-master/tables/${encodeURIComponent(table)}?page=${page}&per_page=25&q=${encodeURIComponent(term)}`,
      );
      setTableData(response.data);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setTableLoading(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!selectedId) return;

    const payload = {};
    PROFILE_FIELDS.forEach((field) => {
      const value = editForm[field];
      if (NUMERIC_FIELDS.has(field)) {
        payload[field] = value === "" || value === null ? null : Number(value);
      } else {
        payload[field] = value === "" ? null : value;
      }
    });

    setSavingProfile(true);
    setError("");
    setNotice("");
    try {
      await request(`/database-master/candidates/${selectedId}`, {
        method: "PUT",
        body: payload,
      });
      setNotice("Candidate profile saved.");
      await loadOverview(selectedId);
      if (searchData) await runSearch(searchData.current_page || 1);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (!selectedId) return;

    setChangingPassword(true);
    setError("");
    setNotice("");
    try {
      await request(`/database-master/candidates/${selectedId}/password`, {
        method: "POST",
        body: passwordForm,
      });
      setPasswordForm({ password: "", password_confirmation: "" });
      setNotice("Password changed. Existing login sessions for this candidate were revoked.");
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setChangingPassword(false);
    }
  };

  const previewDeletion = async () => {
    if (!selectedId) return;
    setLoadingPlan(true);
    setError("");
    setNotice("");
    try {
      const response = await request(`/database-master/candidates/${selectedId}/dependencies`);
      setDeletionPlan(response.data);
      setConfirmText("");
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setLoadingPlan(false);
    }
  };

  const deleteCandidate = async () => {
    if (!selectedId || !deletionPlan?.can_delete || confirmText !== "DELETE") return;
    if (!window.confirm("Permanently delete this candidate and all exclusively owned records? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError("");
    setNotice("");
    try {
      const response = await request(`/database-master/candidates/${selectedId}`, {
        method: "DELETE",
        body: {
          confirm: "DELETE",
          profile_id: selectedId,
          reason: deleteReason,
        },
      });
      setNotice(response.message || "Candidate deleted.");
      setSelectedId(null);
      setOverview(null);
      setRelatedData(null);
      setDeletionPlan(null);
      setConfirmText("");
      setDeleteReason("");
      if (searchData) await runSearch(searchData.current_page || 1);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setDeleting(false);
    }
  };

  const filteredTables = useMemo(() => {
    const term = tableFilter.trim().toLowerCase();
    if (!term) return tables;
    return tables.filter((table) => table.name.toLowerCase().includes(term));
  }, [tables, tableFilter]);

  const relatedItems = overview?.deletion_plan?.items || [];

  return (
    <AdminLayout currentPath="/admin/database-master" contentClassName="dbm-content">
      <div className="dbm-page">
        <header className="dbm-heading">
          <div>
            <span className="dbm-eyebrow">
              <Database size={16} /> Super Admin only
            </span>
            <h1>Database Master</h1>
            <p>Search candidates, inspect verified relationships, edit known fields, and manage deletion safely.</p>
          </div>
          <div className="dbm-heading-badge">
            <AlertTriangle size={18} />
            Sensitive area
          </div>
        </header>

        {error ? <div className="dbm-alert dbm-alert-error" role="alert">{error}</div> : null}
        {notice ? <div className="dbm-alert dbm-alert-success" role="status">{notice}</div> : null}

        <section className="dbm-search-card">
          <form className="dbm-search-form" onSubmit={(event) => { event.preventDefault(); runSearch(1); }}>
            <label htmlFor="dbm-search">Find a candidate</label>
            <div className="dbm-search-row">
              <Search size={18} />
              <input
                id="dbm-search"
                type="search"
                value={searchQuery}
                placeholder="Name, registration number, mobile, email, unique ID, or profile ID"
                onChange={(event) => setSearchQuery(event.target.value)}
                maxLength={100}
              />
              <button type="submit" className="dbm-button dbm-button-primary" disabled={searching}>
                {searching ? <RefreshCw className="dbm-spin" size={17} /> : <Search size={17} />}
                Search
              </button>
            </div>
          </form>
          <p className="dbm-hint">
            Results are paginated. Select a candidate before loading detailed related records.
          </p>
        </section>

        <div className="dbm-workspace">
          <aside className="dbm-results">
            <div className="dbm-results-head">
              <h2>Search results</h2>
              <span>{searchData?.total ?? 0} found</span>
            </div>
            {searchData?.data?.length ? (
              <div className="dbm-result-list">
                {searchData.data.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className={`dbm-result-item ${selectedId === candidate.id ? "active" : ""}`}
                    onClick={() => openCandidate(candidate.id)}
                  >
                    <strong>{candidate.full_name || "Unnamed candidate"}</strong>
                    <span>ID {candidate.id} · {candidate.reg_id || "No registration number"}</span>
                    <span>{candidate.phone || "No mobile"} · {candidate.email || "No email"}</span>
                    {candidate.unique_id_number ? <span>Unique ID: {candidate.unique_id_number}</span> : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="dbm-empty">
                {searching ? "Searching…" : "Run a search to list matching candidates."}
              </p>
            )}
            <Pagination meta={searchData} onPage={(page) => runSearch(page)} />
          </aside>

          <section className="dbm-detail">
            <div className="dbm-tabs" role="tablist" aria-label="Database Master sections">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={`dbm-tab ${tab === key ? "active" : ""}`}
                  onClick={() => selectTab(key)}
                  disabled={!selectedId && key !== "tables" && key !== "audit"}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {!selectedId && tab !== "tables" && tab !== "audit" ? (
              <div className="dbm-placeholder">
                <Database size={30} />
                <h2>Select a candidate</h2>
                <p>Search results are loaded first. Detailed records and administrative actions are then scoped to the selected candidate.</p>
              </div>
            ) : null}

            {selectedId && tab === "overview" ? (
              <div className="dbm-panel">
                {loadingOverview ? <p className="dbm-empty">Loading candidate overview…</p> : null}
                {overview ? (
                  <>
                    <div className="dbm-section-title">
                      <div>
                        <h2>{overview.profile?.full_name || "Candidate overview"}</h2>
                        <p>
                          Profile ID {overview.profile?.id} · {overview.profile?.reg_id || "No registration number"}
                        </p>
                      </div>
                      <span className="dbm-pill">{overview.profile?.status || "unknown"}</span>
                    </div>

                    <div className="dbm-kv-grid">
                      {["id", "full_name", "reg_id", "email", "phone", "groomorbride", "birth_date", "marital_status", "blood_group", "mother_tongue", "verification_status", "status", "profile_completion", "created_at", "updated_at"].map((field) => (
                        <div key={field} className="dbm-kv">
                          <span>{field}</span>
                          <strong>{displayValue(overview.profile?.[field])}</strong>
                        </div>
                      ))}
                    </div>

                    <h3 className="dbm-subheading">Linked accounts</h3>
                    <div className="dbm-table-wrap">
                      <table className="dbm-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(overview.accounts || []).map((account) => (
                            <tr key={account.id}>
                              <td>{account.id}</td>
                              <td>{account.name}</td>
                              <td>{account.username}</td>
                              <td>{account.email}</td>
                              <td>{account.role?.name || "—"}</td>
                              <td>{account.status}</td>
                            </tr>
                          ))}
                          {!overview.accounts?.length ? (
                            <tr><td colSpan={6}>No linked user account.</td></tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    <form className="dbm-edit-form" onSubmit={saveProfile}>
                      <div className="dbm-section-title">
                        <div>
                          <h3 className="dbm-subheading">Edit known profile fields</h3>
                          <p>Only the validated profile columns below can be changed from this module.</p>
                        </div>
                        <button type="submit" className="dbm-button dbm-button-primary" disabled={savingProfile}>
                          <Save size={17} /> {savingProfile ? "Saving…" : "Save profile"}
                        </button>
                      </div>

                      <div className="dbm-form-grid">
                        <label>
                          <span>Full name</span>
                          <input
                            value={editForm.full_name}
                            onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })}
                            required
                            maxLength={255}
                          />
                        </label>
                        <label>
                          <span>Email</span>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                            maxLength={255}
                          />
                        </label>
                        <label>
                          <span>Phone</span>
                          <input
                            value={editForm.phone}
                            onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
                            maxLength={20}
                          />
                        </label>
                        <label>
                          <span>Groom / Bride</span>
                          <select
                            value={editForm.groomorbride}
                            onChange={(event) => setEditForm({ ...editForm, groomorbride: event.target.value })}
                            required
                          >
                            <option value="Groom">Groom</option>
                            <option value="Bride">Bride</option>
                          </select>
                        </label>
                        <label>
                          <span>Birth date</span>
                          <input
                            type="date"
                            value={editForm.birth_date}
                            onChange={(event) => setEditForm({ ...editForm, birth_date: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>Birth time</span>
                          <input
                            value={editForm.birth_time}
                            onChange={(event) => setEditForm({ ...editForm, birth_time: event.target.value })}
                            placeholder="HH:MM:SS"
                            maxLength={8}
                          />
                        </label>
                        <label>
                          <span>Birth place</span>
                          <input
                            value={editForm.birth_place}
                            onChange={(event) => setEditForm({ ...editForm, birth_place: event.target.value })}
                            maxLength={255}
                          />
                        </label>
                        <label>
                          <span>Marital status</span>
                          <input
                            value={editForm.marital_status}
                            onChange={(event) => setEditForm({ ...editForm, marital_status: event.target.value })}
                            maxLength={50}
                          />
                        </label>
                        <label>
                          <span>Height (cm)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.height_cm}
                            onChange={(event) => setEditForm({ ...editForm, height_cm: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>Weight (kg)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.weight_kg}
                            onChange={(event) => setEditForm({ ...editForm, weight_kg: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>Blood group</span>
                          <input
                            value={editForm.blood_group}
                            onChange={(event) => setEditForm({ ...editForm, blood_group: event.target.value })}
                            maxLength={5}
                          />
                        </label>
                        <label>
                          <span>Mother tongue</span>
                          <input
                            value={editForm.mother_tongue}
                            onChange={(event) => setEditForm({ ...editForm, mother_tongue: event.target.value })}
                            maxLength={100}
                          />
                        </label>
                        <label>
                          <span>Profile status</span>
                          <select
                            value={editForm.status}
                            onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}
                            required
                          >
                            <option value="active">Active</option>
                            <option value="deactive">Deactive</option>
                          </select>
                        </label>
                        <label>
                          <span>Verification status</span>
                          <select
                            value={editForm.verification_status}
                            onChange={(event) => setEditForm({ ...editForm, verification_status: event.target.value })}
                            required
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </label>
                        <label className="dbm-span-2">
                          <span>About me</span>
                          <textarea
                            rows={3}
                            value={editForm.about_me}
                            onChange={(event) => setEditForm({ ...editForm, about_me: event.target.value })}
                            maxLength={5000}
                          />
                        </label>
                        <label className="dbm-span-2">
                          <span>Special cases</span>
                          <textarea
                            rows={3}
                            value={editForm.special_cases}
                            onChange={(event) => setEditForm({ ...editForm, special_cases: event.target.value })}
                            maxLength={5000}
                          />
                        </label>
                      </div>
                    </form>
                  </>
                ) : null}
              </div>
            ) : null}

            {selectedId && tab === "related" ? (
              <div className="dbm-panel">
                <div className="dbm-section-title">
                  <div>
                    <h2>Candidate-related records</h2>
                    <p>Counts include records linked through the candidate profile or linked account IDs.</p>
                  </div>
                </div>

                <div className="dbm-relation-grid">
                  {relatedItems.map((item) => {
                    const status = item.count > 1 ? "multiple" : item.count === 1 ? "owned" : "none";

                    return (
                      <button
                        key={`${item.table}-${item.strategy}`}
                        type="button"
                        className={`dbm-relation-card ${relatedData?.table === item.table ? "active" : ""}`}
                        onClick={() => loadRelated(item.table, 1)}
                      >
                        <span>{item.label}</span>
                        <strong>{item.count}</strong>
                        <small className={`dbm-strategy dbm-strategy-${status}`}>{status}</small>
                      </button>
                    );
                  })}
                </div>

                {relatedLoading ? <p className="dbm-empty">Loading related records…</p> : null}
                {relatedData ? (
                  <>
                    <div className="dbm-section-title dbm-section-title-compact">
                      <div>
                        <h3 className="dbm-subheading">{relatedData.label}</h3>
                        <p>{relatedData.table} · {relatedData.records?.total ?? 0} records</p>
                      </div>
                    </div>
                    <RecordTable
                      columns={relatedData.columns}
                      rows={relatedData.records?.data}
                      onEditRow={relatedData.editable_columns?.length ? startRelatedEdit : undefined}
                      onDeleteRow={relatedData.strategy === "read_only" ? undefined : deleteRelatedRecord}
                      deletingRecordId={deletingRelatedRecordId}
                    />
                    <Pagination
                      meta={relatedData.records}
                      onPage={(page) => loadRelated(relatedData.table, page)}
                    />
                    {editingRelatedRecord ? (
                      <div className="dbm-modal-backdrop" role="presentation">
                        <form
                          className="dbm-record-editor"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="dbm-record-editor-title"
                          onSubmit={saveRelatedRecord}
                        >
                          <div className="dbm-record-editor-heading">
                            <div>
                              <span className="dbm-eyebrow">Related record · {relatedData.table}</span>
                              <h2 id="dbm-record-editor-title">Edit record #{editingRelatedRecord.id}</h2>
                            </div>
                            <button
                              type="button"
                              className="dbm-icon-button"
                              onClick={() => setEditingRelatedRecord(null)}
                              disabled={savingRelatedRecord}
                              aria-label="Close editor"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          {relatedData.strategy === "ambiguous" ? (
                            <p className="dbm-shared-record-warning">
                              This record may be linked to other candidates. Changes can affect them too.
                            </p>
                          ) : null}
                          {relatedData.table === "profile_documents" ? (
                            <p className="dbm-shared-record-warning">
                              This edits the saved document path only; it does not upload or move a file.
                            </p>
                          ) : null}
                          {error ? <div className="dbm-alert dbm-alert-error" role="alert">{error}</div> : null}
                          <div className="dbm-record-editor-fields">
                            {relatedData.editable_columns.map((column) => (
                              <label key={column.name} className={column.type === "json" ? "dbm-span-2" : ""}>
                                <span>{column.name.replace(/_/g, " ")}</span>
                                {column.type === "boolean" ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(relatedEditValues[column.name])}
                                    onChange={(event) => setRelatedEditValues({
                                      ...relatedEditValues,
                                      [column.name]: event.target.checked,
                                    })}
                                  />
                                ) : column.type === "json" ? (
                                  <textarea
                                    rows={5}
                                    value={relatedEditValues[column.name] ?? ""}
                                    onChange={(event) => setRelatedEditValues({
                                      ...relatedEditValues,
                                      [column.name]: event.target.value,
                                    })}
                                  />
                                ) : (
                                  <input
                                    type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
                                    step={column.type === "number" ? "any" : undefined}
                                    value={relatedEditValues[column.name] ?? ""}
                                    required={!column.nullable}
                                    onChange={(event) => setRelatedEditValues({
                                      ...relatedEditValues,
                                      [column.name]: event.target.value,
                                    })}
                                  />
                                )}
                              </label>
                            ))}
                          </div>
                          <div className="dbm-record-editor-actions">
                            <button
                              type="button"
                              className="dbm-button dbm-button-quiet"
                              onClick={() => setEditingRelatedRecord(null)}
                              disabled={savingRelatedRecord}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="dbm-button dbm-button-primary"
                              disabled={savingRelatedRecord}
                            >
                              <Save size={16} /> {savingRelatedRecord ? "Saving…" : "Save record"}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {tab === "tables" ? (
              <div className="dbm-panel">
                <div className="dbm-section-title">
                  <div>
                    <h2>All database tables</h2>
                    <p>Table and column identifiers are validated against the live schema. Sensitive column values are redacted.</p>
                  </div>
                  <button
                    type="button"
                    className="dbm-button dbm-button-quiet"
                    onClick={() => {
                      setTableLoading(true);
                      request("/database-master/tables")
                        .then((response) => setTables(response.data?.tables || []))
                        .catch((requestError) => setError(messageFrom(requestError)))
                        .finally(() => setTableLoading(false));
                    }}
                  >
                    <RefreshCw size={16} /> Refresh
                  </button>
                </div>

                <div className="dbm-table-explorer">
                  <aside className="dbm-table-list">
                    <input
                      type="search"
                      value={tableFilter}
                      placeholder="Filter table names"
                      onChange={(event) => setTableFilter(event.target.value)}
                    />
                    <div className="dbm-table-list-items">
                      {filteredTables.map((table) => (
                        <button
                          key={table.name}
                          type="button"
                          className={selectedTable === table.name ? "active" : ""}
                          onClick={() => loadTable(table.name, 1, "")}
                        >
                          <span>{table.name}</span>
                          <small>{table.column_count} columns</small>
                        </button>
                      ))}
                      {!filteredTables.length ? <p className="dbm-empty">No tables match.</p> : null}
                    </div>
                  </aside>

                  <section className="dbm-table-browser">
                    {selectedTable ? (
                      <>
                        <form
                          className="dbm-inline-search"
                          onSubmit={(event) => {
                            event.preventDefault();
                            loadTable(selectedTable, 1, tableQuery);
                          }}
                        >
                          <Search size={16} />
                          <input
                            type="search"
                            value={tableQuery}
                            onChange={(event) => setTableQuery(event.target.value)}
                            placeholder={`Search ${selectedTable}`}
                            maxLength={100}
                          />
                          <button type="submit" className="dbm-button dbm-button-quiet">Search</button>
                        </form>

                        {tableLoading ? <p className="dbm-empty">Loading table records…</p> : null}
                        {tableData ? (
                          <>
                            <div className="dbm-column-chips">
                              {tableData.columns.map((column) => (
                                <span
                                  key={column.name}
                                  className={column.sensitive ? "sensitive" : ""}
                                  title={column.sensitive ? "Sensitive column values are redacted" : column.type}
                                >
                                  {column.name}
                                </span>
                              ))}
                            </div>
                            <RecordTable columns={tableData.columns} rows={tableData.records?.data} />
                            <Pagination
                              meta={tableData.records}
                              onPage={(page) => loadTable(selectedTable, page, tableQuery)}
                            />
                          </>
                        ) : null}
                      </>
                    ) : (
                      <p className="dbm-empty">Select a table from the list to browse paginated records.</p>
                    )}
                  </section>
                </div>
              </div>
            ) : null}

            {selectedId && tab === "password" ? (
              <div className="dbm-panel">
                <div className="dbm-section-title">
                  <div>
                    <h2>Candidate password</h2>
                    <p>Passwords are hashed with Laravel's hasher. The password value and hash are never returned or logged.</p>
                  </div>
                </div>

                <form className="dbm-password-form" onSubmit={changePassword}>
                  <label>
                    <span>New password</span>
                    <input
                      type="password"
                      value={passwordForm.password}
                      onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })}
                      minLength={8}
                      maxLength={72}
                      required
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    <span>Confirm new password</span>
                    <input
                      type="password"
                      value={passwordForm.password_confirmation}
                      onChange={(event) => setPasswordForm({ ...passwordForm, password_confirmation: event.target.value })}
                      minLength={8}
                      maxLength={72}
                      required
                      autoComplete="new-password"
                    />
                  </label>
                  <button type="submit" className="dbm-button dbm-button-primary" disabled={changingPassword}>
                    <KeyRound size={17} /> {changingPassword ? "Updating…" : "Change password"}
                  </button>
                </form>
              </div>
            ) : null}

            {selectedId && tab === "delete" ? (
              <div className="dbm-panel">
                <div className="dbm-section-title">
                  <div>
                    <h2>Permanent deletion</h2>
                    <p>Review all linked records first. Shared relationship rows are also deleted; privileged-account links remain blocked.</p>
                  </div>
                  <button type="button" className="dbm-button dbm-button-quiet" onClick={previewDeletion} disabled={loadingPlan}>
                    <RefreshCw size={16} /> {loadingPlan ? "Checking…" : "Preview dependencies"}
                  </button>
                </div>

                {deletionPlan ? (
                  <>
                    <div className={`dbm-danger-summary ${deletionPlan.can_delete ? "safe" : "blocked"}`}>
                      <AlertTriangle size={20} />
                      <div>
                        <strong>{deletionPlan.can_delete ? "All candidate-linked records will be permanently deleted." : "Deletion is blocked."}</strong>
                        <p>
                          {deletionPlan.can_delete
                            ? "This includes shared relationship rows and may affect other candidates. Review every count, type DELETE in the confirmation box, and confirm. The transaction is verified and rolled back on failure."
                            : deletionPlan.blocking_messages.join(" ")}
                        </p>
                      </div>
                    </div>

                    <div className="dbm-table-wrap">
                      <table className="dbm-table">
                        <thead>
                          <tr>
                            <th>Table</th>
                            <th>Relationship</th>
                            <th>Records</th>
                            <th>Strategy</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deletionPlan.items.map((item) => (
                            <tr key={`${item.table}-${item.strategy}`}>
                              <td>{item.table}</td>
                              <td>{item.label}</td>
                              <td>{item.count}</td>
                              <td><span className={`dbm-strategy dbm-strategy-${item.strategy}`}>{item.strategy}</span></td>
                              <td>{item.blocking ? <strong className="dbm-blocked-text">Blocked</strong> : "Will be deleted"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="dbm-delete-form">
                      <label>
                        <span>Reason (optional, recorded in audit log)</span>
                        <input
                          value={deleteReason}
                          onChange={(event) => setDeleteReason(event.target.value)}
                          maxLength={500}
                          placeholder="Reason for permanent deletion"
                        />
                      </label>
                      <label>
                        <span>Type DELETE to confirm</span>
                        <input
                          value={confirmText}
                          onChange={(event) => setConfirmText(event.target.value)}
                          placeholder="DELETE"
                          autoComplete="off"
                        />
                      </label>
                      <button
                        type="button"
                        className="dbm-button dbm-button-danger"
                        disabled={!deletionPlan.can_delete || confirmText !== "DELETE" || deleting}
                        onClick={deleteCandidate}
                      >
                        <Trash2 size={17} /> {deleting ? "Deleting…" : "Permanently delete candidate"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="dbm-empty">Load the dependency preview before any deletion attempt.</p>
                )}
              </div>
            ) : null}

            {tab === "audit" ? (
              <div className="dbm-panel">
                <div className="dbm-section-title">
                  <div>
                    <h2>Database Master audit log</h2>
                    <p>Only safe administrative metadata is recorded. Passwords, hashes, tokens, and secrets are excluded.</p>
                  </div>
                  <button
                    type="button"
                    className="dbm-button dbm-button-quiet"
                    onClick={() => {
                      setAuditLoading(true);
                      request("/database-master/audit-logs?per_page=50")
                        .then((response) => setAuditData(response.data))
                        .catch((requestError) => setError(messageFrom(requestError)))
                        .finally(() => setAuditLoading(false));
                    }}
                  >
                    <RefreshCw size={16} /> Refresh
                  </button>
                </div>

                {auditLoading ? <p className="dbm-empty">Loading audit log…</p> : null}
                <div className="dbm-table-wrap">
                  <table className="dbm-table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Action</th>
                        <th>Administrator</th>
                        <th>Candidate</th>
                        <th>Description</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(auditData?.data || []).map((log) => (
                        <tr key={log.id}>
                          <td>{displayValue(log.created_at)}</td>
                          <td>{log.action}</td>
                          <td>{displayValue(log.user_name)}</td>
                          <td>{displayValue(log.candidate_id)}</td>
                          <td>{displayValue(log.description)}</td>
                          <td>{displayValue(log.ip_address)}</td>
                        </tr>
                      ))}
                      {!auditData?.data?.length && !auditLoading ? (
                        <tr><td colSpan={6}>No Database Master audit entries yet.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  meta={auditData}
                  onPage={(page) => {
                    setAuditLoading(true);
                    request(`/database-master/audit-logs?per_page=50&page=${page}`)
                      .then((response) => setAuditData(response.data))
                      .catch((requestError) => setError(messageFrom(requestError)))
                      .finally(() => setAuditLoading(false));
                  }}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
