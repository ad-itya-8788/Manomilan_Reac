import { useRef } from "react";
import {
  CalendarDays,
  FileText,
  Heart,
  IdCard,
  MapPin,
  Phone,
  Tag,
  UserRound,
  UsersRound,
  Venus,
} from "lucide-react";
import { apiMediaUrl } from "../../../api";
import { FALLBACK_SETTINGS } from "./idCardDefaults.js";

const initials = (value) => String(value || "")
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join("") || "?";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const valueOrDash = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function DraggableItem({
  as: Element = "div",
  canvasRef,
  positionKey,
  label,
  position,
  size,
  editable,
  selected,
  onSelect,
  onPositionChange,
  onSizeChange,
  onEditText,
  className = "",
  style = {},
  children,
}) {
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const startMove = (event) => {
    if (!editable || !canvasRef.current) return;
    event.preventDefault();
    const element = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - element.left,
      offsetY: event.clientY - element.top,
      width: element.width,
      height: element.height,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onSelect?.(positionKey);
  };

  const move = (event) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !canvas) return;
    if (Math.abs(event.clientX - drag.startX) > 3 || Math.abs(event.clientY - drag.startY) > 3) {
      drag.moved = true;
    }
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    if (drag.mode === "resize") {
      const maxWidth = Math.max(3, 100 - position.x);
      const maxHeight = Math.max(3, 100 - position.y);
      onSizeChange?.(positionKey, {
        width: Math.round(clamp(drag.width + ((event.clientX - drag.startX) / bounds.width) * 100, 3, maxWidth) * 10) / 10,
        height: Math.round(clamp(drag.height + ((event.clientY - drag.startY) / bounds.height) * 100, 3, maxHeight) * 10) / 10,
      });
      return;
    }

    const x = clamp(event.clientX - bounds.left - drag.offsetX, 0, Math.max(0, bounds.width - drag.width));
    const y = clamp(event.clientY - bounds.top - drag.offsetY, 0, Math.max(0, bounds.height - drag.height));
    onPositionChange(positionKey, {
      x: Math.round((x / bounds.width) * 1000) / 10,
      y: Math.round((y / bounds.height) * 1000) / 10,
    });
  };

  const startResize = (event) => {
    if (!editable || !canvasRef.current || !onSizeChange) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current.getBoundingClientRect();
    const element = event.currentTarget.parentElement.getBoundingClientRect();
    if (!canvas.width || !canvas.height) return;

    dragRef.current = {
      mode: "resize",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: (element.width / canvas.width) * 100,
      height: (element.height / canvas.height) * 100,
    };
    event.currentTarget.parentElement.setPointerCapture?.(event.pointerId);
    onSelect?.(positionKey);
  };

  const finishPointer = () => {
    if (dragRef.current?.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    dragRef.current = null;
  };

  const handleClick = (event) => {
    if (!editable || !onEditText || suppressClickRef.current) return;
    onSelect?.(positionKey);
    onEditText(positionKey, event);
  };

  const moveByKeyboard = (event) => {
    const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const step = steps[event.key];
    if (!editable || !step || !canvasRef.current) return;
    event.preventDefault();
    const bounds = canvasRef.current.getBoundingClientRect();
    const element = event.currentTarget.getBoundingClientRect();
    const amount = event.shiftKey ? 5 : 1;
    const maxX = Math.max(0, ((bounds.width - element.width) / bounds.width) * 100);
    const maxY = Math.max(0, ((bounds.height - element.height) / bounds.height) * 100);
    onSelect?.(positionKey);
    onPositionChange(positionKey, {
      x: clamp(position.x + step[0] * amount, 0, maxX),
      y: clamp(position.y + step[1] * amount, 0, maxY),
    });
  };

  const classNames = [
    className,
    editable ? "idc-canvas-element" : "",
    editable && selected ? "is-selected" : "",
  ].filter(Boolean).join(" ");

  return (
    <Element
      className={classNames}
      style={{
        position: "absolute",
        left: `${position.x}%`,
        top: `${position.y}%`,
        ...(size ? { width: `${size.width}%`, height: `${size.height}%` } : {}),
        ...style,
      }}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? `Move ${label}; use arrow keys to position` : undefined}
      title={editable ? `Drag to move ${label}; use arrow keys to position` : undefined}
      onPointerDown={editable ? startMove : undefined}
      onPointerMove={editable ? move : undefined}
      onPointerUp={editable ? finishPointer : undefined}
      onPointerCancel={editable ? finishPointer : undefined}
      onFocus={editable ? () => onSelect?.(positionKey) : undefined}
      onKeyDown={editable ? moveByKeyboard : undefined}
      onClick={handleClick}
    >
      {children}
      {editable && selected && onSizeChange ? (
        <span
          className="idc-resize-handle"
          onPointerDown={startResize}
          aria-hidden="true"
        />
      ) : null}
    </Element>
  );
}

export default function IdCardPreview({
  candidate = {},
  settings = {},
  photoSrc = "",
  className = "",
  editable = false,
  selectedElement = "",
  onSelectElement,
  onPositionChange,
  onSizeChange,
  onCardSizeChange,
  onEditText,
}) {
  const canvasRef = useRef(null);
  const cardResizeRef = useRef(null);
  const canEdit = editable && typeof onPositionChange === "function";
  const positions = Object.fromEntries(
    Object.entries(FALLBACK_SETTINGS.fieldPositions).map(([key, fallback]) => [
      key,
      { ...fallback, ...(settings.fieldPositions?.[key] || {}) },
    ]),
  );
  const positionFor = (key) => positions[key] || { x: 0, y: 0 };
  const show = (key) => settings[key] !== false;
  const footerText = settings.footerText ?? FALLBACK_SETTINGS.footerText;
  const photo = photoSrc || apiMediaUrl(candidate.photo_url);
  const fields = [];

  if (show("showName")) fields.push({ key: "name", label: "Name", value: valueOrDash(candidate.full_name), icon: UserRound, strong: true });
  if (show("showUniqueId")) fields.push({
    key: "uniqueId",
    label: "ID No.",
    value: candidate.blank_id_when_unassigned && !candidate.unique_id_number ? "" : valueOrDash(candidate.unique_id_number),
    icon: IdCard,
    id: true,
  });
  if (show("showDob")) fields.push({ key: "dob", label: "Date of Birth", value: valueOrDash(formatDate(candidate.birth_date)), icon: CalendarDays });
  if (show("showAgeGroup")) fields.push({ key: "ageGroup", label: "Age Group", value: valueOrDash(candidate.age_group_label || candidate.age_group), icon: UsersRound });
  if (show("showGender")) fields.push({ key: "gender", label: "Gender", value: valueOrDash(candidate.gender || candidate.groomorbride), icon: Venus });
  if (show("showRegistrationNumber")) fields.push({ key: "registrationNumber", label: "Reg. No.", value: valueOrDash(candidate.registration_number), icon: FileText });
  if (show("showMobile")) fields.push({ key: "mobile", label: "Mobile", value: valueOrDash(candidate.mobile), icon: Phone });
  if (show("showCity")) fields.push({ key: "city", label: "City", value: valueOrDash(candidate.city), icon: MapPin });
  if (show("showCampaign")) fields.push({ key: "campaign", label: "Melava", value: valueOrDash(candidate.campaign_title || candidate.campaign_code), icon: Tag });

  const cardWidth = Number(settings.cardWidth) || 130;
  const cardHeight = Number(settings.cardHeight) || 70;
  const padding = Number(settings.padding ?? FALLBACK_SETTINGS.padding);
  const canvasWidth = Math.max(1, cardWidth - padding * 2);
  const canvasHeight = Math.max(1, cardHeight - padding * 2);
  const sizeFor = (key, fallback) => {
    const saved = settings.elementSizes?.[key];
    const width = Number(saved?.width);
    const height = Number(saved?.height);
    return {
      width: Number.isFinite(width) && width > 0 ? clamp(width, 3, 100) : clamp(fallback.width, 3, 100),
      height: Number.isFinite(height) && height > 0 ? clamp(height, 3, 100) : clamp(fallback.height, 3, 100),
    };
  };
  const textStyleFor = (key) => settings.textStyles?.[key] || {};
  const fieldBackgroundStyle = (key) => {
    const backgroundColor = textStyleFor(key).backgroundColor;
    if (!backgroundColor) return {};
    if (backgroundColor === "transparent") {
      return { background: "none", borderColor: "transparent" };
    }
    return {
      backgroundColor,
    };
  };
  const textLayoutStyle = (key, baseScale = 1) => {
    const textStyle = textStyleFor(key);
    const fontScale = Number(textStyle.fontScale);
    return {
      ...(Number.isFinite(fontScale) && fontScale > 0 && fontScale !== 1 ? { fontSize: `${baseScale * fontScale}em` } : {}),
      ...(textStyle.italic ? { fontStyle: "italic" } : {}),
      ...(textStyle.underline ? { textDecoration: "underline" } : {}),
      ...(textStyle.align ? { textAlign: textStyle.align } : {}),
    };
  };
  const textEmphasisStyle = (key) => {
    const textStyle = textStyleFor(key);
    return {
      ...(typeof textStyle.bold === "boolean" ? { fontWeight: textStyle.bold ? 800 : 400 } : {}),
      ...(textStyle.color ? { color: textStyle.color } : {}),
    };
  };
  const sizes = {
    branding: sizeFor("branding", { width: 100, height: 25 }),
    photo: sizeFor("photo", {
      width: ((Number(settings.photoWidth) || FALLBACK_SETTINGS.photoWidth) / canvasWidth) * 100,
      height: ((Number(settings.photoHeight) || FALLBACK_SETTINGS.photoHeight) / canvasHeight) * 100,
    }),
    name: sizeFor("name", { width: 70, height: 12 }),
    uniqueId: sizeFor("uniqueId", { width: 34, height: 10 }),
    dob: sizeFor("dob", { width: 34, height: 10 }),
    ageGroup: sizeFor("ageGroup", { width: 34, height: 10 }),
    gender: sizeFor("gender", { width: 34, height: 10 }),
    registrationNumber: sizeFor("registrationNumber", { width: 34, height: 10 }),
    mobile: sizeFor("mobile", { width: 34, height: 10 }),
    city: sizeFor("city", { width: 34, height: 10 }),
    campaign: sizeFor("campaign", { width: 34, height: 10 }),
    customText: sizeFor("customText", { width: 96, height: 8 }),
    footer: sizeFor("footer", { width: 100, height: 14 }),
  };
  const cardStyle = {
    width: `${cardWidth}mm`,
    height: `${cardHeight}mm`,
    background: settings.bgColor || "#fffaf3",
    borderColor: settings.borderColor || "#d7ad55",
    color: settings.textColor || "#29232a",
    fontFamily: settings.fontFamily || "Poppins, Arial, sans-serif",
    fontSize: `${Number(settings.fontSize) || 11}pt`,
    "--idc-padding": `${Number(settings.padding ?? FALLBACK_SETTINGS.padding)}mm`,
    "--idc-accent": settings.borderColor || "#d7ad55",
    "--idc-card-width": `${cardWidth}mm`,
    "--idc-card-height": `${cardHeight}mm`,
  };

  const startCardResize = (event) => {
    if (!canEdit || !onCardSizeChange) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = event.currentTarget.parentElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    cardResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: cardWidth,
      height: cardHeight,
      pixelWidth: bounds.width,
      pixelHeight: bounds.height,
    };
    event.currentTarget.parentElement.setPointerCapture?.(event.pointerId);
  };

  const resizeCard = (event) => {
    const drag = cardResizeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    onCardSizeChange({
      width: drag.width + ((event.clientX - drag.startX) / drag.pixelWidth) * drag.width,
      height: drag.height + ((event.clientY - drag.startY) / drag.pixelHeight) * drag.height,
    });
  };

  const finishCardResize = (event) => {
    if (cardResizeRef.current?.pointerId === event.pointerId) {
      cardResizeRef.current = null;
    }
  };

  const resizeCardByKeyboard = (event) => {
    const increments = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const increment = increments[event.key];
    if (!increment || !onCardSizeChange) return;
    event.preventDefault();
    const amount = event.shiftKey ? 5 : 1;
    onCardSizeChange({
      width: cardWidth + increment[0] * amount,
      height: cardHeight + increment[1] * amount,
    });
  };

  const photoNode = show("showPhoto") ? (
    <DraggableItem
      canvasRef={canvasRef}
      positionKey="photo"
      position={positionFor("photo")}
      size={sizes.photo}
      label="candidate photo"
      editable={canEdit}
      selected={selectedElement === "photo"}
      onSelect={onSelectElement}
      onPositionChange={onPositionChange}
      onSizeChange={onSizeChange}
      className={`idc-photo ${photo ? "" : "is-empty"}`.trim()}
      style={{
        borderColor: settings.borderColor || "#d7ad55",
      }}
    >
      {photo
        ? <img src={photo} alt={`${candidate.full_name || "Candidate"} profile`} draggable="false" />
        : <span>{initials(candidate.full_name)}</span>}
    </DraggableItem>
  ) : null;

  return (
    <article
      className={`idc-card ${canEdit ? "is-editable" : ""} ${className}`.trim()}
      style={cardStyle}
      onPointerMove={canEdit ? resizeCard : undefined}
      onPointerUp={canEdit ? finishCardResize : undefined}
      onPointerCancel={canEdit ? finishCardResize : undefined}
    >
      <div className="idc-canvas" ref={canvasRef}>
        {show("showBranding") ? (
          <DraggableItem
            as="header"
            canvasRef={canvasRef}
            positionKey="branding"
            position={positionFor("branding")}
            size={sizes.branding}
            label="logo and organization name"
            editable={canEdit}
            selected={selectedElement === "branding"}
            onSelect={onSelectElement}
            onPositionChange={onPositionChange}
            onSizeChange={onSizeChange}
            onEditText={onEditText}
            className="idc-header"
          >
            <img src="/img/aaryan-manomilan-logo.png" alt="Aaryans Manomilan logo" className="idc-logo" draggable="false" />
            <span className="idc-header-divider" aria-hidden="true" />
            <div className="idc-org" style={{ textAlign: textStyleFor("branding").align || "left" }}>
              <strong style={{ ...textLayoutStyle("branding", 1.18), ...textEmphasisStyle("branding") }}>Aaryans Manomilan</strong>
            </div>
            <span
              className="idc-card-badge"
              style={{ ...textLayoutStyle("cardBadge", 0.72), ...textEmphasisStyle("cardBadge") }}
              onClick={canEdit ? (event) => {
                event.stopPropagation();
                onSelectElement?.("branding");
                onEditText?.("cardBadge", event);
              } : undefined}
            ><IdCard size={16} /> ID Card</span>
          </DraggableItem>
        ) : null}

        {photoNode}

        {fields.map((field) => {
          const backgroundStyle = fieldBackgroundStyle(field.key);
          const fieldStyle = textStyleFor(field.key);
          return (
          <DraggableItem
            key={field.key}
            canvasRef={canvasRef}
            positionKey={field.key}
            position={positionFor(field.key)}
            size={sizes[field.key]}
            label={field.label}
            editable={canEdit}
            selected={selectedElement === field.key}
            onSelect={onSelectElement}
            onPositionChange={onPositionChange}
            onSizeChange={onSizeChange}
            onEditText={onEditText}
            className={`idc-field ${field.strong ? "is-strong" : ""} ${field.id ? "is-id" : ""} ${field.key === "name" ? "is-name" : ""}`.trim()}
            style={{ textAlign: settings.align || "left", ...backgroundStyle }}
          >
            {fieldStyle.showIcon !== false ? (
              <span
                className="idc-field-icon"
                style={backgroundStyle.background === "none" ? { background: "none" } : undefined}
              ><field.icon size={16} strokeWidth={2.1} /></span>
            ) : null}
            <span className="idc-field-copy" style={textLayoutStyle(field.key)}>
              {fieldStyle.showLabel !== false ? (
                <span className="idc-field-label" style={textEmphasisStyle(field.key)}>{field.label}</span>
              ) : null}
              <strong style={textEmphasisStyle(field.key)}>{field.value}</strong>
            </span>
          </DraggableItem>
          );
        })}

        {settings.customText && show("showCustomText") ? (
          <DraggableItem
            canvasRef={canvasRef}
            positionKey="customText"
            position={positionFor("customText")}
            size={sizes.customText}
            label="custom text"
            editable={canEdit}
            selected={selectedElement === "customText"}
            onSelect={onSelectElement}
            onPositionChange={onPositionChange}
            onSizeChange={onSizeChange}
            onEditText={onEditText}
            className="idc-custom"
            style={{ ...textLayoutStyle("customText", 0.56), ...textEmphasisStyle("customText") }}
          >
            {settings.customText}
          </DraggableItem>
        ) : null}

        {show("showFooter") ? (
          <DraggableItem
            as="footer"
            canvasRef={canvasRef}
            positionKey="footer"
            position={positionFor("footer")}
            size={sizes.footer}
            label="footer"
            editable={canEdit}
            selected={selectedElement === "footer"}
            onSelect={onSelectElement}
            onPositionChange={onPositionChange}
            onSizeChange={onSizeChange}
            onEditText={onEditText}
            className="idc-footer"
          >
            {show("showFooterQr") ? <div className="profile-qr-placeholder" aria-hidden="true" /> : null}
            {footerText ? (
              <span
                className="idc-qr-caption"
                style={{ ...textLayoutStyle("footer", 0.62), ...textEmphasisStyle("footer") }}
              >{footerText}</span>
            ) : null}
            {show("showFooterHearts") ? (
              <span className="idc-footer-hearts" aria-hidden="true">
                <Heart size={20} />
                <Heart size={16} />
              </span>
            ) : null}
          </DraggableItem>
        ) : null}
      </div>
      {canEdit && onCardSizeChange ? (
        <button
          type="button"
          className="idc-card-resize-handle"
          aria-label="Resize whole ID card"
          title="Drag to resize the whole card"
          onPointerDown={startCardResize}
          onKeyDown={resizeCardByKeyboard}
        />
      ) : null}
    </article>
  );
}
