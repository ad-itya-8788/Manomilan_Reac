import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Calendar,
  Gift,
  Megaphone,
  Save,
  Sparkles,
  Star,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { useAdminPermission } from "../../../permission-context";
import ToggleField from "./ToggleField";
import { getUpcomingEventsSettings, saveUpcomingEventsSettings } from "./api";
import "../../components/admin-ui.css";
import "./websiteManagement.css";

const ICONS = [
  { value: "calendar", label: "Calendar", Icon: Calendar },
  { value: "sparkles", label: "Sparkles", Icon: Sparkles },
  { value: "megaphone", label: "Megaphone", Icon: Megaphone },
  { value: "bell", label: "Bell", Icon: Bell },
  { value: "gift", label: "Gift", Icon: Gift },
  { value: "star", label: "Star", Icon: Star },
];

const EMPTY = {
  enabled: true,
  label: "Upcoming Events",
  icon: "calendar",
  background_color: "#c4144f",
  text_color: "#ffffff",
  position: "bottom-right",
  url: "",
  open_new_tab: true,
  images: [],
};

export default function UpcomingEventsSettings() {
  const canEditSettings = useAdminPermission("edit", "/admin/website/upcoming-events");
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newImages, setNewImages] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const imagePreviewUrls = useRef(new Set());

  const clearNewImages = useCallback(() => {
    imagePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    imagePreviewUrls.current.clear();
    setNewImages([]);
    setRemovedImages([]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    clearNewImages();
    try {
      const response = await getUpcomingEventsSettings();
      setForm({
        ...EMPTY,
        ...(response?.data || {}),
        url: response?.data?.url || "",
        images: Array.isArray(response?.data?.images) ? response.data.images : [],
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to load Upcoming Events settings.");
    } finally {
      setLoading(false);
    }
  }, [clearNewImages]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const setField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((previous) => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
    setError("");
    setNotice("");
  };

  const addNewImages = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (files.some((file) => !allowedTypes.includes(file.type))) {
      setError("Choose JPG, PNG, or WebP image files.");
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setError("Each image must be 5 MB or smaller.");
      return;
    }
    if (form.images.length + newImages.length + files.length > 10) {
      setError("You can add up to 10 Upcoming Events images.");
      return;
    }

    const selected = files.map((file) => {
      const preview = URL.createObjectURL(file);
      imagePreviewUrls.current.add(preview);
      return { file, preview };
    });
    setNewImages((previous) => [...previous, ...selected]);
    setError("");
    setNotice("");
  };

  const removeSavedImage = (index) => {
    const image = form.images[index];
    if (image?.path) {
      setRemovedImages((previous) => previous.includes(image.path)
        ? previous
        : [...previous, image.path]);
    }
    setForm((previous) => ({
      ...previous,
      images: previous.images.filter((_, imageIndex) => imageIndex !== index),
    }));
    setError("");
    setNotice("");
  };

  const removeNewImage = (index) => {
    const removed = newImages[index];
    if (removed) {
      URL.revokeObjectURL(removed.preview);
      imagePreviewUrls.current.delete(removed.preview);
    }
    setNewImages((previous) => previous.filter((_, imageIndex) => imageIndex !== index));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!canEditSettings) {
      setError("You do not have permission to change website settings.");
      return;
    }
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const body = new FormData();
      body.append("_method", "PUT");
      body.append("enabled", form.enabled ? "1" : "0");
      body.append("label", form.label);
      body.append("icon", form.icon);
      body.append("background_color", form.background_color);
      body.append("text_color", form.text_color);
      body.append("position", form.position);
      body.append("url", form.url);
      body.append("open_new_tab", form.open_new_tab ? "1" : "0");
      removedImages.forEach((path) => body.append("remove_images[]", path));
      newImages.forEach(({ file }) => body.append("new_images[]", file));

      const response = await saveUpcomingEventsSettings(body);
      clearNewImages();
      setForm({
        ...EMPTY,
        ...(response?.data || {}),
        url: response?.data?.url || "",
        images: Array.isArray(response?.data?.images) ? response.data.images : [],
      });
      setNotice(response?.message || "Upcoming Events settings saved.");
    } catch (requestError) {
      setError(requestError.message || "Unable to save Upcoming Events settings.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => () => {
    imagePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    imagePreviewUrls.current.clear();
  }, []);

  const selectedIcon = ICONS.find((item) => item.value === form.icon) || ICONS[0];
  const PreviewIcon = selectedIcon.Icon;

  return (
    <AdminLayout currentPath="/admin/website/upcoming-events">
      <div className="adm-ui wm-page">
        <section className="wm-hero">
          <h1>Upcoming Events Settings</h1>
          <p>Control the floating button shown on the homepage, login/register, and public information pages. It is hidden on admin, candidate, Melava-registration, and workshop-registration pages.</p>
        </section>

        {error ? <div className="wm-alert error">{error}</div> : null}
        {notice ? <div className="wm-alert success">{notice}</div> : null}

        <form className="wm-layout" onSubmit={submit}>
          <div className="wm-panel">
            <h2>Button settings</h2>
            <p>Changes apply to public pages after saving.</p>

            <ToggleField
              label="Show Upcoming Events button"
              description="Turn the floating button on or off for all public visitors."
              checked={form.enabled}
              onChange={(event) => setField({ target: { name: "enabled", type: "checkbox", checked: event.target.checked } })}
              disabled={loading || saving}
            />

            <div className="wm-form-grid">
              <div className="wm-field full">
                <label htmlFor="label">Button text</label>
                <input id="label" name="label" value={form.label} onChange={setField} maxLength={80} disabled={loading || saving} required />
              </div>

              <div className="wm-field">
                <label htmlFor="icon">Icon</label>
                <select id="icon" name="icon" value={form.icon} onChange={setField} disabled={loading || saving}>
                  {ICONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div className="wm-field">
                <label htmlFor="position">Position</label>
                <select id="position" name="position" value={form.position} onChange={setField} disabled={loading || saving}>
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                </select>
              </div>

              <div className="wm-field">
                <label htmlFor="background_color">Background colour</label>
                <div className="wm-color-row">
                  <input id="background_color" name="background_color" type="color" value={form.background_color} onChange={setField} disabled={loading || saving} />
                  <input name="background_color" value={form.background_color} onChange={setField} maxLength={7} disabled={loading || saving} aria-label="Background colour hex" />
                </div>
              </div>

              <div className="wm-field">
                <label htmlFor="text_color">Text colour</label>
                <div className="wm-color-row">
                  <input id="text_color" name="text_color" type="color" value={form.text_color} onChange={setField} disabled={loading || saving} />
                  <input name="text_color" value={form.text_color} onChange={setField} maxLength={7} disabled={loading || saving} aria-label="Text colour hex" />
                </div>
              </div>

              <div className="wm-field full">
                <label htmlFor="url">Destination URL</label>
                <input id="url" name="url" value={form.url} onChange={setField} placeholder="https://example.com/events or /melava-registration" disabled={loading || saving} />
                <small>Use an https:// link or a website path starting with /. Leave blank to show a non-clickable button.</small>
              </div>

              <div className="wm-field full">
                <ToggleField
                  label="Open in a new tab"
                  description="Recommended for external event pages."
                  checked={form.open_new_tab}
                  onChange={(event) => setField({ target: { name: "open_new_tab", type: "checkbox", checked: event.target.checked } })}
                  disabled={loading || saving}
                />
              </div>

              <div className="wm-field full">
                <label htmlFor="upcoming-event-images">Event images</label>
                <input
                  id="upcoming-event-images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={addNewImages}
                  disabled={loading || saving || !canEditSettings}
                />
                <small>Upload up to 10 JPG, PNG, or WebP images, up to 5 MB each. Removing an image hides it from the carousel but keeps its file in storage.</small>
                {(form.images.length > 0 || newImages.length > 0) ? (
                  <div className="wm-event-image-grid">
                    {form.images.map((image, index) => (
                      <div className="wm-event-image" key={image.path || image.url}>
                        <img src={image.url} alt={`Upcoming event ${index + 1}`} />
                        <button
                          type="button"
                          onClick={() => removeSavedImage(index)}
                          disabled={loading || saving || !canEditSettings}
                          aria-label={`Remove saved image ${index + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {newImages.map((image, index) => (
                      <div className="wm-event-image" key={image.preview}>
                        <img src={image.preview} alt={`New upcoming event ${index + 1}`} />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          disabled={loading || saving}
                          aria-label={`Remove selected image ${index + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="wm-actions">
              <button type="button" className="ui-btn secondary" onClick={load} disabled={loading || saving}>Reset</button>
              <button type="submit" className="ui-btn" disabled={!canEditSettings || loading || saving}>
                <Save size={16} />
                {saving ? "Saving..." : "Save settings"}
              </button>
            </div>
          </div>

          <aside className="wm-side">
            <div className="wm-preview">
              <span className="wm-preview-label">Live preview</span>
              <span
                className="wm-preview-button"
                style={{ background: form.background_color, color: form.text_color }}
              >
                <PreviewIcon size={17} />
                {form.label || "Upcoming Events"}
              </span>
              <span className="wm-preview-note">
                Position: {form.position === "bottom-left" ? "Bottom left" : "Bottom right"} · {form.open_new_tab ? "Opens in new tab" : "Opens in same tab"}
              </span>
            </div>
            <div className="wm-side-card">
              <h3>Security</h3>
              <ul>
                <li>Only http(s) links or website paths are accepted.</li>
                <li>All changes are written to the audit log.</li>
                <li>Public visitors receive a cached settings payload.</li>
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </AdminLayout>
  );
}
