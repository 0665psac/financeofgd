import { useNavigate } from "react-router-dom";
import { useState, useRef, useCallback } from "react";
import { Megaphone, Receipt, MessageCircle, Loader2 } from "lucide-react";
import Snowflakes from "@/components/Snowflakes";
import { useTheme } from "@/hooks/useTheme";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Long-press detection (1 second)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = useCallback(() => {
    pressTimerRef.current = setTimeout(() => {
      setPasswordDialog(true);
      setPassword("");
    }, 1000);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const handleVerifyPassword = async () => {
    if (!password.trim()) return;
    setVerifying(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=verify-password`,
        {
          method: "POST",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        }
      );
      const result = await response.json();
      if (result.verified) {
        sessionStorage.setItem("admin_verified", "true");
        setPasswordDialog(false);
        navigate("/admin");
      } else {
        toast.error("รหัสผ่านไม่ถูกต้อง");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient-bg relative overflow-hidden flex flex-col items-center pt-12">
      <Snowflakes />

      <div className="relative z-10 container max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-10">
          <img
            src={theme === "dark" ? logoDark : logoLight}
            alt="DA68 Design Art Logo"
            className="h-40 mx-auto cursor-pointer select-none"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          />
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

          {/* Chat */}
          <button
            onClick={() => navigate("/chat")}
            className="w-full glass-card rounded-3xl p-6 flex items-center gap-4 text-left transition-transform active:scale-[0.98] hover:scale-[1.02]"
          >
            <div className="w-14 h-14 rounded-2xl gradient-chat flex items-center justify-center shrink-0">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">ห้องแชท</p>
              <p className="text-sm text-muted-foreground">พูดคุยกันแบบไม่ระบุตัวตน</p>
            </div>
          </button>
        </div>
      </div>

      {/* Admin Password Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>เข้าสู่ระบบแอดมิน</DialogTitle>
            <DialogDescription>กรุณาใส่รหัสผ่านเพื่อเข้าสู่หน้าจัดการ</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              maxLength={100}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
            />
            <Button
              onClick={handleVerifyPassword}
              disabled={verifying || !password.trim()}
              className="w-full rounded-xl"
            >
              {verifying && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              เข้าสู่ระบบ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
