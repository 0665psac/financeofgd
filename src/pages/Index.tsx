import { useNavigate } from "react-router-dom";
import { Megaphone, Receipt } from "lucide-react";
import Snowflakes from "@/components/Snowflakes";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen mesh-gradient-bg relative overflow-hidden flex items-center justify-center">
      <Snowflakes />

      <div className="relative z-10 container max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            การเงินสาขาเด็ก GD
          </h1>
          <p className="text-sm text-muted-foreground">
            กราฟิกและผลิตภัณฑ์
          </p>
        </header>

        {/* Menu Cards */}
        <div className="space-y-4">
          {/* Announcements */}
          <button
            onClick={() => navigate("/announcements")}
            className="w-full glass-card rounded-3xl p-6 flex items-center gap-4 text-left transition-transform active:scale-[0.98] hover:scale-[1.02]"
          >
            <div className="w-14 h-14 rounded-2xl gradient-danger flex items-center justify-center shrink-0">
              <Megaphone className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">ประกาศข่าวสาร</p>
              <p className="text-sm text-muted-foreground">ข่าวสารและประกาศต่าง ๆ ของสาขา</p>
            </div>
          </button>

          {/* Payment Check */}
          <button
            onClick={() => navigate("/payment")}
            className="w-full glass-card rounded-3xl p-6 flex items-center gap-4 text-left transition-transform active:scale-[0.98] hover:scale-[1.02]"
          >
            <div className="w-14 h-14 rounded-2xl gradient-success flex items-center justify-center shrink-0">
              <Receipt className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">ตรวจสอบยอดค้างชำระ</p>
              <p className="text-sm text-muted-foreground">ค่าสาขาเด็กกราฟิกและผลิตภัณฑ์</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
