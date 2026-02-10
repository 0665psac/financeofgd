

# Prompt สำหรับสร้างเว็บใหม่ให้เหมือนเดิม 100%

ด้านล่างนี้คือ prompt ที่คุณสามารถนำไปใช้สร้างโปรเจกต์ใหม่ใน Lovable ได้เลย:

---

## Prompt (คัดลอกทั้งหมดด้านล่าง)

```text
สร้างเว็บแอป "ระบบตรวจสอบยอดค้างชำระ ค่าสาขาเด็กกราฟิกและผลิตภัณฑ์" ภาษาไทยทั้งหมด โดยมีรายละเอียดดังนี้:

## แหล่งข้อมูล
- ดึงข้อมูลจาก Google Sheets ผ่าน Edge Function ชื่อ "google-sheets-proxy"
- Spreadsheet ID: "1luO33qY0EXsl0xQHX3grA6ayemyHiIjTx4TsNEWjwB4"
- API Key เก็บเป็น secret ชื่อ "GOOGLE_SHEETS_API_KEY"
- Edge Function มีระบบ rate limiting (30 req/min ต่อ IP) และ CORS restriction

## Edge Functions (สร้าง 2 ตัว)

### 1. google-sheets-proxy
- รับ body JSON: { action, sheetName?, range? }
- action "fetchSheetNames": ดึงชื่อ sheet ทั้งหมดจาก spreadsheet (endpoint: spreadsheets/{id}?fields=sheets.properties.title)
- action "fetchSheetData": ดึงข้อมูลจาก range B:G ของ sheet ที่ระบุชื่อ
- action "fetchRange": ดึงข้อมูลจาก range ที่กำหนดเอง
- มี rate limiting 30 req/min ต่อ IP และ CORS whitelist

### 2. log-search-history
- รับ body JSON: { studentId, studentName }
- ส่งต่อไปยัง Google Apps Script URL: "https://script.google.com/macros/s/AKfycbx4vIcOuDmfNzQUePMRE_FXcuBW4Q-LQHzB2wTkiSmGIdBkBsmjftyeXXv_VvJqhrLn/exec"
- มี rate limiting 20 req/min ต่อ IP และ CORS whitelist

## โครงสร้างข้อมูลจาก Google Sheets
- แต่ละ sheet ชื่อเป็นรูปแบบ "เดือน (ปี)" เช่น "พฤศจิกายน (68)", "สิงหาคม (68)"
- แต่ละ sheet มี column B=ชื่อ, C=รหัสนิสิต, D=สัปดาห์1, E=สัปดาห์2, F=สัปดาห์3, G=สัปดาห์4
- ค่า TRUE/✓/✔ = จ่ายแล้ว, อื่นๆ = ยังไม่จ่าย
- ข้ามแถวที่มีคำว่า "ลาออก", "กราฟิก", "รหัสนิสิต", "รหัส"
- sheet ชื่อ "สรุปยอดเงิน" range A:B มีแถว "เงินคงเหลือ" ใน column A, ค่าอยู่ column B

## Logic การคำนวณราคา
- sheet ที่เป็นเดือน พฤศจิกายน ปี 68 ขึ้นไป = 40 บาท/สัปดาห์
- sheet ที่เก่ากว่านั้น = 20 บาท/สัปดาห์
- ยอดค้าง = จำนวนสัปดาห์ที่ยังไม่จ่าย x ราคาต่อสัปดาห์

## Cache
- ข้อมูลจาก Google Sheets cache ไว้ 5 นาที (module-level variable)
- มีปุ่ม refresh ที่ clear cache แล้วดึงข้อมูลใหม่

## การกำหนดสาขา (Major)
- รหัสนิสิตที่ขึ้นต้นด้วย "68106100" ตามด้วย suffix >= 59 = สาขา "ผลิตภัณฑ์"
- นอกนั้น = สาขา "กราฟิก"

## UI Design - ธีมคริสต์มาส + Glassmorphism

### พื้นหลัง
- Mesh gradient background ด้วย radial-gradient หลายชั้น (แดง, เขียว, ทอง, ฟ้า)
- มี Snowflakes animation (เกล็ดหิมะ ❄ ตกลงมา 30 ชิ้น)
- รองรับ dark mode อัตโนมัติตาม system preference

### Header
- ชื่อ "ระบบตรวจสอบยอดค้างชำระ" ตัวหนา
- คำอธิบาย "ค่าสาขาเด็กกราฟิกและผลิตภัณฑ์"

### การ์ดยอดเงินรวม
- Glass card แบบ rounded-3xl
- Icon Wallet ในวงกลม gradient เขียว
- แสดงยอดเงินจาก sheet "สรุปยอดเงิน" แถว "เงินคงเหลือ"
- ใช้ CountUp animation สำหรับตัวเลข
- ข้อความ gradient สีเขียว
- Skeleton loading ตอนโหลด

### ช่องค้นหา - Floating Pill
- ทรงเม็ดยาลอย (pill shape) มี blur backdrop
- ไอคอน Search ด้านซ้าย
- ปุ่ม Refresh (RefreshCw icon, หมุนตอนโหลด) ด้านขวา
- ปุ่ม Search วงกลม gradient เขียว
- เมื่อ focus จะแสดง dropdown ประวัติค้นหา (Glassmorphism style)

### Dropdown ประวัติค้นหา
- แสดงเมื่อ input focus และมีประวัติ
- แต่ละรายการมี icon User ในวงกลม, ชื่อ, รหัสนิสิต
- ปุ่ม "ล้างทั้งหมด" (icon X)
- หัวข้อ "ประวัติการค้นหา" (icon History)
- เก็บใน localStorage key "student_search_history_v2" สูงสุด 5 รายการ

### Hint สำหรับค้นหาสั้น
- แสดงเฉพาะเมื่อไม่มีประวัติค้นหา
- "สามารถกรอกรหัสนิสิตแค่ 1-3 ตัวท้ายได้เลย" พร้อม icon Lightbulb

## Logic การค้นหาแบบย่อ (1-3 หลัก)
- ตัดเลข 0 นำหน้าออกก่อน: 01->1, 001->1, 016->16
- 1 หลัก: prefix "681061000" + X (เช่น 1 -> 6810610001)
- 2 หลัก: prefix "68106100" + XX (เช่น 16 -> 6810610016)
- 3 หลัก: prefix "6810610" + XXX (เช่น 229 -> 6810610229)
- ถ้าพบหลายผลลัพธ์ แสดง Dialog เลือกรหัส (Glassmorphism, rounded-3xl)
- ถ้าพบ 1 ผลลัพธ์ ค้นหาเลย
- ถ้าไม่พบ ค้นหาด้วย ID แรกที่ expand ได้

## ผลลัพธ์การค้นหา (ResultCard)

### กรณีไม่พบ
- การ์ด glass-card พร้อม icon XCircle วงกลม gradient แดง
- ข้อความ "ไม่พบข้อมูล" พร้อมรหัสที่ค้นหา

### กรณีจ่ายครบ (ยอดค้าง = 0)
- Confetti animation 3 วินาที (ซ้าย+ขวา สีแดง เขียว เหลือง) ใช้ canvas-confetti
- การ์ด glass-card พร้อม icon Gift วงกลม gradient เขียว (คลิกได้)
- ข้อความ "คลิกเพื่อเปิดของขวัญ!" ด้านล่าง icon
- แสดง "ไม่มียอดค้างชำระ" และ "จ่ายไปแล้ว X บาท" (gradient เขียว)
- คลิก Gift เปิด Dialog "ยินดีด้วย!" พร้อมรูป gift box 3D (bounce animation)
- Dialog มีข้อความอวยพร 10 ข้อ สลับทุก 5 วินาที พร้อม Progress bar countdown
- ข้อความอวยพร:
  1. "ขอให้เกรด A พุ่งชน จนคนทั้งสาขาต้องอิจฉา!"
  2. "สู้ ๆนะ เรียนให้สนุก รู้อีกทีคือได้เกียรตินิยมแล้ว"
  3. "เกรดเป็นเรื่องสมมติ แต่ขอให้สมมติว่าเป็น A ทุกตัวนะ!"
  4. "ชีวิตมหาลัยครั้งเดียว ขอให้เก็บเกี่ยวความสุขให้เต็มที่"
  5. "ขอให้เทพเจ้าการสอบคุ้มครอง สาธุ!"
  6. "ขอให้ได้เซคที่ดี เพื่อนร่วมกลุ่มที่โดนใจ"
  7. "ขอให้ตอนอาจารย์สุ่มตอบคำถามไม่โดนชื่อตัวเองนะ"
  8. "ขอให้โปรเจกต์ผ่านฉลุย ไฟนอลไม่ตุยนะจ๊ะ"
  9. "ขอให้ดวงดีตอนเดาข้อสอบ"
  10. "ขอให้อาจารย์ไม่สั่งงานเพิ่ม และส่งงานทันเดดไลน์!"
- ปุ่ม "รับทราบ" ปิด Dialog (rounded-full gradient เขียว)

### กรณีมียอดค้าง
- Header gradient แดง แสดงชื่อนิสิต
- ยอดค้างชำระรวม ตัวเลขใหญ่ gradient แดง พร้อม icon AlertCircle
- ปุ่ม "ส่งสลิป" (gradient แดง, icon ExternalLink) เปิด Google Form: "https://forms.gle/FepKQ6mFyFJzg2GGA"
- ซ่อนปุ่ม "ส่งสลิป" สำหรับรหัสนิสิต: 6810610059-6810610068, 6810610070, 6810610071, 6810610234, 6810610243
- Section "รายละเอียดแต่ละเดือน" แบบ Collapsible (ปิดเป็นค่าเริ่มต้น, icon ChevronDown)
- แต่ละเดือนแสดง: ชื่อเดือน, ราคาต่อสัปดาห์, ยอดค้าง, badge W1-W4 สีเขียว(จ่ายแล้ว)/แดง(ค้าง) พร้อมอีโมจิ ✅️/❌️

## Fixed Bottom Drawer - "สถานะการชำระเงินทั้งหมด"
- Fixed อยู่ด้านล่างจอ เป็น glass-card rounded-t-3xl
- ปุ่มเปิด/ปิดอยู่ด้านล่างสุดของ drawer (icon Users สีส้ม + "สถานะการชำระเงินทั้งหมด" + ChevronUp)
- ตอนโหลดแสดง Loader2 icon หมุนแทน ChevronUp
- เมื่อเปิด drawer ขยายขึ้นไปจนถึง top-[120px] (ไม่บัง header) และ bottom-0
- มี overlay bg-black/20 ด้านหลัง คลิกแล้วปิด drawer
- transition-all duration-300

### เนื้อหาใน Drawer
- สรุปยอดค้างรวม (พื้นหลัง amber/10)
- แสดงจำนวนคนที่ "ยังค้างชำระ" (สีแดง) และ "จ่ายครบแล้ว" (สีเขียว)
- ข้อความ "เรียงจากยอดค้างมากที่สุด"
- รายชื่อนิสิตทั้งหมด เรียงจากยอดค้างมากไปน้อย
- แต่ละรายการแสดง: ลำดับ, ชื่อ, รหัส, ยอดค้าง+จำนวนสัปดาห์ หรือ "✓ จ่ายครบ" (พื้นหลังเขียว)

## การ log ประวัติค้นหา
- เมื่อค้นหาสำเร็จ ส่งข้อมูลไปยัง Edge Function "log-search-history" (silent fail)
- บันทึกลง localStorage พร้อมกัน

## Theme
- รองรับ dark mode อัตโนมัติตาม system preference (ไม่มีปุ่มสลับ)
- CSS custom properties สำหรับ light/dark
- ใช้ font family "Kanit" สำหรับตัวเลขสำคัญ

## Dependencies ที่ต้องติดตั้ง
- react-countup (CountUp animation)
- canvas-confetti (confetti effect)
- lucide-react (icons)
- @radix-ui/react-collapsible, @radix-ui/react-dialog, @radix-ui/react-progress

## สิ่งที่ต้องทำตอน load หน้าแรก
1. ดึงประวัติค้นหาจาก localStorage
2. ดึงยอดเงินรวมจาก sheet "สรุปยอดเงิน"
3. ดึงข้อมูลนิสิตทั้งหมดจากทุก sheet เพื่อคำนวณสถานะการชำระเงิน
4. แสดง skeleton/loader ระหว่างรอข้อมูล
```

---

## หมายเหตุ
- Prompt นี้ครอบคลุมทุก feature ที่มีในโปรเจกต์ปัจจุบัน
- หลังสร้างโปรเจกต์ใหม่ ต้องตั้งค่า secret "GOOGLE_SHEETS_API_KEY" ด้วย API key เดิม
- URL ของ Edge Functions (CORS whitelist) จะต้องอัปเดตให้ตรงกับ domain ใหม่
- รูป gift-box-3d.png และ GiftBox.gif ต้อง upload เข้าโปรเจกต์ใหม่ด้วย

