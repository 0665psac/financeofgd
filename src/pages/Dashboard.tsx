import { ArrowLeft, Users, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen mesh-gradient-bg relative overflow-hidden">
      <div className="relative z-10 container max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">ข้อมูลสรุปภาพรวม</p>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 glass-card rounded-2xl">
            <div className="w-10 h-10 rounded-full gradient-success flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">ยอดเงินคงเหลือ</p>
            <p className="text-xl font-bold text-foreground">-</p>
          </div>
          <div className="p-4 glass-card rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">จำนวนนิสิต</p>
            <p className="text-xl font-bold text-foreground">-</p>
          </div>
          <div className="p-4 glass-card rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">ยอดค้างชำระรวม</p>
            <p className="text-xl font-bold text-foreground">-</p>
          </div>
          <div className="p-4 glass-card rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">เดือนปัจจุบัน</p>
            <p className="text-xl font-bold text-foreground">-</p>
          </div>
        </div>

        {/* Placeholder for future content */}
        <div className="p-6 glass-card rounded-3xl text-center">
          <p className="text-muted-foreground text-sm">
            🚧 หน้านี้อยู่ระหว่างการพัฒนา
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
