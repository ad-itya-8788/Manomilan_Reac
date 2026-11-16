import { useEffect, useState } from "react";
import {
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gift,
  Megaphone,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { getPublicWebsiteSettings } from "./api.js";
import "./website.css";

const ICONS = {
  calendar: Calendar,
  sparkles: Sparkles,
  megaphone: Megaphone,
  bell: Bell,
  gift: Gift,
  star: Star,
};

export default function WebsiteUpcomingEvents() {
  const [settings, setSettings] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let active = true;
    getPublicWebsiteSettings().then((data) => {
      if (active) setSettings(data?.upcoming_events || null);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key === "ArrowLeft") {
        setActiveImage((index) => {
          const count = settings?.images?.length || 0;
          return count > 1 ? (index - 1 + count) % count : index;
        });
      }
      if (event.key === "ArrowRight") {
        setActiveImage((index) => {
          const count = settings?.images?.length || 0;
          return count > 1 ? (index + 1) % count : index;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, settings?.images]);

  if (!settings?.enabled) return null;

  const Icon = ICONS[settings.icon] || Calendar;
  const position = settings.position === "bottom-left" ? "bottom-left" : "bottom-right";
  const images = Array.isArray(settings.images)
    ? settings.images.filter((image) => typeof image?.url === "string" && image.url)
    : [];
  const hasCarousel = images.length > 0;
  const currentImage = images[activeImage] || images[0];
  const style = {
    "--website-event-bg": settings.background_color || "#c4144f",
    "--website-event-color": settings.text_color || "#ffffff",
  };
  const content = (
    <>
      <Icon size={18} strokeWidth={2.4} />
      <span className="website-event-label">{settings.label || "Upcoming Events"}</span>
      <span className="website-event-heart" aria-hidden="true">♥</span>
    </>
  );

  if (!hasCarousel && settings.url) {
    return (
      <a
        className={`website-event-btn ${position}`}
        style={style}
        href={settings.url}
        target={settings.open_new_tab ? "_blank" : undefined}
        rel={settings.open_new_tab ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  const button = (
    <button
      type="button"
      className={`website-event-btn ${position}${hasCarousel ? "" : " static"}`}
      style={style}
      onClick={hasCarousel ? () => {
        setActiveImage(0);
        setIsOpen(true);
      } : undefined}
      aria-haspopup={hasCarousel ? "dialog" : undefined}
    >
      {content}
    </button>
  );

  return (
    <>
      {button}
      {isOpen && currentImage ? (
        <div
          className="website-event-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            className="website-event-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={settings.label || "Upcoming Events"}
          >
            <button
              type="button"
              className="website-event-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close Upcoming Events"
            >
              <X size={20} />
            </button>
            <h2>{settings.label || "Upcoming Events"}</h2>
            <div className="website-event-carousel">
              {images.length > 1 ? (
                <button
                  type="button"
                  className="website-event-arrow previous"
                  onClick={() => setActiveImage((index) => (index - 1 + images.length) % images.length)}
                  aria-label="Previous event image"
                >
                  <ChevronLeft size={24} />
                </button>
              ) : null}
              <img
                className="website-event-image"
                src={currentImage.url}
                alt={`${settings.label || "Upcoming Event"} ${activeImage + 1}`}
              />
              {images.length > 1 ? (
                <button
                  type="button"
                  className="website-event-arrow next"
                  onClick={() => setActiveImage((index) => (index + 1) % images.length)}
                  aria-label="Next event image"
                >
                  <ChevronRight size={24} />
                </button>
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className="website-event-dots" aria-label="Choose event image">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={image.path || image.url}
                    className={index === activeImage ? "active" : ""}
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show event image ${index + 1}`}
                    aria-current={index === activeImage ? "true" : undefined}
                  />
                ))}
              </div>
            ) : null}
            {settings.url ? (
              <a
                className="website-event-action"
                href={settings.url}
                target={settings.open_new_tab ? "_blank" : undefined}
                rel={settings.open_new_tab ? "noopener noreferrer" : undefined}
              >
                View event details
              </a>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
