import { ArrowLeft, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Snowflakes from "@/components/Snowflakes";

const Announcements = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen mesh-gradient-bg relative overflow-hidden">
      <Snowflakes />

      <div className="relative z-10 container max-w-md mx-auto px-4 py-8">
        {/* Header with back button */}
        <header className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </button>
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl gradient-danger flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              ประกาศข่าวสาร
            </h1>
            <p className="text-sm text-muted-foreground">
              ข่าวสารและประกาศต่าง ๆ ของสาขา
            </p>
          </div>
        </header>

        {/* Empty state */}
        <div className="glass-card rounded-3xl p-8 text-center">
          <p className="text-muted-foreground text-sm">ยังไม่มีประกาศในขณะนี้</p>
        </div>
      </div>
    </div>
  );
};

export default Announcements;
