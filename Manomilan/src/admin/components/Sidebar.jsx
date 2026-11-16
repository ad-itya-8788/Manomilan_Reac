import { useContext, useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarHeart,
  CalendarPlus,
  Database,
  FileText,
  Globe,
  GraduationCap,
  Hash,
  HeartHandshake,
  IdCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Printer,
  Settings,
  ShieldAlert,
  Ticket,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { clearSession } from "../../auth";
import { AdminPermissionContext, hasModulePermission } from "../../permission-context.jsx";
import { getAdminChatUnread } from "../../Chat/Services/chatApi";
import { menuItems } from "../data/adminData";
import WebsiteSidebarGroup from "./WebsiteSidebarGroup";

const SYSTEM_MANAGEMENT = {
  label: "System Management",
  path: "/admin/system-management",
};

const ICONS = {
  "/admin": LayoutDashboard,
  "/admin/chat": MessageCircle,
  "/admin/success-stories": HeartHandshake,
  "/admin/profiles": Users,
  "/admin/nri-profiles": Globe,
  "/admin/verified-profiles": BadgeCheck,
  "/admin/unverified-profiles": ShieldAlert,
  "/admin/melava": CalendarHeart,
  "/admin/melava-campaigns": CalendarPlus,
  "/admin/id-generation": Hash,
  "/admin/id-printer": Printer,
  "/admin/id-cards": IdCard,
  "/admin/workshop-events": GraduationCap,
  "/admin/workshop": GraduationCap,
  "/admin/requests": UserPlus,
  "/admin/reset-passwords": KeyRound,
  "/admin/report": FileText,
  "/admin/software-tickets": Ticket,
  "/admin/system-management": Settings,
  "/admin/database-master": Database,
};

const ICON_COLORS = {
  "/admin": "#2f80ed",
  "/admin/chat": "#7c3aed",
  "/admin/success-stories": "#e11d48",
  "/admin/profiles": "#8b5cf6",
  "/admin/nri-profiles": "#14b8a6",
  "/admin/verified-profiles": "#22c55e",
  "/admin/unverified-profiles": "#f97316",
  "/admin/melava": "#ec4899",
  "/admin/melava-campaigns": "#e11d48",
  "/admin/id-generation": "#0f766e",
  "/admin/id-printer": "#0e7490",
  "/admin/id-cards": "#0f766e",
  "/admin/workshop-events": "#b70650",
  "/admin/workshop": "#7c3aed",
  "/admin/requests": "#0ea5e9",
  "/admin/reset-passwords": "#f59e0b",
  "/admin/report": "#6366f1",
  "/admin/software-tickets": "#0891b2",
  "/admin/system-management": "#0f766e",
  "/admin/database-master": "#be123c",
};

export default function Sidebar({ currentPath, onNavigate }) {
  const access = useContext(AdminPermissionContext);
  const canViewChat = hasModulePermission(access, "view", "/admin/chat", "chat_support");
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (!canViewChat) return undefined;
    let active = true;
    const loadUnread = () => {
      getAdminChatUnread()
        .then((data) => {
          if (active) setUnreadChatCount(Number(data?.unread_count) || 0);
        })
        .catch(() => {});
    };
    loadUnread();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") loadUnread();
    }, 20000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [canViewChat]);

  const items = [...menuItems, SYSTEM_MANAGEMENT];
  const visibleItems = items.filter((item) =>
    (!item.requiresSuperAdmin || access?.is_super_admin)
    && hasModulePermission(access, "view", item.path)
  );
  const activePath = visibleItems.reduce((active, item) => {
    const matches =
      currentPath === item.path ||
      (item.path !== "/admin" && currentPath.startsWith(`${item.path}/`));
    return matches && item.path.length > active.length ? item.path : active;
  }, "");

  return (
    <aside className="adm-sidebar">
      <div className="adm-brand">
        <img className="adm-brand-icon" src="/img/aaryan-manomilan-logo.png" alt="Manomilan" />
      </div>

      <div className="adm-menu-label">MENU</div>

      <nav className="adm-nav">
        {visibleItems.map((item) => {
          const Icon = ICONS[item.path] || LayoutDashboard;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={`adm-link ${activePath === item.path ? "active" : ""}`}
              onClick={onNavigate}
            >
              <span className="adm-link-icon" style={{ "--adm-icon-color": ICON_COLORS[item.path] || "#64748b" }}>
                <Icon size={20} strokeWidth={2.2} />
              </span>
              <span className="adm-link-text">{item.label}</span>
              {item.path === "/admin/chat" && canViewChat && unreadChatCount > 0 ? (
                <span className="adm-nav-badge">{unreadChatCount > 99 ? "99+" : unreadChatCount}</span>
              ) : null}
            </Link>
          );
        })}
        <WebsiteSidebarGroup currentPath={currentPath} onNavigate={onNavigate} />
      </nav>

      <div className="adm-sidebar-footer">
        <a
          href="/"
          className="adm-link adm-logout"
          title="Logout"
          onClick={(event) => {
            event.preventDefault();
            clearSession();
            window.location.replace("/");
          }}
        >
          <LogOut size={20} />
          <span className="adm-link-text">Logout</span>
        </a>
      </div>
    </aside>
  );
}
