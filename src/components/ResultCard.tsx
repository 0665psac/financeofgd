import { Gift, AlertCircle, XCircle, ExternalLink, ChevronDown } from "lucide-react";
import GiftBox3D from "@/assets/gift-box-3d.png";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
} from "./ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";

// Preload gift box image on module load
const preloadGiftImage = () => {
  const img = new Image();
  img.src = GiftBox3D;
};
preloadGiftImage();

const newYearGreetings = [
  "สวัสดีปีใหม่ 2026! ขอให้มีความสุขตลอดปี 🎉✨",
  "ปีใหม่นี้ขอให้เกรดปังๆ การเงินเฮงๆ 🎁📚",
  "ขอให้ปี 2026 พบเจอแต่เรื่องราวดีๆ และคนใจดีนะ 🌟❤️",
  "ไม่มีหนี้คือลาภอันประเสริฐ! สุขสันต์วันปีใหม่ 🥳💰",
  "Happy New Year! ขอให้โชคดีตลอดปี 2026 🎊🎁",
  "ขอให้ปีใหม่นี้เต็มไปด้วยความสุขและความสำเร็จ! ✨🎆",
];

interface MonthDetail {
  monthName: string;
  pricePerWeek: number;
  unpaidWeeks: number[];
  totalAmount: number;
}

interface SearchResult {
  found: boolean;
  studentName?: string;
  totalAmount?: number;
  paidAmount?: number;
  monthDetails?: MonthDetail[];
}

// Monthly Details Collapsible Component
const MonthlyDetailsCollapsible = ({ monthDetails }: { monthDetails?: MonthDetail[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!monthDetails || monthDetails.length === 0) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between py-2">
          <p className="text-sm font-medium text-muted-foreground">รายละเอียดแต่ละเดือน</p>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3">
          {monthDetails.map((month, index) => (
            <div
              key={month.monthName}
              className="p-4 bg-muted/30 rounded-2xl animate-fade-in backdrop-blur-sm"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-foreground">{month.monthName}</p>
                  <p className="text-xs text-muted-foreground">
                    ต้องชำระ {month.pricePerWeek} บาท/สัปดาห์
                  </p>
                </div>
                <p className="font-bold font-kanit gradient-danger-text text-lg">
                  {month.totalAmount.toLocaleString()} บาท
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[1, 2, 3, 4].map((week) => {
                  const isUnpaid = month.unpaidWeeks.includes(week);
                  return (
                    <span
                      key={week}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                        isUnpaid
                          ? "gradient-danger text-white"
                          : "gradient-success text-white"
                      }`}
                    >
                      W{week} {isUnpaid ? "❌️" : "✅️"}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

interface ResultCardProps {
  result: SearchResult;
  studentId: string;
}

const ResultCard = ({ result, studentId }: ResultCardProps) => {
  // Case A: Not found
  if (!result.found) {
    return (
      <Card className="animate-scale-in glass-card rounded-3xl border-0 overflow-hidden">
        <div className="absolute inset-0 gradient-danger opacity-5" />
        <CardContent className="pt-6 relative">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-full gradient-danger flex items-center justify-center shadow-lg">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">ไม่พบข้อมูล</p>
              <p className="text-sm text-muted-foreground">
                ไม่พบข้อมูลรหัสนิสิต <span className="font-mono font-medium">{studentId}</span> ในระบบ
              </p>
              <p className="text-sm text-muted-foreground">กรุณาตรวจสอบรหัสอีกครั้ง</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Case B: No outstanding balance
  useEffect(() => {
    if (result.found && result.totalAmount === 0) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ff0000', '#00ff00', '#ffff00']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ff0000', '#00ff00', '#ffff00']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [result.found, result.totalAmount]);

  const [isGiftDialogOpen, setIsGiftDialogOpen] = useState(false);
  const [randomGreeting, setRandomGreeting] = useState("");

  const handleGiftClick = () => {
    const greeting = newYearGreetings[Math.floor(Math.random() * newYearGreetings.length)];
    setRandomGreeting(greeting);
    setIsGiftDialogOpen(true);
  };

  if (result.totalAmount === 0) {
    return (
      <>
        <Card className="animate-scale-in glass-card rounded-3xl border-0 overflow-hidden">
          <div className="absolute inset-0 gradient-success opacity-5" />
          <CardHeader className="pb-2 relative">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">ผลการตรวจสอบของ</p>
              <p className="text-lg font-semibold text-foreground">{result.studentName}</p>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex flex-col items-center text-center gap-3">
              <button
                onClick={handleGiftClick}
                className="w-16 h-16 rounded-full gradient-success flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-lg"
              >
                <Gift className="w-8 h-8 text-white" />
              </button>
              <p className="text-xs text-muted-foreground">คลิกเพื่อเปิดของขวัญ!</p>
              <div>
                <p className="font-semibold gradient-success-text mb-1">ไม่มียอดค้างชำระ</p>
                <p className="text-3xl font-extrabold font-kanit gradient-success-text">
                  จ่ายไปแล้ว {(result.paidAmount ?? 0).toLocaleString()} บาท
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isGiftDialogOpen} onOpenChange={setIsGiftDialogOpen}>
          <DialogContent className="sm:max-w-sm text-center rounded-3xl glass-card border-0 shadow-2xl p-8">
            <div className="flex flex-col items-center gap-5">
              <h2 className="text-3xl font-extrabold font-kanit gradient-success-text">
                ยินดีด้วย!
              </h2>
              <img 
                src={GiftBox3D} 
                alt="Gift Box" 
                className="w-44 h-44 object-contain drop-shadow-xl animate-bounce-slow"
              />
              <p className="text-lg font-medium text-foreground leading-relaxed gift-reveal">
                {randomGreeting}
              </p>
              <Button 
                onClick={() => setIsGiftDialogOpen(false)}
                className="w-full rounded-full gradient-success hover:opacity-90 transition-opacity border-0 h-12 text-base font-semibold shadow-lg mt-2"
              >
                รับทราบ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Case C: Has outstanding balance
  return (
    <Card className="animate-scale-in glass-card rounded-3xl border-0 overflow-hidden">
      <div className="gradient-danger p-5 text-white">
        <div className="text-center">
          <p className="text-sm opacity-90">ผลการตรวจสอบของ</p>
          <p className="text-lg font-semibold">{result.studentName}</p>
        </div>
      </div>
      
      <CardContent className="pt-6">
        {/* Total Amount */}
        <div className="text-center mb-6 p-5 bg-primary/5 rounded-2xl">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full gradient-danger flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-muted-foreground">ยอดค้างชำระรวมทั้งหมด</p>
          </div>
          <p className="text-5xl font-extrabold font-kanit gradient-danger-text">
            {result.totalAmount?.toLocaleString()} บาท
          </p>
          <Button
            className="mt-5 w-full rounded-full gradient-danger hover:opacity-90 transition-opacity border-0 h-12 text-base font-medium shadow-lg"
            onClick={() => window.open("https://forms.gle/FepKQ6mFyFJzg2GGA", "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            ส่งสลิป
          </Button>
        </div>

        {/* Monthly Details - Collapsible */}
        <MonthlyDetailsCollapsible monthDetails={result.monthDetails} />
      </CardContent>
    </Card>
  );
};

export default ResultCard;
