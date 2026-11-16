import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Hash,
  IdCard,
  LayoutTemplate,
  LoaderCircle,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout.jsx";
import AdminPagination from "../../components/AdminPagination.jsx";
import AdminStats from "../../components/AdminStats.jsx";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { useAdminPermission } from "../../../permission-context.jsx";
import { apiMediaUrl, apiUrl, getProfilePhoto, request } from "../../../api";
import BioDataModal from "../Profiles/BioDataModal.jsx";
import IdCardDesigner from "./IdCardDesigner.jsx";
import { FALLBACK_SETTINGS, normalizeIdCardSettings } from "./idCardDefaults.js";
import IdCardPreview from "./IdCardPreview.jsx";
import "../../components/admin-ui.css";
import "./idCards.css";

const MAX_BATCH_PRINT = 1000;
const AGES = Array.from({ length: 103 }, (_, index) => index + 18);
const PREFIX_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*-?$/;
const PREVIEW_LIMIT = 50;
const REVEAL_INTERVAL = 30;
const ROW_SETTLE_TIME = 220;
const PANEL_ANIMATION_MS = 320;

/* -------------------------------------------------------------------------- */
/*  Self-contained animation styles (iOS-style spring curves)                 */
/* -------------------------------------------------------------------------- */
const ANIMATION_CSS = `
.idcx-collapse {
  --idcx-spring: cubic-bezier(0.32, 0.72, 0, 1);
  --idcx-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-10px) scale(0.985);
  transform-origin: top center;
  pointer-events: none;
  transition:
    grid-template-rows ${PANEL_ANIMATION_MS}ms var(--idcx-spring),
    opacity 220ms ease,
    transform ${PANEL_ANIMATION_MS}ms var(--idcx-spring);
}
.idcx-collapse.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
.idcx-collapse-inner { min-height: 0; overflow: hidden; }
.idcx-collapse.is-open .idcx-collapse-inner {
  animation: idcx-unclip 0s linear ${PANEL_ANIMATION_MS}ms forwards;
}
@keyframes idcx-unclip { to { overflow: visible; } }

.idcx-toggle-chevron { transition: transform 480ms var(--idcx-bounce, cubic-bezier(0.34,1.56,0.64,1)); }
.idcx-toggle-chevron.is-open { transform: rotate(180deg); }

.idcx-panel {
  position: relative;
  margin-bottom: 16px;
  overflow: hidden;
}
.idcx-panel::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, #0d9488, #22c55e, #38bdf8, #0d9488);
  background-size: 300% 100%;
  animation: idcx-flow 5s linear infinite;
}
@keyframes idcx-flow { to { background-position: 300% 0; } }

.idcx-rise {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
  animation: idcx-rise 640ms var(--idcx-spring, cubic-bezier(0.32,0.72,0,1)) forwards;
  animation-delay: calc(var(--i, 0) * 70ms + 120ms);
}
@keyframes idcx-rise { to { opacity: 1; transform: none; } }

.idcx-step {
  transition: transform 320ms cubic-bezier(0.32,0.72,0,1), box-shadow 320ms ease, border-color 320ms ease;
}
.idcx-step:focus-within {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -14px rgba(13, 148, 136, 0.55);
}

.idcx-btn-generate {
  position: relative;
  overflow: hidden;
  transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms ease, opacity 200ms ease;
}
.idcx-btn-generate:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 10px 24px -10px rgba(13,148,136,.7); }
.idcx-btn-generate:not(:disabled):active { transform: scale(0.96); }
.idcx-btn-generate.is-saving::after,
.idcx-btn-generate:not(:disabled)::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.35) 50%, transparent 70%);
  transform: translateX(-120%);
  animation: idcx-shine 2.8s ease-in-out infinite;
  pointer-events: none;
}
.idcx-btn-generate.is-saving::after { animation-duration: 1.1s; }
@keyframes idcx-shine { 60%, 100% { transform: translateX(120%); } }

/* summary chips */
.idcx-summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 10px; }
.idcx-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 13px; border-radius: 999px;
  background: rgba(13,148,136,.09);
  border: 1px solid rgba(13,148,136,.18);
  font-size: 13px;
  opacity: 0; transform: scale(0.8) translateY(6px);
  animation: idcx-pop 520ms cubic-bezier(0.34,1.56,0.64,1) forwards;
  animation-delay: calc(var(--i, 0) * 60ms);
}
.idcx-pill.warn { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.3); }
@keyframes idcx-pop { to { opacity: 1; transform: none; } }

/* preview rows */
.idcx-row-in {
  opacity: 0; transform: translateX(-10px);
  animation: idcx-row-in 480ms cubic-bezier(0.32,0.72,0,1) forwards;
  animation-delay: calc(var(--i, 0) * 28ms);
}
@keyframes idcx-row-in { to { opacity: 1; transform: none; } }

/* live assignment */
.idcx-live {
  margin-top: 14px;
  border-radius: 20px;
  border: 1px solid rgba(13,148,136,.2);
  background: linear-gradient(180deg, rgba(13,148,136,.07), rgba(13,148,136,.015));
  overflow: hidden;
  animation: idcx-live-in 240ms cubic-bezier(0.32,0.72,0,1) both;
}
.idcx-live.is-done { border-color: rgba(34,197,94,.45); }
@keyframes idcx-live-in { from { opacity: 0; transform: translateY(18px) scale(0.97); } }

.idcx-live-head { display: flex; align-items: center; gap: 14px; padding: 16px 18px 12px; }
.idcx-live-orb {
  position: relative; flex: none;
  width: 42px; height: 42px; border-radius: 50%;
  display: grid; place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #0d9488, #38bdf8);
  transition: background 500ms ease;
}
.idcx-live.is-done .idcx-live-orb { background: linear-gradient(135deg, #16a34a, #4ade80); animation: idcx-orb-pop 600ms cubic-bezier(0.34,1.56,0.64,1); }
.idcx-live:not(.is-done) .idcx-live-orb::after {
  content: ""; position: absolute; inset: -5px; border-radius: 50%;
  border: 2px solid rgba(13,148,136,.45);
  animation: idcx-ripple 1.6s ease-out infinite;
}
@keyframes idcx-ripple { from { transform: scale(0.85); opacity: 1; } to { transform: scale(1.45); opacity: 0; } }
@keyframes idcx-orb-pop { 0% { transform: scale(0.6); } 100% { transform: scale(1); } }
.idcx-live-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.idcx-live-title strong { font-size: 15px; }
.idcx-live-title span { font-size: 12.5px; opacity: .7; }
.idcx-live-count { font-variant-numeric: tabular-nums; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.idcx-live-count small { font-size: 13px; font-weight: 500; opacity: .6; }

.idcx-track { height: 7px; margin: 0 18px 12px; border-radius: 99px; background: rgba(13,148,136,.15); overflow: hidden; }
.idcx-track > span {
  display: block; height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, #0d9488, #22c55e);
  transition: width 360ms cubic-bezier(0.32,0.72,0,1);
  position: relative; overflow: hidden;
}
.idcx-track > span::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: idcx-shine 1.4s ease-in-out infinite;
}
.idcx-live.is-done .idcx-track > span::after { display: none; }

.idcx-feed {
  max-height: 340px; overflow-y: auto; padding: 4px 12px 14px;
  display: flex; flex-direction: column; gap: 8px;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}
.idcx-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 16px;
  background: rgba(255,255,255,.6);
  border: 1px solid rgba(13,148,136,.12);
  animation: idcx-item-in 220ms cubic-bezier(0.34,1.4,0.64,1) both;
  transition: background 450ms ease, border-color 450ms ease, box-shadow 450ms ease;
}
@media (prefers-color-scheme: dark) { .idcx-item { background: rgba(255,255,255,.05); } }
.idcx-item.is-done { border-color: rgba(34,197,94,.3); }
.idcx-item.is-working { box-shadow: 0 8px 22px -12px rgba(13,148,136,.7); border-color: rgba(13,148,136,.45); }
@keyframes idcx-item-in {
  from { opacity: 0; transform: translateY(22px) scale(0.92); filter: blur(4px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}
.idcx-avatar {
  flex: none; width: 36px; height: 36px; border-radius: 50%;
  display: grid; place-items: center; font-size: 13px; font-weight: 700;
  background: rgba(13,148,136,.14); color: #0f766e;
}
.idcx-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.idcx-item-main strong { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.idcx-item-main small { font-size: 12px; opacity: .65; }
.idcx-item-id { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.idcx-old-id { font-size: 11.5px; opacity: .5; text-decoration: line-through; }
.idcx-new-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 14px; font-weight: 700; letter-spacing: .02em;
  font-variant-numeric: tabular-nums;
  padding: 3px 9px; border-radius: 9px;
  background: rgba(13,148,136,.12); color: #0f766e;
  transition: background 400ms ease, color 400ms ease;
}
.idcx-item.is-done .idcx-new-id { background: rgba(34,197,94,.16); color: #15803d; }
.idcx-status { flex: none; width: 26px; height: 26px; display: grid; place-items: center; }
.idcx-check {
  width: 24px; height: 24px; border-radius: 50%;
  display: grid; place-items: center; color: #fff; background: #22c55e;
  animation: idcx-check 220ms cubic-bezier(0.34,1.7,0.64,1) both;
}
@keyframes idcx-check { from { transform: scale(0) rotate(-40deg); } to { transform: scale(1) rotate(0); } }
.idcx-spin { animation: idcx-spin 0.9s linear infinite; color: #0d9488; }
@keyframes idcx-spin { to { transform: rotate(360deg); } }
.idcx-more { text-align: center; font-size: 12.5px; opacity: .7; padding: 4px 0 0; animation: idcx-item-in 500ms ease both; }

.idcx-saving {
  margin-top: 14px; padding: 16px 18px; border-radius: 18px;
  display: flex; align-items: center; gap: 12px;
  border: 1px dashed rgba(13,148,136,.4);
  background: linear-gradient(110deg, rgba(13,148,136,.05) 30%, rgba(13,148,136,.14) 50%, rgba(13,148,136,.05) 70%);
  background-size: 250% 100%;
  animation: idcx-skeleton 1.4s ease-in-out infinite, idcx-live-in 500ms cubic-bezier(0.32,0.72,0,1) both;
}
@keyframes idcx-skeleton { to { background-position: -150% 0; } }

.idcx-alert { animation: idcx-shake 520ms cubic-bezier(0.36,0.07,0.19,0.97) both; }
@keyframes idcx-shake {
  10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); } 40%, 60% { transform: translateX(4px); }
}

@media (prefers-reduced-motion: reduce) {
  .idcx-collapse, .idcx-collapse *, .idcx-panel *, .idcx-live, .idcx-live * {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function resolveCardPhotos(cards) {
  return mapWithLimit(cards, 5, async (card) => {
    if (!card.photo_proxy_path) return { ...card, photoSrc: "" };

    try {
      const response = await request(`${apiUrl}${card.photo_proxy_path}`, { raw: true });
      return { ...card, photoSrc: URL.createObjectURL(await response.blob()) };
    } catch {
      return { ...card, photoSrc: "" };
    }
  });
}

function releaseCardPhotos(cards = []) {
  cards.forEach((card) => {
    if (card.photoSrc?.startsWith("blob:")) URL.revokeObjectURL(card.photoSrc);
  });
}

async function downloadCardsPdf(nodes, settings, filename = "id-cards.pdf") {
  if (!nodes.length) return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  await document.fonts.ready;
  const images = nodes.flatMap((node) => Array.from(node.querySelectorAll("img")));
  await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
  const width = Number(settings.cardWidth) || FALLBACK_SETTINGS.cardWidth;
  const height = Number(settings.cardHeight) || FALLBACK_SETTINGS.cardHeight;
  const orientation = width > height ? "l" : "p";
  let pdf = null;

  for (const node of nodes) {
    const canvas = await html2canvas(node, {
      scale: 4,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const image = canvas.toDataURL("image/png");
    if (!pdf) pdf = new jsPDF({ orientation, unit: "mm", format: [width, height] });
    else pdf.addPage([width, height], orientation);
    pdf.addImage(image, "PNG", 0, 0, width, height);
  }
  pdf?.save(filename);
}

const initials = (value) => String(value || "")
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join("") || "?";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const SCRAMBLE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

/* Slot-machine style text: scrambles, then settles on the real value. */
function ScrambleText({ text, active, duration = ROW_SETTLE_TIME }) {
  const [display, setDisplay] = useState(active ? "" : text);

  useEffect(() => {
    if (!active) return undefined;
    const startedAt = Date.now();
    const tick = () => {
      const progress = Math.min((Date.now() - startedAt) / duration, 1);
      const settled = Math.floor(progress * text.length);
      setDisplay(
        text
          .split("")
          .map((char, index) => {
            if (char === "-" || index < settled) return char;
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join(""),
      );
      if (progress >= 1) window.clearInterval(timer);
    };
    const timer = window.setInterval(tick, 45);
    tick();
    return () => window.clearInterval(timer);
  }, [text, active, duration]);

  return <>{active ? display || text : text}</>;
}

/* One candidate row in the live feed: "assigning" -> locked in with a check. */
function LiveAssignRow({ candidate }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), ROW_SETTLE_TIME);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={`idcx-item ${done ? "is-done" : "is-working"}`}>
      <span className="idcx-avatar">{initials(candidate.full_name)}</span>
      <span className="idcx-item-main">
        <strong>{candidate.full_name || "Unnamed candidate"}</strong>
        <small>
          {candidate.registration_number ? `${candidate.registration_number} · ` : ""}
          Age {candidate.age ?? "—"}
        </small>
      </span>
      <span className="idcx-item-id">
        {candidate.current_unique_id_number ? (
          <span className="idcx-old-id">{candidate.current_unique_id_number}</span>
        ) : null}
        <span className="idcx-new-id">
          <ScrambleText text={String(candidate.proposed_unique_id_number || "")} active={!done} />
        </span>
      </span>
      <span className="idcx-status" aria-hidden="true">
        {done ? (
          <span className="idcx-check"><BadgeCheck size={14} /></span>
        ) : (
          <LoaderCircle size={20} className="idcx-spin" />
        )}
      </span>
    </div>
  );
}

/* Live feed: candidates appear one by one while IDs are being assigned. */
function LiveAssignFeed({ items, updatedCount, onComplete }) {
  const [shown, setShown] = useState(0);
  const [finished, setFinished] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    if (shown < items.length) {
      const timer = window.setTimeout(() => setShown((current) => current + 1), shown === 0 ? 80 : REVEAL_INTERVAL);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setFinished(true), ROW_SETTLE_TIME + 150);
    return () => window.clearTimeout(timer);
  }, [shown, items.length]);

  useEffect(() => {
    const node = feedRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
  }, [shown]);

  useEffect(() => {
    if (!finished) return undefined;
    const timer = window.setTimeout(onComplete, 300);
    return () => window.clearTimeout(timer);
  }, [finished, onComplete]);

  const total = items.length;
  const percent = total ? Math.round((Math.min(shown, total) / total) * 100) : 100;
  const hiddenCount = Math.max(0, (updatedCount || 0) - total);

  return (
    <div className={`idcx-live ${finished ? "is-done" : ""}`} role="status" aria-live="polite">
      <div className="idcx-live-head">
        <span className="idcx-live-orb">
          {finished ? <BadgeCheck size={22} /> : <Sparkles size={20} />}
        </span>
        <span className="idcx-live-title">
          <strong>{finished ? "All unique numbers assigned" : "Assigning unique numbers live"}</strong>
          <span>
            {finished
              ? `${updatedCount ?? total} record(s) saved successfully`
              : "Each candidate is locked in as their number is generated"}
          </span>
        </span>
        <span className="idcx-live-count">
          {Math.min(shown, total)}<small> / {total}</small>
        </span>
      </div>
      <div className="idcx-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
      <div className="idcx-feed" ref={feedRef}>
        {items.slice(0, shown).map((candidate) => (
          <LiveAssignRow key={candidate.id} candidate={candidate} />
        ))}
        {finished && hiddenCount > 0 ? (
          <p className="idcx-more">+ {hiddenCount} more candidate(s) were updated in the background.</p>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Assignment panel                                                          */
/* -------------------------------------------------------------------------- */
function IdCardAssignmentPanel({
  campaigns,
  campaignId,
  onCampaignChange,
  onAssigned,
  onClose,
}) {
  const [prefix, setPrefix] = useState("");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(25);
  const [maritalStatus, setMaritalStatus] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [liveItems, setLiveItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const debouncedPrefix = useDebouncedValue(prefix, 350);
  const activePrefix = debouncedPrefix.trim().toUpperCase();
  const prefixError = prefix.trim() && !PREFIX_PATTERN.test(prefix.trim().toUpperCase())
    ? "Use letters and numbers separated by hyphens, for example AA-02 or AA-01-."
    : "";

  useEffect(() => {
    if (!result || liveItems.length > 0) return undefined;
    const timer = window.setTimeout(onClose, 400);
    return () => window.clearTimeout(timer);
  }, [result, liveItems.length, onClose]);

  useEffect(() => {
    if (!PREFIX_PATTERN.test(activePrefix)) {
      requestId.current += 1;
      return undefined;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      if (id !== requestId.current) return;
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          prefix: activePrefix,
          age_min: String(ageMin),
          age_max: String(ageMax),
        });
        if (campaignId && campaignId !== "all") params.set("campaign_id", campaignId);
        if (maritalStatus) params.set("marital_status", maritalStatus);
        const response = await request(`/id-cards/assignment/preview?${params.toString()}`);
        if (id === requestId.current) setPreview(response?.data || null);
      } catch (err) {
        if (id === requestId.current) {
          setPreview(null);
          setError(err.message || "Unable to preview the unique numbers.");
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [activePrefix, ageMin, ageMax, maritalStatus, campaignId]);

  const resetPreview = () => {
    requestId.current += 1;
    setPreview(null);
    setResult(null);
    setLiveItems([]);
    setError("");
    setLoading(false);
  };

  const changePrefix = (value) => {
    setPrefix(value.toUpperCase());
    resetPreview();
  };

  const changeAgeMin = (value) => {
    const next = Number(value);
    setAgeMin(next);
    if (next > ageMax) setAgeMax(next);
    resetPreview();
  };

  const changeAgeMax = (value) => {
    const next = Number(value);
    setAgeMax(next);
    if (next < ageMin) setAgeMin(next);
    resetPreview();
  };

  const save = async () => {
    if (!preview || preview.total === 0) return;
    if (preview.overwrite_count > 0) {
      const confirmed = window.confirm(
        `${preview.overwrite_count} matching candidate(s) already have a different unique number. Overwrite them with the generated numbers?`,
      );
      if (!confirmed) return;
    }

    const snapshot = (preview.candidates || [])
      .filter((candidate) => candidate.will_update)
      .slice(0, PREVIEW_LIMIT);

    setSaving(true);
    setError("");
    setResult(null);
    setLiveItems([]);
    try {
      const response = await request("/id-cards/assign", {
        method: "POST",
        body: {
          prefix: preview.prefix,
          age_min: preview.age_min,
          age_max: preview.age_max,
          campaign_id: preview.campaign_id || null,
          marital_status: preview.marital_status || null,
          overwrite_existing: preview.overwrite_count > 0,
        },
      });
      setLiveItems(snapshot);
      setResult(response?.data || {});
      onAssigned?.(response);
    } catch (err) {
      setError(err.message || "Unable to generate the unique numbers.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(preview && preview.total > 0 && !loading && !saving);
  const rise = (index) => ({ "--i": index });

  return (
    <div className="ui-card idc-assign-panel idcx-panel">
      <div className="idc-panel-head idcx-rise" style={rise(0)}>
        <div>
          <h2>Generate unique numbers</h2>
          <p>Choose a Melava, enter a code and age range, then preview the registrations that will be updated.</p>
        </div>
        <div className="idc-assignment-head-actions">
          <button type="button" className="ui-btn small secondary" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="idc-assign-controls">
        <div className="idc-assign-step idcx-step idcx-rise" style={rise(1)}>
          <div className="idc-assign-step-head">
            <span className="idc-step-badge">1</span>
            <span>Melava event</span>
          </div>
          <label className="idc-input">
            <span className="idc-sr-only">Choose a Melava event</span>
            <select
              value={campaignId || "all"}
              onChange={(event) => {
                onCampaignChange(event.target.value);
                resetPreview();
              }}
            >
              <option value="all">All Melavas</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={String(campaign.id)}>
                  {campaign.melava_code ? `${campaign.melava_code} · ` : ""}
                  {campaign.title || "Melava"}
                  {campaign.status === "active" ? " (Active)" : " (Inactive)"}
                </option>
              ))}
            </select>
          </label>
          <p className="idc-assign-help">Defaults to the current active Melava. Only matching registrations in this selection will be updated.</p>
        </div>

        <div className="idc-assign-step idcx-step idcx-rise" style={rise(2)}>
          <div className="idc-assign-step-head">
            <span className="idc-step-badge">2</span>
            <span>Unique code / prefix</span>
          </div>
          <label className="idc-input">
            <span className="idc-sr-only">Unique code or prefix</span>
            <input
              type="text"
              value={prefix}
              maxLength={40}
              autoComplete="off"
              placeholder="AA-02"
              onChange={(event) => changePrefix(event.target.value)}
            />
          </label>
          <p className="idc-assign-help">Use letters and numbers with hyphens, for example AA-02 or AA-01-.</p>
        </div>

        <div className="idc-assign-step idcx-step idcx-rise" style={rise(3)}>
          <div className="idc-assign-step-head">
            <span className="idc-step-badge">3</span>
            <span>Age range from date of birth</span>
          </div>
          <div className="idc-age-range">
            <select value={ageMin} onChange={(event) => changeAgeMin(event.target.value)} aria-label="Minimum age">
              {AGES.map((age) => <option key={`min-${age}`} value={age}>{age}</option>)}
            </select>
            <span>to</span>
            <select value={ageMax} onChange={(event) => changeAgeMax(event.target.value)} aria-label="Maximum age">
              {AGES.map((age) => <option key={`max-${age}`} value={age}>{age}</option>)}
            </select>
            <span>years</span>
          </div>
          <p className="idc-assign-help">Both ages are included in the match.</p>
          <label className="idc-input idc-assignment-status">
            <span>Marital status</span>
            <select
              value={maritalStatus}
              onChange={(event) => {
                setMaritalStatus(event.target.value);
                resetPreview();
              }}
            >
              <option value="">All marital statuses</option>
              <option value="Unmarried">Unmarried</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
            </select>
          </label>
        </div>

        <div className="idc-assign-step idc-assign-step-action idcx-step idcx-rise" style={rise(4)}>
          <div className="idc-assign-step-head">
            <span className="idc-step-badge">4</span>
            <span>Generate numbers</span>
          </div>
          <button
            type="button"
            className={`ui-btn idc-assign-submit idcx-btn-generate ${saving ? "is-saving" : ""}`}
            onClick={save}
            disabled={!canSave}
          >
            {saving ? <LoaderCircle size={16} className="idcx-spin" style={{ color: "inherit" }} /> : <Hash size={16} />}
            {" "}{saving ? "Assigning..." : "Generate / Update Unique Numbers"}
          </button>
          <p className="idc-assign-help">Changes are applied to every matching registration.</p>
        </div>
      </div>

      {prefixError ? <div className="idc-alert idcx-alert" role="alert">{prefixError}</div> : null}
      {error ? <div className="idc-alert idcx-alert" role="alert">{error}</div> : null}
      {loading ? (
        <p className="idc-hint idc-assign-loading"><LoaderCircle size={15} className="ui-spin" /> Finding all matching candidates...</p>
      ) : null}

      {saving ? (
        <div className="idcx-saving" role="status">
          <LoaderCircle size={20} className="idcx-spin" />
          <span>
            <strong>Generating unique numbers…</strong>
            <br />
            <small>Applying to every matching registration</small>
          </span>
        </div>
      ) : null}

      {(result || preview)?.existing_id_conflict_count > 0 ? (
        <div className="idc-alert idcx-alert" role="alert">
          Existing ID(s) {(result || preview).existing_id_conflict_numbers?.join(", ")} were skipped. Generation will continue with the next available numbers.
        </div>
      ) : null}

      {result && liveItems.length ? (
        <LiveAssignFeed items={liveItems} updatedCount={result.updated_count} onComplete={onClose} />
      ) : null}

      {result && !liveItems.length ? (
        <div className="idc-hint idc-assign-result idcx-rise">
          <strong>{result.updated_count ?? 0}</strong> record(s) updated. <strong>{result.assigned_count ?? 0}</strong> matching candidate(s) now have unique numbers.
        </div>
      ) : null}

      {preview && !result && !saving ? (
        <div className="idc-preview-result">
          <div className="idcx-summary">
            <span className="idcx-pill" style={rise(0)}><strong>{preview.total}</strong> matching</span>
            <span className="idcx-pill" style={rise(1)}><strong>{preview.new_count}</strong> new</span>
            <span className={`idcx-pill ${preview.overwrite_count > 0 ? "warn" : ""}`} style={rise(2)}>
              <strong>{preview.overwrite_count}</strong> will be overwritten
            </span>
            <span className="idcx-pill" style={rise(3)}><strong>{preview.unchanged_count}</strong> unchanged</span>
            <span className="idcx-pill" style={rise(4)}>
              <strong>{preview.first_number || "—"}</strong> → <strong>{preview.last_number || "—"}</strong>
            </span>
          </div>
          {preview.overwrite_count > 0 ? (
            <div className="idc-alert idcx-alert" role="alert">
              {preview.overwrite_count} matching candidate(s) already have a different number. You will be asked to confirm before they are overwritten.
            </div>
          ) : null}
          {preview.total === 0 ? (
            <div className="idc-empty-preview"><p>No candidates with a date of birth fall in this age range.</p></div>
          ) : (
            <>
              <div className="idc-table-scroll">
                <table className="idc-table">
                  <thead>
                    <tr><th>Candidate</th><th>Age</th><th>Current ID</th><th>Generated ID</th></tr>
                  </thead>
                  <tbody>
                    {preview.candidates.slice(0, PREVIEW_LIMIT).map((candidate, index) => (
                      <tr key={candidate.id} className="idcx-row-in" style={{ "--i": Math.min(index, 14) }}>
                        <td>
                          {candidate.full_name || "Unnamed candidate"}
                          {candidate.registration_number ? <span className="idc-muted"> · {candidate.registration_number}</span> : null}
                        </td>
                        <td>{candidate.age}</td>
                        <td>{candidate.current_unique_id_number || "—"}</td>
                        <td><strong>{candidate.proposed_unique_id_number}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.total > PREVIEW_LIMIT ? (
                <p className="idc-muted">Showing the first {PREVIEW_LIMIT} of {preview.total} records. All matching records will be updated.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function IdCardPreviewModal({ card, settings, onClose, onPrint, onDownload }) {
  if (!card) return null;

  return (
    <div className="idc-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section className="idc-dialog idc-card-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="idc-card-preview-title">
        <header className="idc-dialog-head">
          <div>
            <h2 id="idc-card-preview-title">{card.full_name || "Candidate"} · ID Card</h2>
            <p>{card.unique_id_number || "ID not assigned"}{card.registration_number ? ` · ${card.registration_number}` : ""}</p>
          </div>
          <button type="button" className="idc-icon-btn" onClick={onClose} aria-label="Close card preview">
            <X size={18} />
          </button>
        </header>

        <div className="idc-preview-stage idc-dialog-stage">
          <IdCardPreview settings={settings} candidate={card} photoSrc={card.photoSrc} />
        </div>

        <footer className="idc-dialog-foot">
          <button type="button" className="ui-btn secondary" onClick={onClose}>Close</button>
          <button type="button" className="ui-btn secondary" onClick={onPrint}>
            <Printer size={16} /> Print
          </button>
          <button type="button" className="ui-btn" onClick={onDownload}>
            <Download size={16} /> Download ID Card PDF
          </button>
        </footer>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main screen                                                               */
/* -------------------------------------------------------------------------- */
function IdCardCandidates({ settings, allowGeneration = false, source = "melava" }) {
  const hasGenerationPermission = useAdminPermission("create", null, "id_card_generation");
  const canGenerateIds = Boolean(source === "melava" && allowGeneration && hasGenerationPermission);
  const canExportBiodata = useAdminPermission("export", null, "admin_side_profile");
  const candidatesEndpoint = source === "profiles" ? "/id-cards/all-candidates" : "/id-cards/candidates";
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, assigned: 0, unassigned: 0 });
  const [ageGroups, setAgeGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [defaultCampaignId, setDefaultCampaignId] = useState("all");
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignError, setCampaignError] = useState("");
  const [gender, setGender] = useState("all");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [ageGroup, setAgeGroup] = useState("all");
  const [assigned, setAssigned] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [previewCard, setPreviewCard] = useState(null);
  const [bioDataPreview, setBioDataPreview] = useState(null);
  const [printCards, setPrintCards] = useState([]);
  const [pendingAction, setPendingAction] = useState("");
  const [toast, setToast] = useState(null);
  // Hidden by default. `panelMounted` keeps it in the DOM during the close animation.
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  // Filters are collapsible on phones (always visible on larger screens).
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelTimer = useRef(null);
  const requestId = useRef(0);
  const bioDataRequestId = useRef(0);
  const printRef = useRef(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const activeSearch = debouncedSearch.trim();
  const dateError = dateFrom && dateTo && dateFrom > dateTo ? "End date cannot be before the start date." : "";

  useEffect(() => () => window.clearTimeout(panelTimer.current), []);

  const openAssignment = () => {
    window.clearTimeout(panelTimer.current);
    setPanelMounted(true);
    // Let the closed state paint first so the spring-open transition runs.
    panelTimer.current = window.setTimeout(() => setAssignmentOpen(true), 30);
  };

  const closeAssignment = useCallback(() => {
    window.clearTimeout(panelTimer.current);
    setAssignmentOpen(false);
    panelTimer.current = window.setTimeout(() => setPanelMounted(false), PANEL_ANIMATION_MS + 80);
  }, []);

  const toggleAssignment = () => {
    if (assignmentOpen) closeAssignment();
    else openAssignment();
  };

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    setCampaignError("");
    try {
      const response = await request("/id-cards/campaigns");
      if (!Array.isArray(response?.data)) throw new Error("The Melava list response was invalid.");

      const allCampaigns = response.data;
      const activeCampaign = allCampaigns.find((campaign) => campaign.status === "active");
      const nextDefaultId = activeCampaign ? String(activeCampaign.id) : "all";
      setCampaigns(allCampaigns);
      setDefaultCampaignId(nextDefaultId);
      setCampaignId(nextDefaultId);
    } catch (loadError) {
      setCampaignError(loadError.message || "Unable to load Melava filters.");
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const buildParams = useCallback((extra = {}) => {
    const params = new URLSearchParams();
    if (activeSearch) params.set("q", activeSearch);
    if (campaignId && campaignId !== "all") params.set("campaign_id", campaignId);
    if (gender !== "all") params.set("gender", gender);
    if (maritalStatus) params.set("marital_status", maritalStatus);
    if (ageGroup !== "all") params.set("age_group", ageGroup);
    if (assigned !== "all") params.set("assigned", assigned);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    });
    return params;
  }, [activeSearch, campaignId, gender, maritalStatus, ageGroup, assigned, dateFrom, dateTo]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (campaignsLoading || campaignError || dateError) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = buildParams({ per_page: "20", page: String(page) });
      const response = await request(`${candidatesEndpoint}?${params.toString()}`);
      if (id !== requestId.current) return;
      setRows(Array.isArray(response?.data?.data) ? response.data.data : []);
      setPagination(response?.data || null);
      setStats({ total: 0, assigned: 0, unassigned: 0, ...(response?.stats || {}) });
      setAgeGroups(Array.isArray(response?.age_groups) ? response.age_groups : []);
    } catch (err) {
      if (id === requestId.current) setError(err.message || "Unable to load ID card candidates.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [buildParams, campaignError, campaignsLoading, candidatesEndpoint, dateError, page]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => releaseCardPhotos(printCards), [printCards]);

  useEffect(() => {
    if (!pendingAction || !printCards.length) return undefined;
    let cancelled = false;

    const run = async () => {
      await new Promise((resolve) => { window.setTimeout(resolve, 180); });
      await document.fonts.ready;
      const images = Array.from(printRef.current?.querySelectorAll("img") || []);
      await Promise.all(images.map((image) => image.decode?.().catch(() => undefined)));
      if (cancelled) return;
      try {
        if (pendingAction === "print") {
          const exitPrintMode = () => {
            document.body.classList.remove("idc-printing");
            window.removeEventListener("afterprint", exitPrintMode);
          };
          document.body.classList.add("idc-printing");
          window.addEventListener("afterprint", exitPrintMode, { once: true });
          try {
            window.print();
          } finally {
            window.setTimeout(exitPrintMode, 1000);
          }
        } else {
          const nodes = Array.from(printRef.current?.querySelectorAll(".idc-card") || []);
          await downloadCardsPdf(nodes, settings, `aaryans-id-cards-${Date.now()}.pdf`);
        }
      } catch (err) {
        setToast({ type: "error", message: err.message || "Unable to create the card file." });
      } finally {
        if (!cancelled) setPendingAction("");
      }
    };

    run();
    return () => { cancelled = true; };
  }, [pendingAction, printCards, settings]);

  const hasFilters = Boolean(
    activeSearch || campaignId !== defaultCampaignId || gender !== "all" || maritalStatus
    || ageGroup !== "all" || assigned !== "all" || dateFrom || dateTo,
  );

  const activeFilterCount = [
    activeSearch, campaignId && campaignId !== "all", gender !== "all", maritalStatus,
    ageGroup !== "all", assigned !== "all", dateFrom, dateTo,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setCampaignId(defaultCampaignId);
    setGender("all");
    setMaritalStatus("");
    setAgeGroup("all");
    setAssigned("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const pageIds = rows.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleRow = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const selectAllMatching = async () => {
    setSelecting(true);
    setError("");
    try {
      const params = buildParams({ ids_only: "1" });
      const response = await request(`${candidatesEndpoint}?${params.toString()}`);
      const ids = Array.isArray(response?.data) ? response.data : [];
      setSelected(new Set(ids));
      setToast({ type: "success", message: `${ids.length} candidate${ids.length === 1 ? "" : "s"} selected.` });
    } catch (err) {
      setError(err.message || "Unable to select all matching candidates.");
    } finally {
      setSelecting(false);
    }
  };

  const fetchCards = async (ids) => {
    const params = new URLSearchParams();
    params.set("ids", ids.join(","));
    if (source === "profiles") {
      params.set("per_page", String(ids.length));
      const response = await request(`${candidatesEndpoint}?${params.toString()}`);
      return Array.isArray(response?.data?.data) ? response.data.data : [];
    }
    const response = await request(`/id-cards/cards?${params.toString()}`);
    return Array.isArray(response?.data) ? response.data : [];
  };

  const openPreview = async (row, rowNumber) => {
    const id = ++bioDataRequestId.current;
    if (previewCard) releaseCardPhotos([previewCard]);
    setBioDataPreview(null);
    setPreviewCard({ ...row, rowNumber, photoSrc: "" });

    try {
      const [card] = await resolveCardPhotos([row]);
      if (id !== bioDataRequestId.current) {
        releaseCardPhotos([card]);
        return;
      }

      setPreviewCard((current) => current?.id === row.id
        ? { ...current, photoSrc: card.photoSrc }
        : current);
    } catch (err) {
      if (id === bioDataRequestId.current) {
        setToast({ type: "error", message: err.message || "Unable to prepare the card preview." });
      }
    }
  };

  const openBioDataPreview = async (row, rowNumber) => {
    if (!canExportBiodata || !row.profile_id) return;
    const id = ++bioDataRequestId.current;
    if (previewCard) releaseCardPhotos([previewCard]);
    setPreviewCard(null);
    setBioDataPreview({ profileId: row.profile_id, rowNumber, profile: null, loading: true, error: "" });

    try {
      const response = await request(`/profiles/${row.profile_id}/biodata-preview`);
      if (!response?.data) throw new Error("The Bio Data preview was empty.");
      if (id === bioDataRequestId.current) {
        setBioDataPreview((current) => current?.profileId === row.profile_id
          ? { ...current, profile: response.data, loading: false }
          : current);
      }
    } catch (err) {
      if (id === bioDataRequestId.current) {
        setBioDataPreview((current) => current?.profileId === row.profile_id
          ? { ...current, loading: false, error: err.message || "Unable to load candidate Bio Data." }
          : current);
      }
    }
  };

  const closeBioDataPreview = () => {
    bioDataRequestId.current += 1;
    setBioDataPreview(null);
  };

  const prepareBatch = async (action = "pdf", cardList = null) => {
    const ids = cardList ? cardList.map((card) => card.id) : Array.from(selected);
    if (!ids.length) {
      setToast({ type: "error", message: "Select at least one candidate first." });
      return;
    }
    if (ids.length > MAX_BATCH_PRINT) {
      setToast({ type: "error", message: `Select up to ${MAX_BATCH_PRINT} cards at a time for printing.` });
      return;
    }

    try {
      const cards = cardList || await fetchCards(ids);
      if (!cards.length) throw new Error("No eligible cards were found for the selection.");
      const withPhotos = await resolveCardPhotos(cards);
      setPrintCards(withPhotos);
      setPendingAction(action);
    } catch (err) {
      setToast({ type: "error", message: err.message || "Unable to prepare the cards." });
    }
  };

  const closePreview = () => {
    bioDataRequestId.current += 1;
    releaseCardPhotos(previewCard ? [previewCard] : []);
    setPreviewCard(null);
  };

  const openBiodataFullPage = ({ template, orientation }) => {
    if (!canExportBiodata || !bioDataPreview?.profile || !bioDataPreview.profileId) return;
    const cacheKey = `melava-biodata-preview:${bioDataPreview.profileId}:${Date.now()}`;
    const urlParams = new URLSearchParams({
      template: template.id,
      orientation,
      sr_no: String(bioDataPreview.rowNumber || 1),
      cache_key: cacheKey,
    });

    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(bioDataPreview.profile));
    } catch {
      setToast({ type: "error", message: "Could not prepare Bio Data for the full-page view." });
      return;
    }

    const pageWindow = window.open(`/admin/melava-biodata/${bioDataPreview.profileId}?${urlParams.toString()}`, "_blank");
    if (!pageWindow) {
      sessionStorage.removeItem(cacheKey);
      setToast({ type: "error", message: "Allow pop-ups to open the full-page Bio Data preview." });
      return;
    }
    pageWindow.opener = null;
    closeBioDataPreview();
  };

  const statItems = useMemo(() => [
    { key: "total", label: "Candidates", value: stats.total, icon: Users, tone: "teal", hint: "Matching filters" },
    { key: "assigned", label: "Assigned IDs", value: stats.assigned, icon: BadgeCheck, tone: "green", hint: "Unique ID issued" },
    { key: "unassigned", label: "Unassigned IDs", value: stats.unassigned, icon: IdCard, tone: "amber", hint: "Ready for assignment" },
  ], [stats]);

  return (
    <div className="idc-candidates">
      <style>{ANIMATION_CSS}</style>

      <div className={`idc-actionbar ${selected.size ? "has-selection" : ""}`}>
        <div className="idc-selection">
          <strong>{selected.size ? `${selected.size} selected` : "No candidates selected"}</strong>
          <span>Select up to {MAX_BATCH_PRINT.toLocaleString("en-IN")} candidates per print batch.</span>
        </div>
        <div className="idc-actionbar-buttons">
          {canGenerateIds ? (
            <button
              type="button"
              className="ui-btn small secondary is-primary"
              onClick={toggleAssignment}
              disabled={campaignsLoading || Boolean(campaignError)}
              aria-expanded={assignmentOpen}
              aria-controls="idc-assignment-panel"
            >
              <Hash size={14} /> Generate IDs
              <ChevronDown size={14} className={`idcx-toggle-chevron ${assignmentOpen ? "is-open" : ""}`} />
            </button>
          ) : null}
          {selected.size ? (
            <button type="button" className="ui-btn small secondary" onClick={() => setSelected(new Set())}>
              <X size={14} /> Clear
            </button>
          ) : (
            <button type="button" className="ui-btn small secondary" onClick={selectAllMatching} disabled={selecting || loading}>
              {selecting ? "Selecting..." : "Select all matching"}
            </button>
          )}
          <button type="button" className="ui-btn small secondary" onClick={() => prepareBatch("print")} disabled={!selected.size}>
            <Printer size={14} /> Print cards
          </button>
          <button
            type="button"
            className={`ui-btn small secondary ${selected.size ? "is-solid" : ""}`}
            onClick={() => prepareBatch("pdf")}
            disabled={!selected.size}
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Hidden by default - springs open when "Generate IDs" is clicked */}
      {canGenerateIds ? (
        <div
          id="idc-assignment-panel"
          className={`idcx-collapse ${assignmentOpen ? "is-open" : ""}`}
          aria-hidden={!assignmentOpen}
        >
          <div className="idcx-collapse-inner">
            {panelMounted ? (
              <IdCardAssignmentPanel
                campaigns={campaigns}
                campaignId={campaignId}
                onCampaignChange={(value) => {
                  setCampaignId(value);
                  setPage(1);
                }}
                onAssigned={() => {
                  setSelected(new Set());
                  load();
                  setToast({ type: "success", message: "Unique numbers generated successfully." });
                }}
                onClose={closeAssignment}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <AdminStats items={statItems} loading={loading && !pagination} label="ID card candidate statistics" />

      <button
        type="button"
        className="idc-filter-toggle"
        onClick={() => setFiltersOpen((value) => !value)}
        aria-expanded={filtersOpen}
        aria-controls="idc-filters"
      >
        <SlidersHorizontal size={16} /> Filters
        {activeFilterCount > 0 ? <span className="idc-filter-count">{activeFilterCount}</span> : null}
        <ChevronDown size={16} className={`idcx-toggle-chevron ${filtersOpen ? "is-open" : ""}`} />
      </button>

      <div id="idc-filters" className={`ui-card ui-toolbar idc-filter-toolbar ${filtersOpen ? "is-open" : ""}`}>
        <label className="ui-search">
          <Search size={17} />
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search name, registration, mobile or unique ID"
            aria-label="Search by name, registration number, mobile or unique ID"
          />
          {search ? (
            <button type="button" onClick={() => { setSearch(""); setPage(1); }} aria-label="Clear search"><X size={16} /></button>
          ) : null}
        </label>
        <select
          className="ui-select"
          value={campaignId || "all"}
          onChange={(event) => { setCampaignId(event.target.value); setPage(1); }}
          aria-label="Filter by Melava"
          disabled={campaignsLoading || Boolean(campaignError)}
        >
          <option value="all">All Melavas</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={String(campaign.id)}>
              {campaign.melava_code ? `${campaign.melava_code} · ` : ""}
              {campaign.title || "Melava"}
              {campaign.status === "active" ? " (Active)" : " (Inactive)"}
            </option>
          ))}
        </select>
        <select className="ui-select" value={gender} onChange={(event) => { setGender(event.target.value); setPage(1); }} aria-label="Filter by gender">
          <option value="all">All genders</option>
          <option value="groom">Groom</option>
          <option value="bride">Bride</option>
        </select>
        <select className="ui-select" value={maritalStatus} onChange={(event) => { setMaritalStatus(event.target.value); setPage(1); }} aria-label="Filter by marital status">
          <option value="">All marital statuses</option>
          <option value="Unmarried">Unmarried</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
          <option value="Separated">Separated</option>
        </select>
        <select className="ui-select" value={ageGroup} onChange={(event) => { setAgeGroup(event.target.value); setPage(1); }} aria-label="Filter by age group">
          <option value="all">All age groups</option>
          {ageGroups.map((group) => (
            <option key={group.code} value={group.code}>{group.code}{group.label ? ` · ${group.label}` : ""}</option>
          ))}
        </select>
        <select className="ui-select" value={assigned} onChange={(event) => { setAssigned(event.target.value); setPage(1); }} aria-label="Filter by ID assignment">
          <option value="all">All ID status</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <div className="idc-date-range">
          <label className="idc-date-filter">
            <span>From</span>
            <input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
          </label>
          <label className="idc-date-filter">
            <span>To</span>
            <input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
          </label>
          {hasFilters ? <button type="button" className="ui-reset" onClick={clearFilters}>Clear filters</button> : null}
        </div>
      </div>

      {dateError ? <div className="ui-alert" role="alert"><span>{dateError}</span></div> : null}

      {campaignError || error ? (
        <div className="ui-alert" role="alert">
          <span>{campaignError || error}</span>
          <button
            type="button"
            className="ui-btn small secondary"
            onClick={campaignError ? loadCampaigns : load}
            disabled={loading || campaignsLoading}
          >
            Try again
          </button>
        </div>
      ) : null}

      <div className="ui-card ui-table-card">
        <div className={`ui-table-scroll ${loading ? "is-loading" : ""}`}>
          <table className="ui-table idc-responsive">
            <thead>
              <tr>
                <th className="idc-check-col">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={togglePage}
                    aria-label="Select all candidates on this page"
                    disabled={!rows.length}
                  />
                </th>
                <th>Candidate</th>
                <th>Unique ID</th>
                <th>Age / Gender</th>
                <th>City</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !rows.length ? Array.from({ length: 6 }, (_, index) => (
                <tr className="ui-skeleton-row" key={`idc-skeleton-${index}`}>
                  <td colSpan="7"><span /></td>
                </tr>
              )) : null}
              {!loading && !rows.length ? (
                <tr>
                  <td colSpan="7">
                    <div className="ui-state">
                      <Search size={30} />
                      <strong>No candidates found</strong>
                      <p>No Melava registrations match your current filters.</p>
                      {hasFilters ? <button type="button" className="ui-btn small" onClick={clearFilters}>Clear filters</button> : null}
                    </div>
                  </td>
                </tr>
              ) : null}
              {rows.map((row, index) => {
                const photo = apiMediaUrl(getProfilePhoto(row, ["photo_url", "profile_photo_url", "profile_photo"]));
                const isSelected = selected.has(row.id);
                const rowNumber = (pagination?.from || 1) + index;
                const profileDetailsUrl = row.profile_id
                  ? `/admin/profiles/${row.profile_id}/details?sr_no=${rowNumber}`
                  : null;
                return (
                  <tr key={row.id} className={isSelected ? "is-selected" : ""}>
                    <td className="idc-check-col" data-label="">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Select ${row.full_name || "candidate"}`}
                      />
                    </td>
                    <td className="idc-cell-person" data-label="">
                      <div className="ui-person">
                        {photo ? (
                          profileDetailsUrl ? (
                            <Link to={profileDetailsUrl} className="ui-avatar" aria-label={`View profile of ${row.full_name || "candidate"}`}>
                              <img src={photo} alt="" loading="lazy" />
                            </Link>
                          ) : (
                            <span className="ui-avatar"><img src={photo} alt="" loading="lazy" /></span>
                          )
                        ) : (
                          profileDetailsUrl ? (
                            <Link to={profileDetailsUrl} className="ui-avatar" aria-label={`View profile of ${row.full_name || "candidate"}`}>
                              {initials(row.full_name)}
                            </Link>
                          ) : (
                            <span className="ui-avatar">{initials(row.full_name)}</span>
                          )
                        )}
                        <span className="ui-person-text">
                          <strong>
                            {profileDetailsUrl ? (
                              <Link className="ui-link" to={profileDetailsUrl}>{row.full_name || "Unnamed candidate"}</Link>
                            ) : row.full_name || "Unnamed candidate"}
                          </strong>
                          <small>{row.mobile || "Mobile unavailable"}</small>
                          <small>{row.registration_number || "No registration number"}</small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Unique ID">
                      {row.unique_id_number ? (
                        <span className="ui-chip idc-id-chip">{row.unique_id_number}</span>
                      ) : (
                        <span className="ui-badge amber">Unassigned</span>
                      )}
                    </td>
                    <td data-label="Age / Gender">
                      <div className="idc-age-cell">
                        <strong>{row.age ?? "—"}{row.age !== null && row.age !== undefined ? " yrs" : ""}</strong>
                        <span>{row.age_group_label || row.age_group || "No age group"} · {row.gender || "—"}</span>
                      </div>
                    </td>
                    <td data-label="City">{row.city || "-"}</td>
                    <td data-label="Registered" className="ui-muted">{formatDate(row.registration_date)}</td>
                    <td className="idc-cell-actions" data-label="">
                      <div className="ui-actions">
                        <button type="button" className="ui-btn small secondary" onClick={() => openPreview(row, (pagination?.from || 1) + index)} title="Preview ID card">
                          <Eye size={14} /> Preview
                        </button>
                        <button
                          type="button"
                          className="ui-btn small secondary"
                          onClick={() => openBioDataPreview(row, (pagination?.from || 1) + index)}
                          disabled={!canExportBiodata || !row.profile_id}
                          title={!canExportBiodata ? "Bio Data export permission is required" : "Preview candidate Bio Data"}
                        >
                          <FileText size={14} /> Bio Data
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pagination ? (
          <AdminPagination
            page={pagination.current_page || page}
            lastPage={pagination.last_page || 1}
            from={pagination.from}
            to={pagination.to}
            total={pagination.total}
            onPage={setPage}
            disabled={loading}
            label="ID card candidate pagination"
          />
        ) : null}
      </div>

      {previewCard ? (
        <IdCardPreviewModal
          card={previewCard}
          settings={settings}
          onClose={closePreview}
          onPrint={() => prepareBatch("print", [previewCard])}
          onDownload={() => prepareBatch("pdf", [previewCard])}
        />
      ) : null}

      {bioDataPreview ? (
        <BioDataModal
          profile={bioDataPreview.profile}
          loading={bioDataPreview.loading}
          loadError={bioDataPreview.error}
          onClose={closeBioDataPreview}
          onOpenFullScreen={openBiodataFullPage}
        />
      ) : null}

      <div
        className="idc-print-root"
        ref={printRef}
        aria-hidden="true"
        style={{
          "--idc-print-width": `${Number(settings.cardWidth) || FALLBACK_SETTINGS.cardWidth}mm`,
          "--idc-print-height": `${Number(settings.cardHeight) || FALLBACK_SETTINGS.cardHeight}mm`,
        }}
      >
        {printCards.map((card) => (
          <div className="idc-print-item" key={card.id}>
            <IdCardPreview settings={settings} candidate={card} photoSrc={card.photoSrc} />
          </div>
        ))}
      </div>

      {toast ? <div className={`idc-toast ${toast.type}`} role="status">{toast.message}</div> : null}
    </div>
  );
}

export default function IdCards({ currentPath = "/admin/id-generation", mode = "generation" }) {
  const isPrinter = mode === "printer";
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
    <AdminLayout currentPath={currentPath}>
      <div className="adm-ui idc-page">
        <div className="ui-head">
          <div>
            <h1>{isPrinter ? "ID Printer" : "ID Generation"}</h1>
            <p>
              {isPrinter
                ? "Search candidates, preview ID cards, view Bio Data, and print or download cards."
                : "Generate unique candidate IDs and manage the reusable card design."}
            </p>
          </div>
          <div className="ui-head-actions">
            <button type="button" className="ui-btn secondary" onClick={loadDesign} disabled={loading}>
              <RefreshCw size={16} className={loading ? "ui-spin" : ""} /> Refresh design
            </button>
          </div>
        </div>

        <div className={`idc-view-tabs ${isPrinter ? "is-printer-tabs" : ""}`} role="group" aria-label="ID Cards sections">
            <button
              type="button"
              className={`idc-view-tab ${view === "candidates" ? "is-active" : ""}`}
              aria-pressed={view === "candidates"}
              onClick={() => setView("candidates")}
            >
              <Users size={20} aria-hidden="true" />
              <span className="idc-view-tab-copy">
                <strong>Melava Candidates &amp; Cards</strong>
                <small>Search Melava registrations, view ID cards, and open Bio Data.</small>
              </span>
            </button>
            <button
              type="button"
              className={`idc-view-tab ${view === "all-candidates" ? "is-active" : ""}`}
              aria-pressed={view === "all-candidates"}
              onClick={() => setView("all-candidates")}
            >
              <Search size={20} aria-hidden="true" />
              <span className="idc-view-tab-copy">
                <strong>All Candidates</strong>
                <small>Search every profile; cards without a Melava ID keep that field blank.</small>
              </span>
            </button>
            {!isPrinter ? (
              <button
                type="button"
                className={`idc-view-tab ${view === "design" ? "is-active" : ""}`}
                aria-pressed={view === "design"}
                onClick={() => setView("design")}
              >
                <LayoutTemplate size={20} aria-hidden="true" />
                <span className="idc-view-tab-copy">
                  <strong>Card Design</strong>
                  <small>Customize the reusable candidate ID card layout.</small>
                </span>
              </button>
            ) : null}
          </div>

        {error ? (
          <div className="ui-alert" role="alert">
            <span>{error}</span>
            <button type="button" className="ui-btn small secondary" onClick={loadDesign} disabled={loading}>Try again</button>
          </div>
        ) : null}

        {!isPrinter && view === "design" ? (
          <IdCardDesigner
            settings={settings}
            onChange={setSettings}
            onSave={saveDesign}
            onReset={resetDesign}
            saving={saving}
          />
        ) : (
          <IdCardCandidates
            settings={settings}
            allowGeneration={!isPrinter && view === "candidates"}
            source={view === "all-candidates" ? "profiles" : "melava"}
          />
        )}
      </div>

      {toast ? <div className={`idc-toast ${toast.type}`} role="status">{toast.message}</div> : null}
    </AdminLayout>
  );
}