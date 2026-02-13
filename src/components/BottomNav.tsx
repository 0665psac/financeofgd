import { useLocation, useNavigate } from "react-router-dom";
import { Receipt, Megaphone, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/payment", label: "เช็คยอด", icon: Receipt },
  { path: "/announcements", label: "ข่าวสาร", icon: Megaphone },
  { path: "/chat", label: "แชท", icon: MessageCircle },
] as const;

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom,8px)]">
      <div className="max-w-md mx-auto">
        <nav className="glass-card rounded-2xl flex items-center justify-around py-2 px-2 mb-2">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl transition-all min-w-[72px]",
                  isActive
                    ? "text-secondary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_6px_hsl(var(--secondary)/0.5)]")} />
                  {isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-secondary" />
                  )}
                </div>
                <span className={cn("text-[11px] font-medium", isActive && "font-semibold")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default BottomNav;
