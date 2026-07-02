import { AlertCircle, XCircle, ExternalLink, Check, X } from "lucide-react";

import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
} from "./ui/dialog";
import { Progress } from "./ui/progress";

interface MonthDetail {
  monthName: string;
  pricePerWeek: number;
  unpaidWeeks: number[];
  paidWeeks: number[];
  totalAmount: number;
  isFullyPaid: boolean;
  isFeeSheet?: boolean;
  feeRequired?: number;
  feePaid?: number;
}

interface SearchResult {
  found: boolean;
  studentName?: string;
  totalAmount?: number;
  paidAmount?: number;
  monthDetails?: MonthDetail[];
  major?: string;
}

// Student IDs that should NOT show the slip button
const HIDDEN_SLIP_STUDENT_IDS = [
  "6810610059",
  "6810610060",
  "6810610061",
  "6810610062",
  "6810610063",
  "6810610064",
  "6810610065",
  "6810610066",
  "6810610067",
  "6810610068",
  "6810610070",
  "6810610071",
  "6810610234",
  "6810610243",
];

// Fee Item Card (for "ค่า..." sheets)
const FeeItemCard = ({ item, index, paid }: { item: MonthDetail; index: number; paid: boolean }) => {
  const required = item.feeRequired ?? 0;
  const feePaid = item.feePaid ?? 0;
  const outstanding = Math.max(required - feePaid, 0);

  return (
    <div
      className={`p-4 rounded-2xl animate-fade-in backdrop-blur-sm ${
        paid
          ? "bg-emerald-500/5 border border-emerald-500/10"
          : "bg-muted/30"
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex justify-between items-start mb-3">
        <p className="font-medium text-foreground">{item.monthName}</p>
        {paid ? (
          <span className="text-sm font-bold text-emerald-500">✓ จ่ายครบ</span>
        ) : (
          <p className="font-bold font-kanit gradient-danger-text text-lg">
            {outstanding.toLocaleString()} บาท
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 rounded-xl bg-background/40">
          <p className="text-[10px] text-muted-foreground">ต้องชำระ</p>
          <p className="text-sm font-semibold font-kanit text-foreground">
            {required.toLocaleString()}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-background/40">
          <p className="text-[10px] text-muted-foreground">จ่ายแล้ว</p>
          <p className="text-sm font-semibold font-kanit text-emerald-500">
            {feePaid.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

// Monthly Details Display Component (always visible)
const MonthlyDetailsList = ({ monthDetails }: { monthDetails?: MonthDetail[] }) => {
  if (!monthDetails || monthDetails.length === 0) return null;

  const monthlyItems = monthDetails.filter(m => !m.isFeeSheet);
  const feeItems = monthDetails.filter(m => m.isFeeSheet);

  const paidMonths = monthlyItems.filter(m => m.isFullyPaid);
  const unpaidMonths = monthlyItems.filter(m => !m.isFullyPaid);
  const unpaidFees = feeItems.filter(m => !m.isFullyPaid);
  const paidFees = feeItems.filter(m => m.isFullyPaid);

  return (
    <div className="space-y-4">
      {/* Fee sheets section - shown first */}
      {feeItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <p className="text-xs font-medium text-muted-foreground">เรียกเก็บด่วน</p>
            <div className="h-px flex-1 bg-border" />
          </div>

          {unpaidFees.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">ยังค้างชำระ</p>
              <div className="space-y-2">
                {unpaidFees.map((item, index) => (
                  <FeeItemCard key={item.monthName} item={item} index={index} paid={false} />
                ))}
              </div>
            </div>
          )}

          {paidFees.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">จ่ายครบแล้ว</p>
              <div className="space-y-2">
                {paidFees.map((item, index) => (
                  <FeeItemCard key={item.monthName} item={item} index={index} paid={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly section header (only if both sections exist) */}
      {feeItems.length > 0 && monthlyItems.length > 0 && (
        <div className="flex items-center gap-2 pt-2">
          <div className="h-px flex-1 bg-border" />
          <p className="text-xs font-medium text-muted-foreground">เรียกเก็บรายเดือน</p>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* Unpaid months */}
      {unpaidMonths.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">ยังค้างชำระ</p>
          <div className="space-y-2">
            {unpaidMonths.map((month, index) => (
              <div
                key={month.monthName}
                className="p-4 bg-muted/30 rounded-2xl animate-fade-in backdrop-blur-sm"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-foreground">{month.monthName}</p>
                    <p className="text-xs text-muted-foreground">
                      {month.pricePerWeek} บาท/สัปดาห์
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
                        className={`text-xs px-3 py-1.5 rounded-full font-medium inline-flex items-center gap-1 ${
                          isUnpaid
                            ? "gradient-danger text-white"
                            : "gradient-success text-white"
                        }`}
                      >
                        W{week}
                        {isUnpaid ? <X className="w-3 h-3" strokeWidth={3} /> : <Check className="w-3 h-3" strokeWidth={3} />}
                      </span>
                    );
                  })}

                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paid months */}
      {paidMonths.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">จ่ายครบแล้ว</p>
          <div className="space-y-2">
            {paidMonths.map((month, index) => (
              <div
                key={month.monthName}
                className="p-4 bg-emerald-500/5 rounded-2xl animate-fade-in backdrop-blur-sm border border-emerald-500/10"
                style={{ animationDelay: `${(unpaidMonths.length + index) * 100}ms` }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-foreground">{month.monthName}</p>
                    <p className="text-xs text-muted-foreground">
                      {month.pricePerWeek} บาท/สัปดาห์
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-500">✓ จ่ายครบ</span>
                    <p className="text-xs text-muted-foreground">
                      {(month.paidWeeks.length * month.pricePerWeek).toLocaleString()} บาท
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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

  // Check if "ส่งสลิป" button should be shown
  const shouldShowSlipButton = !HIDDEN_SLIP_STUDENT_IDS.includes(studentId);

  // Case B: Fully paid (totalAmount === 0)
  if (result.totalAmount === 0) {
    return (
      <Card className="animate-scale-in glass-card rounded-3xl border-0 overflow-hidden">
        <div className="gradient-success p-5 text-white">
          <div className="text-center">
            <p className="text-sm opacity-90">ผลการตรวจสอบของ</p>
            <p className="text-lg font-semibold">{result.studentName}</p>
          </div>
        </div>

        <CardContent className="pt-6">
          {/* Total Paid Summary */}
          <div className="text-center mb-6 p-5 bg-emerald-500/5 rounded-2xl">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full gradient-success flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-muted-foreground">ยอดที่จ่ายไปแล้วรวมทั้งหมด</p>
            </div>
            <p className="text-5xl font-extrabold font-kanit gradient-success-text">
              {(result.paidAmount ?? 0).toLocaleString()} บาท
            </p>
            <p className="text-sm font-semibold gradient-success-text mt-2">
              ไม่มียอดค้างชำระ
            </p>
          </div>

          {/* Monthly Details - always visible */}
          <MonthlyDetailsList monthDetails={result.monthDetails} />
        </CardContent>
      </Card>
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
          <p className="text-sm text-muted-foreground mt-2">
            จ่ายไปแล้ว {(result.paidAmount ?? 0).toLocaleString()} บาท
          </p>
          {shouldShowSlipButton && (
            <Button
              className="mt-5 w-full rounded-full gradient-danger hover:opacity-90 transition-opacity border-0 h-12 text-base font-medium shadow-lg"
              onClick={() => window.open("https://forms.gle/FepKQ6mFyFJzg2GGA", "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              ส่งสลิป
            </Button>
          )}
        </div>

        {/* Monthly Details - always visible */}
        <MonthlyDetailsList monthDetails={result.monthDetails} />
      </CardContent>
    </Card>
  );
};

export default ResultCard;