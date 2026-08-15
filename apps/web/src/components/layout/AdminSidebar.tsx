"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  Grid,
  QrCode,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building2,
  Store,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface NavGroup {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { staff, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("admin_sidebar_collapsed", String(next));
  };

  const branchMatch = pathname.match(
    /\/admin\/(?:onboarding|setup|menus|branches|tables|qr)\/([^\/]+)/,
  );
  const activeBranchId = branchMatch ? branchMatch[1] : null;

  const mainNavGroups: NavGroup[] = [
    {
      label: "MANAGEMENT",
      items: [
        {
          href: "/admin/branches",
          label: "Branches & Locations",
          icon: Building2,
        },
        {
          href: "/admin/staff",
          label: "Staff & Team Roles",
          icon: Users,
        },
      ],
    },
  ];

  if (activeBranchId) {
    mainNavGroups.push({
      label: "ACTIVE BRANCH",
      items: [
        {
          href: `/admin/setup/${activeBranchId}`,
          label: "Setup checklist",
          icon: Sparkles,
        },
        {
          href: `/admin/menus/${activeBranchId}`,
          label: "Menu Editor",
          icon: UtensilsCrossed,
        },
        {
          href: `/admin/tables/${activeBranchId}`,
          label: "Tables Configuration",
          icon: Grid,
        },
        {
          href: `/admin/qr/${activeBranchId}`,
          label: "QR Codes Generator",
          icon: QrCode,
        },
      ],
    });
  }

  const initials = staff?.name
    ? staff.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  return (
    <aside
      style={{
        width: collapsed ? "72px" : "260px",
        minHeight: "100vh",
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "sticky",
        top: 0,
        height: "100vh",
        zIndex: 40,
        boxShadow: "1px 0 3px 0 rgba(0, 0, 0, 0.02)",
        userSelect: "none",
      }}
    >
      <div
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0" : "0 1.25rem",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "0.625rem",
              background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 4px rgba(217, 119, 6, 0.25)",
              flexShrink: 0,
            }}
          >
            <Store size={20} />
          </div>
          {!collapsed && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  color: "#0f172a",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                QR Menu
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#d97706",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Admin Portal
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={toggleCollapse}
            title="Collapse sidebar"
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "0.375rem",
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
              e.currentTarget.style.color = "#0f172a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem 0.625rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {mainNavGroups.map((group, groupIdx) => (
          <div
            key={groupIdx}
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            {!collapsed && (
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "#94a3b8",
                  letterSpacing: "0.08em",
                  padding: "0 0.625rem 0.375rem 0.625rem",
                  textTransform: "uppercase",
                }}
              >
                {group.label}
              </span>
            )}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin/branches" &&
                  pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    padding: collapsed ? "0.625rem 0" : "0.625rem 0.75rem",
                    borderRadius: "0.5rem",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#b45309" : "#475569",
                    background: isActive ? "#fffbeb" : "transparent",
                    borderLeft: isActive
                      ? "3px solid #d97706"
                      : "3px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#f8fafc";
                      e.currentTarget.style.color = "#0f172a";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#475569";
                    }
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <Icon
                      size={18}
                      style={{
                        color: isActive ? "#d97706" : "#64748b",
                        flexShrink: 0,
                        transition: "color 0.15s ease",
                      }}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && item.badge && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "9999px",
                        background: "#fef3c7",
                        color: "#b45309",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Expand Button for Collapsed Mode */}
      {collapsed && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "0.5rem",
          }}
        >
          <button
            onClick={toggleCollapse}
            title="Expand sidebar"
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "0.375rem",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Footer Profile & Logout */}
      <div
        style={{
          padding: "0.875rem",
          borderTop: "1px solid #f1f5f9",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {!collapsed ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "#0f172a",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {staff?.name || "Administrator"}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "#64748b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {staff?.email || "admin@demo.com"}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "0.375rem",
                borderRadius: "0.375rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fee2e2";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#94a3b8";
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title="Sign Out"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "0.5rem 0",
              borderRadius: "0.375rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fee2e2";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </aside>
  );
}
