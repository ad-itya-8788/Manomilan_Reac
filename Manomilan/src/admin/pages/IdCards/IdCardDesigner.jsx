import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  EyeOff,
  Italic,
  LayoutGrid,
  ListChecks,
  LoaderCircle,
  Palette,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
  Save,
  Trash2,
  Underline,
  Users,
  X,
} from "lucide-react";
import IdCardPreview from "./IdCardPreview.jsx";
import { FALLBACK_SETTINGS } from "./idCardDefaults.js";

const SAMPLE_CANDIDATE = {
  full_name: "Rahul Sham Sharma",
  unique_id_number: "MM-01-001",
  mobile: "+91 98765 43210",
  birth_date: "1994-06-18",
  age_group: "02",
  age_group_label: "26-30",
  gender: "Groom",
  registration_number: "MM-2026-00124",
  city: "Ahmedabad",
  campaign_title: "Aaryans Manomilan 2026",
};

const POSITIONABLE_ELEMENTS = [
  { key: "branding", label: "Logo and organization name" },
  { key: "photo", label: "Candidate photo" },
  { key: "name", label: "Name" },
  { key: "uniqueId", label: "Unique ID" },
  { key: "mobile", label: "Mobile" },
  { key: "dob", label: "Date of birth" },
  { key: "ageGroup", label: "Age group" },
  { key: "gender", label: "Gender" },
  { key: "registrationNumber", label: "Registration number" },
  { key: "city", label: "City" },
  { key: "campaign", label: "Melava campaign" },
  { key: "customText", label: "Custom text" },
  { key: "footer", label: "Footer" },
];

const FIELD_VISIBILITY_SETTINGS = {
  name: "showName",
  uniqueId: "showUniqueId",
  mobile: "showMobile",
  dob: "showDob",
  ageGroup: "showAgeGroup",
  gender: "showGender",
  registrationNumber: "showRegistrationNumber",
  city: "showCity",
  campaign: "showCampaign",
};

const TABS = [
  { key: "layout", label: "Layout", icon: LayoutGrid },
  { key: "style", label: "Style", icon: Palette },
  { key: "content", label: "Content", icon: ListChecks },
  { key: "ages", label: "Age groups", icon: Users },
];

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clampPercent = (value) => Math.min(100, Math.max(3, value));

/* -------------------------------------------------------------------------- */
/*  Self-contained design system + iOS-style motion                           */
/* -------------------------------------------------------------------------- */
const DESIGNER_CSS = `
.idd {
  --idd-accent: #0d9488;
  --idd-accent-2: #14b8a6;
  --idd-accent-soft: rgba(13,148,136,.11);
  --idd-surface: #ffffff;
  --idd-surface-2: #f4f6f8;
  --idd-line: rgba(15,23,42,.09);
  --idd-text: #0f172a;
  --idd-muted: #64748b;
  --idd-danger: #e5484d;
  --idd-shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 32px -18px rgba(15,23,42,.25);
  --idd-spring: cubic-bezier(0.32, 0.72, 0, 1);
  --idd-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  color-scheme: light;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
  color: var(--idd-text);
}
@media (max-width: 1080px) { .idd { grid-template-columns: minmax(0, 1fr); } }
.idd-panel, .idd-panel *, .idd-head, .idd-head *, .idd-selected, .idd-selected *, .idd-fmt, .idd-fmt *, .idd-hint { box-sizing: border-box; }

.idd-panel, .idd-preview {
  background: var(--idd-surface);
  border: 1px solid var(--idd-line);
  border-radius: 24px;
  box-shadow: var(--idd-shadow);
  animation: idd-enter 700ms var(--idd-spring) both;
}
.idd-preview { animation-delay: 90ms; }
@keyframes idd-enter { from { opacity: 0; transform: translateY(18px) scale(0.985); } }
.idd-aside { position: sticky; top: 16px; align-self: start; }
@media (max-width: 1080px) { .idd-aside { position: static; } }

/* header */
.idd-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 22px 22px 8px; }
.idd-head h2 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
.idd-head p { margin: 4px 0 0; font-size: 13px; color: var(--idd-muted); }

/* buttons */
.idd-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 40px; padding: 0 16px; border: 0; border-radius: 12px;
  font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, var(--idd-accent), var(--idd-accent-2));
  box-shadow: 0 8px 20px -10px rgba(13,148,136,.8);
  position: relative; overflow: hidden;
  transition: transform 240ms var(--idd-bounce), box-shadow 300ms ease, opacity 200ms ease;
}
.idd-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 12px 24px -10px rgba(13,148,136,.85); }
.idd-btn:not(:disabled):active { transform: scale(0.95); }
.idd-btn:disabled { opacity: .55; cursor: not-allowed; }
.idd-btn.ghost {
  color: var(--idd-text); background: var(--idd-surface-2); box-shadow: none;
  border: 1px solid var(--idd-line);
}
.idd-btn.ghost.is-active { background: var(--idd-accent-soft); color: var(--idd-accent); border-color: var(--idd-accent); }
.idd-btn.small { height: 34px; padding: 0 12px; font-size: 13px; border-radius: 10px; }
.idd-btn.icon { width: 34px; padding: 0; }
.idd-btn.danger { color: var(--idd-danger); }
.idd-btn:focus-visible, .idd-tab:focus-visible, .idd-seg button:focus-visible { outline: 2px solid var(--idd-accent); outline-offset: 2px; }
.idd-spin { animation: idd-spin .9s linear infinite; }
@keyframes idd-spin { to { transform: rotate(360deg); } }

/* tabs */
.idd-tabs {
  position: relative; display: grid; grid-template-columns: repeat(4, 1fr);
  margin: 12px 22px 0; padding: 4px; border-radius: 14px;
  background: var(--idd-surface-2); border: 1px solid var(--idd-line);
}
.idd-tab-indicator {
  position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / 4);
  border-radius: 10px; background: var(--idd-surface);
  box-shadow: 0 2px 8px rgba(15,23,42,.14);
  transform: translateX(calc(var(--idd-tab, 0) * 100%));
  transition: transform 520ms var(--idd-spring);
}
.idd-tab {
  position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
  height: 38px; border: 0; background: transparent; cursor: pointer;
  font: inherit; font-size: 13.5px; font-weight: 600; color: var(--idd-muted);
  border-radius: 10px; transition: color 300ms ease;
}
.idd-tab.is-active { color: var(--idd-text); }
.idd-tab.is-active svg { color: var(--idd-accent); }
@media (max-width: 560px) { .idd-tab span { display: none; } }

/* body */
.idd-body { padding: 18px 22px 8px; }
.idd-pane { display: flex; flex-direction: column; gap: 14px; animation: idd-pane 560ms var(--idd-spring) both; }
@keyframes idd-pane { from { opacity: 0; transform: translateX(16px); } }
.idd-card {
  padding: 16px; border-radius: 18px;
  background: var(--idd-surface-2); border: 1px solid var(--idd-line);
  animation: idd-card 560ms var(--idd-spring) both;
  animation-delay: calc(var(--i, 0) * 60ms);
}
@keyframes idd-card { from { opacity: 0; transform: translateY(12px); } }
.idd-card h3 { margin: 0 0 2px; font-size: 14.5px; font-weight: 700; letter-spacing: -0.01em; }
.idd-card > p, .idd-card-sub { margin: 0 0 12px; font-size: 12.5px; color: var(--idd-muted); }
.idd-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.idd-card-head p { margin: 2px 0 0; font-size: 12.5px; color: var(--idd-muted); }

/* fields */
.idd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.idd-span-2 { grid-column: span 2; }
.idd-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.idd-field > span { font-size: 12px; font-weight: 600; color: var(--idd-muted); }
.idd-field input[type="text"], .idd-field input[type="number"], .idd-field select {
  width: 100%; height: 40px; padding: 0 12px; border-radius: 12px;
  border: 1px solid var(--idd-line); background: var(--idd-surface); color: var(--idd-text);
  font: inherit; font-size: 14px; outline: none;
  transition: border-color 220ms ease, box-shadow 220ms ease;
}
.idd-field input:focus, .idd-field select:focus { border-color: var(--idd-accent); box-shadow: 0 0 0 4px var(--idd-accent-soft); }
.idd-field input:disabled { opacity: .5; }
.idd-color { display: flex; align-items: center; gap: 8px; }
.idd-color input[type="color"] {
  flex: none; width: 40px; height: 40px; padding: 3px; border-radius: 12px; cursor: pointer;
  border: 1px solid var(--idd-line); background: var(--idd-surface);
  transition: transform 240ms var(--idd-bounce);
}
.idd-color input[type="color"]:hover { transform: scale(1.08); }
.idd-range { width: 100%; accent-color: var(--idd-accent); }

/* segmented control */
.idd-seg {
  position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
  padding: 3px; border-radius: 12px; background: var(--idd-surface); border: 1px solid var(--idd-line);
}
.idd-seg-thumb {
  position: absolute; top: 3px; bottom: 3px; left: 3px; border-radius: 9px;
  width: calc((100% - 6px) / var(--n, 2));
  background: var(--idd-accent-soft); box-shadow: inset 0 0 0 1px var(--idd-accent);
  transform: translateX(calc(var(--idx, 0) * 100%));
  transition: transform 460ms var(--idd-spring);
}
.idd-seg button {
  position: relative; z-index: 1; height: 34px; border: 0; background: transparent; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font: inherit; font-size: 13px; font-weight: 600; color: var(--idd-muted); border-radius: 9px;
  transition: color 240ms ease;
}
.idd-seg button.is-active { color: var(--idd-accent); }

/* iOS switch */
.idd-switch { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; cursor: pointer; }
.idd-switch + .idd-switch { border-top: 1px solid var(--idd-line); }
.idd-switch > span:first-child { font-size: 14px; }
.idd-switch input { position: absolute; opacity: 0; pointer-events: none; }
.idd-track {
  position: relative; flex: none; width: 46px; height: 28px; border-radius: 99px;
  background: rgba(120,120,128,.32);
  transition: background 320ms ease;
}
.idd-track::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 24px; height: 24px; border-radius: 50%;
  background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.28);
  transition: transform 420ms var(--idd-bounce), width 220ms ease;
}
.idd-switch:active .idd-track::after { width: 29px; }
.idd-switch input:checked + .idd-track { background: #34c759; }
.idd-switch input:checked + .idd-track::after { transform: translateX(18px); }
.idd-switch:active input:checked + .idd-track::after { transform: translateX(13px); }
.idd-switch input:focus-visible + .idd-track { outline: 2px solid var(--idd-accent); outline-offset: 2px; }
.idd-switch-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 22px; }
.idd-switch-grid .idd-switch:nth-child(2) { border-top: 0; }
@media (max-width: 560px) {
  .idd-switch-grid { grid-template-columns: minmax(0, 1fr); }
  .idd-switch-grid .idd-switch:nth-child(2) { border-top: 1px solid var(--idd-line); }
}

/* age groups */
.idd-age {
  display: grid; grid-template-columns: 0.8fr 1.2fr 0.8fr 0.8fr auto; gap: 10px; align-items: end;
  padding: 12px; border-radius: 14px; background: var(--idd-surface); border: 1px solid var(--idd-line);
  animation: idd-card 520ms var(--idd-spring) both; animation-delay: calc(var(--i, 0) * 50ms);
}
@media (max-width: 640px) { .idd-age { grid-template-columns: repeat(2, 1fr); } }
.idd-age-list { display: flex; flex-direction: column; gap: 10px; }
.idd-empty { padding: 18px; text-align: center; font-size: 13px; color: var(--idd-muted); border: 1px dashed var(--idd-line); border-radius: 14px; }

/* sticky save bar */
.idd-savebar {
  position: sticky; bottom: 0; z-index: 5;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-top: 10px; padding: 14px 22px;
  border-radius: 0 0 24px 24px; border-top: 1px solid var(--idd-line);
  background: color-mix(in srgb, var(--idd-surface) 88%, transparent);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
}
.idd-savebar small { color: var(--idd-muted); font-size: 12.5px; }

/* preview */
.idd-preview-body { padding: 4px 22px 22px; }
.idd-preview-body .idc-preview-stage {
  margin-top: 8px;
  border-radius: 18px;
  border: 1px solid var(--idd-line);
  background:
    linear-gradient(45deg, rgba(120,120,128,.08) 25%, transparent 25%, transparent 75%, rgba(120,120,128,.08) 75%),
    linear-gradient(45deg, rgba(120,120,128,.08) 25%, transparent 25%, transparent 75%, rgba(120,120,128,.08) 75%),
    var(--idd-surface-2);
  background-size: 18px 18px, 18px 18px, auto;
  background-position: 0 0, 9px 9px, 0 0;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.idd-size-pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 99px;
  font-size: 12px; font-weight: 600; color: var(--idd-accent); background: var(--idd-accent-soft);
  font-variant-numeric: tabular-nums;
}
.idd-hint { margin: 12px 0 0; padding: 10px 12px; border-radius: 12px; font-size: 12.5px; line-height: 1.5; color: var(--idd-muted); background: var(--idd-surface-2); }
.idd-selected { margin-top: 14px; padding: 16px; border-radius: 18px; background: var(--idd-surface-2); border: 1px solid var(--idd-line); display: flex; flex-direction: column; gap: 12px; }

/* floating text-format toolbar (iOS popover) */
.idd-fmt {
  position: fixed; z-index: 1000;
  width: min(390px, calc(100vw - 16px)); max-height: min(320px, 55vh); overflow: auto;
  padding: 14px; border-radius: 20px;
  background: color-mix(in srgb, var(--idd-surface) 92%, transparent);
  backdrop-filter: saturate(180%) blur(18px);
  -webkit-backdrop-filter: saturate(180%) blur(18px);
  border: 1px solid var(--idd-line);
  box-shadow: 0 24px 60px -16px rgba(15,23,42,.45);
  color: var(--idd-text);
  transform-origin: top center;
  animation: idd-pop 420ms var(--idd-bounce) both;
}
.idd-fmt.is-above { transform: translateY(-100%); transform-origin: bottom center; animation-name: idd-pop-up; }
@keyframes idd-pop { from { opacity: 0; transform: scale(0.88) translateY(-6px); } }
@keyframes idd-pop-up { from { opacity: 0; transform: translateY(-100%) scale(0.88); } }
.idd-fmt-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.idd-fmt-head strong { font-size: 13.5px; }
.idd-fmt-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
.idd-fmt-row .idd-field { flex: 1 1 110px; }
.idd-fmt-row .idd-field input[type="color"] { width: 100%; height: 40px; padding: 3px; border-radius: 12px; border: 1px solid var(--idd-line); background: var(--idd-surface); cursor: pointer; }

@media (prefers-reduced-motion: reduce) {
  .idd, .idd * { animation-duration: 0.01ms !important; animation-delay: 0ms !important; transition-duration: 0.01ms !important; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */
function Toggle({ label, checked, onChange }) {
  return (
    <label className="idd-switch">
      <span>{label}</span>
      <input type="checkbox" checked={checked !== false} onChange={(event) => onChange(event.target.checked)} />
      <span className="idd-track" aria-hidden="true" />
    </label>
  );
}

function Segmented({ value, options, onChange, label }) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div className="idd-seg" role="group" aria-label={label} style={{ "--n": options.length, "--idx": index }}>
      <span className="idd-seg-thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={option.value === value ? "is-active" : ""}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.icon ? <option.icon size={15} /> : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, className = "", children }) {
  return (
    <label className={`idd-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <span className="idd-color">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/*  Designer                                                                  */
/* -------------------------------------------------------------------------- */
export default function IdCardDesigner({ settings, onChange, onSave, onReset, saving = false, sample = SAMPLE_CANDIDATE }) {
  const [selectedElement, setSelectedElement] = useState("name");
  const [formattingElement, setFormattingElement] = useState("");
  const [formattingAnchor, setFormattingAnchor] = useState(null);
  const [tab, setTab] = useState("layout");
  const tabIndex = Math.max(0, TABS.findIndex((item) => item.key === tab));
  const update = (patch) => onChange((currentSettings) => ({
    ...currentSettings,
    ...(typeof patch === "function" ? patch(currentSettings) : patch),
    version: FALLBACK_SETTINGS.version,
  }));
  const numberInput = (key, value) => update({ [key]: value === "" ? "" : toNumber(value, settings[key]) });
  const updateCardSize = ({ width, height }) => update({
    cardWidth: Math.round(Math.min(1000, Math.max(1, width)) * 2) / 2,
    cardHeight: Math.round(Math.min(1000, Math.max(1, height)) * 2) / 2,
  });
  const ageGroups = Array.isArray(settings.ageGroups) ? settings.ageGroups : [];
  const cardWidth = Number(settings.cardWidth) || FALLBACK_SETTINGS.cardWidth;
  const cardHeight = Number(settings.cardHeight) || FALLBACK_SETTINGS.cardHeight;
  const padding = Number(settings.padding ?? FALLBACK_SETTINGS.padding) || 0;
  const canvasWidth = Math.max(1, cardWidth - padding * 2);
  const canvasHeight = Math.max(1, cardHeight - padding * 2);
  const fieldPositions = Object.fromEntries(
    Object.entries(FALLBACK_SETTINGS.fieldPositions).map(([key, fallback]) => [
      key,
      { ...fallback, ...(settings.fieldPositions?.[key] || {}) },
    ]),
  );
  const selectedPosition = fieldPositions[selectedElement] || { x: 0, y: 0 };
  const defaultSize = (key) => {
    if (key === "branding") return { width: 100, height: 25 };
    if (key === "photo") {
      return {
        width: clampPercent(((Number(settings.photoWidth) || FALLBACK_SETTINGS.photoWidth) / canvasWidth) * 100),
        height: clampPercent(((Number(settings.photoHeight) || FALLBACK_SETTINGS.photoHeight) / canvasHeight) * 100),
      };
    }
    if (key === "name") return { width: 70, height: 12 };
    if (key === "customText") return { width: 96, height: 8 };
    if (key === "footer") return { width: 100, height: 14 };
    return { width: 34, height: 10 };
  };
  const elementSize = (key) => {
    const fallback = defaultSize(key);
    const saved = settings.elementSizes?.[key];
    return {
      width: clampPercent(Number.isFinite(Number(saved?.width)) && Number(saved?.width) > 0 ? Number(saved.width) : fallback.width),
      height: clampPercent(Number.isFinite(Number(saved?.height)) && Number(saved?.height) > 0 ? Number(saved.height) : fallback.height),
    };
  };
  const selectedSize = elementSize(selectedElement);
  const positionLimit = (axis) => {
    return Math.max(0, 100 - (axis === "x" ? selectedSize.width : selectedSize.height));
  };

  const updatePosition = (key, patch) => update((currentSettings) => {
    const currentPositions = Object.fromEntries(
      Object.entries(FALLBACK_SETTINGS.fieldPositions).map(([positionKey, fallback]) => [
        positionKey,
        { ...fallback, ...(currentSettings.fieldPositions?.[positionKey] || {}) },
      ]),
    );
    return {
      fieldPositions: {
        ...currentPositions,
        [key]: { ...(currentPositions[key] || { x: 0, y: 0 }), ...patch },
      },
    };
  });

  const updateSelectedCoordinate = (axis, value) => {
    const number = value === "" ? 0 : toNumber(value, selectedPosition[axis]);
    updatePosition(selectedElement, { [axis]: Math.min(positionLimit(axis), Math.max(0, number)) });
  };

  const sizeLimit = (axis) => Math.max(3, 100 - (axis === "width" ? selectedPosition.x : selectedPosition.y));

  const updateSize = (key, patch) => {
    const current = elementSize(key);
    const next = {
      width: Math.min(Math.max(3, patch.width ?? current.width), Math.max(3, 100 - (fieldPositions[key]?.x || 0))),
      height: Math.min(Math.max(3, patch.height ?? current.height), Math.max(3, 100 - (fieldPositions[key]?.y || 0))),
    };
    if (key === "photo") {
      update({
        photoWidth: Math.round((next.width / 100) * canvasWidth * 10) / 10,
        photoHeight: Math.round((next.height / 100) * canvasHeight * 10) / 10,
      });
      return;
    }
    update({ elementSizes: { ...(settings.elementSizes || {}), [key]: next } });
  };

  const updateSelectedSize = (axis, value) => {
    const number = value === "" ? selectedSize[axis] : toNumber(value, selectedSize[axis]);
    updateSize(selectedElement, { [axis]: Math.min(sizeLimit(axis), Math.max(3, number)) });
  };

  const openTextFormatting = (key, event) => {
    setSelectedElement(key === "cardBadge" ? "branding" : key);
    setFormattingElement(key);
    const bounds = event?.currentTarget?.getBoundingClientRect();
    if (!bounds) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const toolbarWidth = Math.min(390, Math.max(0, viewportWidth - 16));
    const toolbarHeight = Math.min(320, Math.max(120, viewportHeight * 0.55));
    const left = Math.max(8, Math.min(
      bounds.left + bounds.width / 2 - toolbarWidth / 2,
      viewportWidth - toolbarWidth - 8,
    ));
    const placeAbove = bounds.bottom + toolbarHeight + 8 > viewportHeight
      && bounds.top > toolbarHeight + 8;
    const top = placeAbove
      ? bounds.top - 8
      : Math.min(bounds.bottom + 8, viewportHeight - toolbarHeight - 8);
    setFormattingAnchor({ left, top, placeAbove });
  };

  const closeFormatting = () => {
    setFormattingElement("");
    setFormattingAnchor(null);
  };

  const updateTextStyle = (key, patch) => {
    update({
      textStyles: {
        ...(settings.textStyles || {}),
        [key]: { ...(settings.textStyles?.[key] || {}), ...patch },
      },
    });
  };

  const clearTextStyle = () => {
    const textStyles = Object.fromEntries(
      Object.entries(settings.textStyles || {}).filter(([key]) => key !== formattingElement),
    );
    update({ textStyles });
  };

  const formattingStyle = settings.textStyles?.[formattingElement] || {};
  const formattingLabel = POSITIONABLE_ELEMENTS.find((element) => element.key === formattingElement)?.label
    || (formattingElement === "cardBadge" ? "ID card badge" : "Text");
  const visibilitySetting = FIELD_VISIBILITY_SETTINGS[formattingElement];

  const updateGroup = (index, patch) => {
    const next = ageGroups.map((group, groupIndex) => (groupIndex === index ? { ...group, ...patch } : group));
    update({ ageGroups: next });
  };

  const removeGroup = (index) => {
    update({ ageGroups: ageGroups.filter((_, groupIndex) => groupIndex !== index) });
  };

  const addGroup = () => {
    const nextCode = String(ageGroups.length + 1).padStart(2, "0");
    update({
      ageGroups: [...ageGroups, { code: nextCode, label: "", min: 18, max: 25 }],
    });
  };

  const changeOrientation = (orientation) => {
    update({
      orientation,
      cardWidth: orientation === "portrait" ? 65 : 100,
      cardHeight: orientation === "portrait" ? 100 : 65,
    });
  };

  const bgValue = settings.bgColor === "transparent" ? "#ffffff" : settings.bgColor || "#fffaf3";
  const card = (index) => ({ "--i": index });

  /* ---- tab panes ---- */
  const layoutPane = (
    <div className="idd-pane" key="layout">
      <section className="idd-card" style={card(0)}>
        <h3>Card size</h3>
        <p>Pick a shape, then fine-tune the size. You can also drag the gold corner on the preview.</p>
        <div className="idd-grid">
          <Field label="Orientation" className="idd-span-2">
            <Segmented
              label="Orientation"
              value={settings.orientation || "landscape"}
              onChange={changeOrientation}
              options={[
                { value: "landscape", label: "Landscape", icon: RectangleHorizontal },
                { value: "portrait", label: "Portrait", icon: RectangleVertical },
              ]}
            />
          </Field>
          <Field label="Width (mm)">
            <input type="number" min="1" max="1000" step="0.5" value={settings.cardWidth} onChange={(event) => numberInput("cardWidth", event.target.value)} />
          </Field>
          <Field label="Height (mm)">
            <input type="number" min="1" max="1000" step="0.5" value={settings.cardHeight} onChange={(event) => numberInput("cardHeight", event.target.value)} />
          </Field>
          <Field label="Padding (mm)">
            <input type="number" min="0" max="20" step="0.5" value={settings.padding} onChange={(event) => numberInput("padding", event.target.value)} />
          </Field>
          <Field label="Text alignment">
            <Segmented
              label="Text alignment"
              value={settings.align || "left"}
              onChange={(align) => update({ align })}
              options={[
                { value: "left", label: "", icon: AlignLeft },
                { value: "center", label: "", icon: AlignCenter },
                { value: "right", label: "", icon: AlignRight },
              ]}
            />
          </Field>
        </div>
      </section>

      <section className="idd-card" style={card(1)}>
        <h3>Photo &amp; header</h3>
        <p>Drag the photo or logo on the preview to move it.</p>
        <Toggle label="Show organization logo and title" checked={settings.showBranding} onChange={(checked) => update({ showBranding: checked })} />
        <Toggle label="Show candidate photo" checked={settings.showPhoto} onChange={(checked) => update({ showPhoto: checked })} />
        <div className="idd-grid" style={{ marginTop: 12 }}>
          <Field label="Photo width (mm)">
            <input type="number" min="1" max="1000" step="0.5" value={settings.photoWidth} onChange={(event) => numberInput("photoWidth", event.target.value)} />
          </Field>
          <Field label="Photo height (mm)">
            <input type="number" min="1" max="1000" step="0.5" value={settings.photoHeight} onChange={(event) => numberInput("photoHeight", event.target.value)} />
          </Field>
        </div>
      </section>

      <section className="idd-card" style={card(2)}>
        <h3>Footer</h3>
        <p>The strip at the bottom of every card.</p>
        <Toggle label="Show footer" checked={settings.showFooter} onChange={(checked) => update({ showFooter: checked })} />
        <Toggle label="Show blank QR placeholder" checked={settings.showFooterQr} onChange={(checked) => update({ showFooterQr: checked })} />
        <Toggle label="Show footer hearts" checked={settings.showFooterHearts} onChange={(checked) => update({ showFooterHearts: checked })} />
        <div style={{ marginTop: 12 }}>
          <Field label="Footer text">
            <input
              type="text"
              maxLength="80"
              value={settings.footerText ?? ""}
              onChange={(event) => update({ footerText: event.target.value })}
              disabled={settings.showFooter === false}
            />
          </Field>
        </div>
      </section>
    </div>
  );

  const stylePane = (
    <div className="idd-pane" key="style">
      <section className="idd-card" style={card(0)}>
        <h3>Colors</h3>
        <p>Set the card background, border and text colors.</p>
        <div className="idd-grid">
          <ColorField label="Background" value={bgValue} onChange={(value) => update({ bgColor: value })} />
          <ColorField label="Border" value={settings.borderColor || "#d7ad55"} onChange={(value) => update({ borderColor: value })} />
          <ColorField label="Text color" value={settings.textColor || "#29232a"} onChange={(value) => update({ textColor: value })} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Toggle
            label="Transparent card background"
            checked={settings.bgColor === "transparent"}
            onChange={(checked) => update({ bgColor: checked ? "transparent" : FALLBACK_SETTINGS.bgColor })}
          />
        </div>
      </section>

      <section className="idd-card" style={card(1)}>
        <h3>Typography</h3>
        <p>Click any text on the preview to bold, color or resize it.</p>
        <div className="idd-grid">
          <Field label="Font size (pt)">
            <input type="number" min="6" max="40" step="0.5" value={settings.fontSize} onChange={(event) => numberInput("fontSize", event.target.value)} />
          </Field>
          <Field label="Font family">
            <input type="text" value={settings.fontFamily || ""} onChange={(event) => update({ fontFamily: event.target.value })} />
          </Field>
        </div>
      </section>
    </div>
  );

  const contentPane = (
    <div className="idd-pane" key="content">
      <section className="idd-card" style={card(0)}>
        <h3>Visible fields</h3>
        <p>Choose what appears on each ID card.</p>
        <div className="idd-switch-grid">
          <Toggle label="Name" checked={settings.showName} onChange={(checked) => update({ showName: checked })} />
          <Toggle label="ID No. (Unique ID)" checked={settings.showUniqueId} onChange={(checked) => update({ showUniqueId: checked })} />
          <Toggle label="Mobile" checked={settings.showMobile} onChange={(checked) => update({ showMobile: checked })} />
          <Toggle label="Date of birth" checked={settings.showDob} onChange={(checked) => update({ showDob: checked })} />
          <Toggle label="Age group" checked={settings.showAgeGroup} onChange={(checked) => update({ showAgeGroup: checked })} />
          <Toggle label="Gender" checked={settings.showGender} onChange={(checked) => update({ showGender: checked })} />
          <Toggle label="Registration no." checked={settings.showRegistrationNumber} onChange={(checked) => update({ showRegistrationNumber: checked })} />
          <Toggle label="City" checked={settings.showCity} onChange={(checked) => update({ showCity: checked })} />
          <Toggle label="Melava campaign" checked={settings.showCampaign} onChange={(checked) => update({ showCampaign: checked })} />
        </div>
      </section>

      <section className="idd-card" style={card(1)}>
        <h3>Custom text</h3>
        <p>Add an optional line of your own to the card.</p>
        <Toggle label="Show custom text" checked={settings.showCustomText} onChange={(checked) => update({ showCustomText: checked })} />
        <div style={{ marginTop: 12 }}>
          <Field label="Text">
            <input type="text" maxLength="200" placeholder="Optional footer or header text" value={settings.customText || ""} onChange={(event) => update({ customText: event.target.value })} />
          </Field>
        </div>
      </section>
    </div>
  );

  const agesPane = (
    <div className="idd-pane" key="ages">
      <section className="idd-card" style={card(0)}>
        <div className="idd-card-head">
          <div>
            <h3>Age group codes</h3>
            <p>Used automatically for each candidate based on age. Serial numbers continue per code.</p>
          </div>
          <button type="button" className="idd-btn ghost small" onClick={addGroup}>
            <Plus size={14} /> Add group
          </button>
        </div>
        <div className="idd-age-list">
          {ageGroups.map((group, index) => (
            <div className="idd-age" key={`${group.code}-${index}`} style={{ "--i": Math.min(index, 8) }}>
              <Field label="Code">
                <input type="text" maxLength="10" value={group.code} onChange={(event) => updateGroup(index, { code: event.target.value })} />
              </Field>
              <Field label="Label">
                <input type="text" maxLength="30" value={group.label || ""} onChange={(event) => updateGroup(index, { label: event.target.value })} />
              </Field>
              <Field label="Min age">
                <input type="number" min="1" max="120" value={group.min} onChange={(event) => updateGroup(index, { min: event.target.value === "" ? "" : toNumber(event.target.value, group.min) })} />
              </Field>
              <Field label="Max age">
                <input type="number" min="1" max="120" value={group.max} onChange={(event) => updateGroup(index, { max: event.target.value === "" ? "" : toNumber(event.target.value, group.max) })} />
              </Field>
              <button
                type="button"
                className="idd-btn ghost danger icon"
                onClick={() => removeGroup(index)}
                aria-label={`Remove age group ${group.code}`}
                disabled={ageGroups.length <= 1}
                style={{ height: 40, width: 40 }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!ageGroups.length ? <p className="idd-empty">Add at least one age group before assigning IDs.</p> : null}
        </div>
      </section>
    </div>
  );

  const panes = { layout: layoutPane, style: stylePane, content: contentPane, ages: agesPane };

  return (
    <div className="idd idc-designer">
      <style>{DESIGNER_CSS}</style>

      <section className="idd-panel">
        <div className="idd-head">
          <div>
            <h2>Card settings</h2>
            <p>Configure the ID card layout. Changes preview instantly.</p>
          </div>
          <button type="button" className="idd-btn ghost small" onClick={onReset} disabled={saving}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        <div className="idd-tabs" role="tablist" style={{ "--idd-tab": tabIndex }}>
          <span className="idd-tab-indicator" aria-hidden="true" />
          {TABS.map((item) => (
            <button
              type="button"
              role="tab"
              key={item.key}
              aria-selected={tab === item.key}
              className={`idd-tab ${tab === item.key ? "is-active" : ""}`}
              onClick={() => setTab(item.key)}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="idd-body">{panes[tab]}</div>

        <div className="idd-savebar">
          <small>Save the design to apply it to all cards.</small>
          <button type="button" className="idd-btn" onClick={onSave} disabled={saving}>
            {saving ? <LoaderCircle size={16} className="idd-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save design"}
          </button>
        </div>
      </section>

      <aside className="idd-aside">
        <div className="idd-preview">
          <div className="idd-head">
            <div>
              <h2>Live preview</h2>
              <p>Sample candidate</p>
            </div>
            <span className="idd-size-pill">{cardWidth} × {cardHeight} mm</span>
          </div>
          <div className="idd-preview-body">
            <div className="idc-preview-stage">
              <IdCardPreview
                settings={settings}
                candidate={sample}
                editable
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                onPositionChange={updatePosition}
                onSizeChange={updateSize}
                onCardSizeChange={updateCardSize}
                onEditText={openTextFormatting}
              />
            </div>

            <div className="idd-selected">
              <Field label="Selected item">
                <select value={selectedElement} onChange={(event) => setSelectedElement(event.target.value)}>
                  {POSITIONABLE_ELEMENTS.map((element) => (
                    <option value={element.key} key={element.key}>{element.label}</option>
                  ))}
                </select>
              </Field>
              <div className="idd-grid">
                <Field label={`Horizontal position (${Math.round(selectedPosition.x * 10) / 10}%)`}>
                  <input className="idd-range" type="range" min="0" max={positionLimit("x")} step="0.5" value={selectedPosition.x} onChange={(event) => updateSelectedCoordinate("x", event.target.value)} />
                </Field>
                <Field label={`Vertical position (${Math.round(selectedPosition.y * 10) / 10}%)`}>
                  <input className="idd-range" type="range" min="0" max={positionLimit("y")} step="0.5" value={selectedPosition.y} onChange={(event) => updateSelectedCoordinate("y", event.target.value)} />
                </Field>
                <Field label="Width (%)">
                  <input
                    type="number"
                    min="3"
                    max={sizeLimit("width")}
                    step="0.5"
                    value={Math.round(selectedSize.width * 10) / 10}
                    onChange={(event) => updateSelectedSize("width", event.target.value)}
                  />
                </Field>
                <Field label="Height (%)">
                  <input
                    type="number"
                    min="3"
                    max={sizeLimit("height")}
                    step="0.5"
                    value={Math.round(selectedSize.height * 10) / 10}
                    onChange={(event) => updateSelectedSize("height", event.target.value)}
                  />
                </Field>
              </div>
            </div>

            <p className="idd-hint">
              Drag the card's gold corner handle to resize it. Select an item to move or resize it, or click text to format it.
            </p>
          </div>
        </div>
      </aside>

      {formattingElement && formattingAnchor ? (
        <div
          className={`idd-fmt ${formattingAnchor.placeAbove ? "is-above" : ""}`}
          style={{ left: formattingAnchor.left, top: formattingAnchor.top }}
          role="dialog"
          aria-label={`${formattingLabel} text formatting`}
        >
          <div className="idd-fmt-head">
            <strong>{formattingLabel}</strong>
            <button type="button" className="idd-btn ghost small" onClick={closeFormatting}>
              <X size={14} /> Done
            </button>
          </div>
          <div className="idd-fmt-row">
            <button
              type="button"
              className={`idd-btn ghost icon ${formattingStyle.bold ? "is-active" : ""}`}
              aria-label="Toggle bold"
              aria-pressed={Boolean(formattingStyle.bold)}
              onClick={() => updateTextStyle(formattingElement, { bold: !formattingStyle.bold })}
            ><Bold size={15} /></button>
            <button
              type="button"
              className={`idd-btn ghost icon ${formattingStyle.italic ? "is-active" : ""}`}
              aria-label="Toggle italic"
              aria-pressed={Boolean(formattingStyle.italic)}
              onClick={() => updateTextStyle(formattingElement, { italic: !formattingStyle.italic })}
            ><Italic size={15} /></button>
            <button
              type="button"
              className={`idd-btn ghost icon ${formattingStyle.underline ? "is-active" : ""}`}
              aria-label="Toggle underline"
              aria-pressed={Boolean(formattingStyle.underline)}
              onClick={() => updateTextStyle(formattingElement, { underline: !formattingStyle.underline })}
            ><Underline size={15} /></button>
            <Field label="Text scale (×)">
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={formattingStyle.fontScale ?? 1}
                onChange={(event) => updateTextStyle(formattingElement, {
                  fontScale: Math.min(100, Math.max(0.1, toNumber(event.target.value, 1))),
                })}
              />
            </Field>
            <Field label="Text color">
              <input
                type="color"
                value={formattingStyle.color || "#29232a"}
                onChange={(event) => updateTextStyle(formattingElement, { color: event.target.value })}
              />
            </Field>
            {formattingElement !== "cardBadge" ? (
              <Field label="Alignment">
                <select
                  value={formattingStyle.align || "left"}
                  onChange={(event) => updateTextStyle(formattingElement, { align: event.target.value })}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </Field>
            ) : null}
          </div>

          {visibilitySetting ? (
            <>
              <div style={{ marginTop: 10 }}>
                <Toggle
                  label="Show icon"
                  checked={formattingStyle.showIcon}
                  onChange={(checked) => updateTextStyle(formattingElement, { showIcon: checked })}
                />
                <Toggle
                  label="Show label"
                  checked={formattingStyle.showLabel}
                  onChange={(checked) => updateTextStyle(formattingElement, { showLabel: checked })}
                />
              </div>
              <div className="idd-fmt-row" style={{ marginTop: 10 }}>
                <Field label="Box background">
                  <input
                    type="color"
                    value={formattingStyle.backgroundColor && formattingStyle.backgroundColor !== "transparent"
                      ? formattingStyle.backgroundColor
                      : "#f7ebe9"}
                    onChange={(event) => updateTextStyle(formattingElement, { backgroundColor: event.target.value })}
                  />
                </Field>
                <button
                  type="button"
                  className={`idd-btn ghost small ${formattingStyle.backgroundColor === "transparent" ? "is-active" : ""}`}
                  aria-pressed={formattingStyle.backgroundColor === "transparent"}
                  onClick={() => updateTextStyle(formattingElement, { backgroundColor: "transparent" })}
                >No fill</button>
                <button
                  type="button"
                  className="idd-btn ghost small"
                  onClick={() => {
                    update({ [visibilitySetting]: false });
                    closeFormatting();
                  }}
                ><EyeOff size={14} /> Hide field</button>
              </div>
            </>
          ) : null}

          <div style={{ marginTop: 12 }}>
            <button type="button" className="idd-btn ghost small" onClick={clearTextStyle}>
              <RotateCcw size={13} /> Reset text style
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}