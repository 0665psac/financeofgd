import { CheckCircle2, AlertCircle, XCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";

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
  monthDetails?: MonthDetail[];
}

interface ResultCardProps {
  result: SearchResult;
  studentId: string;
}

const ResultCard = ({ result, studentId }: ResultCardProps) => {
  // Case A: Not found
  if (!result.found) {
    return (
      <Card className="animate-scale-in border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
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
  if (result.totalAmount === 0) {
    return (
      <Card className="animate-scale-in border-secondary/30 bg-secondary/5">
        <CardHeader className="pb-2">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">ผลการตรวจสอบของ</p>
            <p className="text-lg font-semibold text-foreground">{result.studentName}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-secondary" />
            </div>
            <div>
              <p className="font-semibold text-secondary mb-1">ไม่มียอดค้างชำระ</p>
              <p className="text-3xl font-bold text-secondary">0 บาท</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Case C: Has outstanding balance
  return (
    <Card className="animate-scale-in border-primary/30 overflow-hidden">
      <div className="bg-gradient-christmas p-4 text-primary-foreground">
        <div className="text-center">
          <p className="text-sm opacity-90">ผลการตรวจสอบของ</p>
          <p className="text-lg font-semibold">{result.studentName}</p>
        </div>
      </div>
      
      <CardContent className="pt-6">
        {/* Total Amount */}
        <div className="text-center mb-6 p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">ยอดค้างชำระรวมทั้งหมด</p>
          </div>
          <p className="text-4xl font-bold text-primary pulse-glow inline-block px-4 py-2 rounded-lg">
            {result.totalAmount?.toLocaleString()} บาท
          </p>
          <Button
            className="mt-4 w-full"
            onClick={() => window.open("https://forms.gle/FepKQ6mFyFJzg2GGA", "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            ส่งสลิป
          </Button>
        </div>

        {/* Monthly Details */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">รายละเอียดแต่ละเดือน</p>
          {result.monthDetails?.map((month, index) => (
            <div
              key={month.monthName}
              className="p-3 bg-muted/50 rounded-lg animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-foreground">{month.monthName}</p>
                  <p className="text-xs text-muted-foreground">
                    ราคา {month.pricePerWeek} บาท/สัปดาห์
                  </p>
                </div>
                <p className="font-semibold text-primary">
                  {month.totalAmount.toLocaleString()} บาท
                </p>
              </div>
              <div className="flex gap-1 flex-wrap">
                {[1, 2, 3, 4].map((week) => {
                  const isUnpaid = month.unpaidWeeks.includes(week);
                  return (
                    <span
                      key={week}
                      className={`text-xs px-2 py-1 rounded-full ${
                        isUnpaid
                          ? "bg-primary/20 text-primary font-medium"
                          : "bg-secondary/20 text-secondary"
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
      </CardContent>
    </Card>
  );
};

export default ResultCard;
