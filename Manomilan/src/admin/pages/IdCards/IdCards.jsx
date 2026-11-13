import { useCallback, useEffect, useState } from "react";
import { LayoutTemplate, RefreshCw, Users } from "lucide-react";
import AdminLayout from "../../components/AdminLayout.jsx";
import { request } from "../../../api";
import IdCardCandidates from "./IdCardCandidates.jsx";
import IdCardDesigner from "./IdCardDesigner.jsx";
import { FALLBACK_SETTINGS, normalizeIdCardSettings } from "./idCardDefaults.js";
import "../../components/admin-ui.css";
import "./idCards.css";

export default function IdCards() {
  const [view, setView] = useState("candidates");
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const loadDesign = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await request("/id-cards/design");
      setSettings(normalizeIdCardSettings(response?.data?.settings || {}));
    } catch (err) {
      setError(err.message || "Unable to load the saved ID card design.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadDesign, 0);
    return () => window.clearTimeout(timer);
  }, [loadDesign]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const saveDesign = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await request("/id-cards/design", {
        method: "PUT",
        body: { settings },
      });
      setSettings(normalizeIdCardSettings(response?.data?.settings || {}));
      setToast({ type: "success", message: response?.message || "ID card design saved." });
    } catch (err) {
      setError(err.message || "Unable to save the ID card design.");
    } finally {
      setSaving(false);
    }
  };

  const resetDesign = async () => {
    if (!window.confirm("Reset the ID card design to the default layout? Saved custom settings will be replaced.")) return;
    setSaving(true);
    setError("");
    try {
      const response = await request("/id-cards/design/reset", { method: "PUT" });
      setSettings(normalizeIdCardSettings(response?.data?.settings || {}));
      setToast({ type: "success", message: response?.message || "ID card design reset." });
    } catch (err) {
      setError(err.message || "Unable to reset the ID card design.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout currentPath="/admin/id-cards">
      <div className="adm-ui idc-page">
        <div className="ui-head">
          <div>
            <h1>ID Cards</h1>
            <p>Assign unique IDs, design reusable cards, print them, and open candidate Bio Data.</p>
          </div>
          <div className="ui-head-actions">
            <button type="button" className="ui-btn secondary" onClick={loadDesign} disabled={loading}>
              <RefreshCw size={16} className={loading ? "ui-spin" : ""} /> Refresh
            </button>
            <button
              type="button"
              className={`ui-btn ${view === "design" ? "" : "secondary"}`}
              onClick={() => setView(view === "design" ? "candidates" : "design")}
            >
              {view === "design" ? <Users size={16} /> : <LayoutTemplate size={16} />}
              {view === "design" ? "Candidates" : "Card design"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="ui-alert" role="alert">
            <span>{error}</span>
            <button type="button" className="ui-btn small secondary" onClick={loadDesign} disabled={loading}>Try again</button>
          </div>
        ) : null}

        {view === "design" ? (
          <IdCardDesigner
            settings={settings}
            onChange={setSettings}
            onSave={saveDesign}
            onReset={resetDesign}
            saving={saving}
          />
        ) : (
          <IdCardCandidates settings={settings} />
        )}
      </div>

      {toast ? <div className={`idc-toast ${toast.type}`} role="status">{toast.message}</div> : null}
    </AdminLayout>
  );
}
