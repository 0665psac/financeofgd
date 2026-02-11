import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink, Eye, EyeOff, Image, Loader2 } from "lucide-react";
import Snowflakes from "@/components/Snowflakes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  button_label: string | null;
  button_link: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=list-all`,
        {
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();
      if (response.ok) {
        setAnnouncements(result);
      }
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if admin is authenticated
    const isAdmin = sessionStorage.getItem("admin_verified");
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchAnnouncements();
  }, [fetchAnnouncements, navigate]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setBannerUrl("");
    setButtonLabel("");
    setButtonLink("");
    setIsPublished(true);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (ann: Announcement) => {
    setEditing(ann);
    setTitle(ann.title);
    setDescription(ann.description || "");
    setBannerUrl(ann.banner_url || "");
    setButtonLabel(ann.button_label || "");
    setButtonLink(ann.button_link || "");
    setIsPublished(ann.is_published);
    setDialogOpen(true);
  };

  const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์ต้องมีขนาดไม่เกิน 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=upload-banner`,
        {
          method: "POST",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );

      const result = await response.json();
      if (response.ok && result.url) {
        setBannerUrl(result.url);
        toast.success("อัพโหลดรูปสำเร็จ");
      } else {
        toast.error("อัพโหลดไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการอัพโหลด");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("กรุณากรอกหัวข้อ");
      return;
    }

    setSaving(true);
    try {
      const action = editing ? "update" : "create";
      const body: Record<string, unknown> = {
        title,
        description: description || null,
        banner_url: bannerUrl || null,
        button_label: buttonLabel || null,
        button_link: buttonLink || null,
        is_published: isPublished,
      };
      if (editing) body.id = editing.id;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=${action}`,
        {
          method: "POST",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        toast.success(editing ? "แก้ไขสำเร็จ" : "สร้างประกาศสำเร็จ");
        setDialogOpen(false);
        resetForm();
        fetchAnnouncements();
      } else {
        toast.error("เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบประกาศนี้?")) return;

    setDeleting(id);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=delete`,
        {
          method: "POST",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        }
      );

      if (response.ok) {
        toast.success("ลบสำเร็จ");
        fetchAnnouncements();
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient-bg relative overflow-hidden">
      <Snowflakes />

      <div className="relative z-10 container max-w-lg mx-auto px-4 py-8">
        <header className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">จัดการประกาศ</h1>
              <p className="text-sm text-muted-foreground">เพิ่ม แก้ไข หรือลบประกาศข่าวสาร</p>
            </div>
            <Button onClick={openCreate} size="sm" className="rounded-full gap-1.5">
              <Plus className="w-4 h-4" />
              เพิ่ม
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center">
            <p className="text-muted-foreground text-sm">ยังไม่มีประกาศ กดปุ่ม "เพิ่ม" เพื่อสร้างประกาศใหม่</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="glass-card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground text-sm truncate">{ann.title}</h3>
                      {!ann.is_published && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                          ซ่อน
                        </span>
                      )}
                    </div>
                    {ann.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{ann.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(ann.created_at).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(ann)}
                      className="p-2 rounded-xl hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      disabled={deleting === ann.id}
                      className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
                    >
                      {deleting === ann.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขประกาศ" : "สร้างประกาศใหม่"}</DialogTitle>
            <DialogDescription>กรอกข้อมูลประกาศด้านล่าง</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">หัวข้อ *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="หัวข้อประกาศ"
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">รายละเอียด</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม..."
                rows={3}
                maxLength={2000}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">รูปแบนเนอร์</label>
              {bannerUrl && (
                <div className="mb-2 rounded-xl overflow-hidden">
                  <img src={bannerUrl} alt="Banner" className="w-full h-32 object-cover" />
                </div>
              )}
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-input bg-background text-sm cursor-pointer hover:bg-muted transition-colors">
                  <Image className="w-4 h-4" />
                  {uploading ? "กำลังอัพโหลด..." : "เลือกรูป"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadBanner}
                    disabled={uploading}
                  />
                </label>
                {bannerUrl && (
                  <Button variant="outline" size="sm" onClick={() => setBannerUrl("")}>
                    ลบรูป
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">ข้อความปุ่ม</label>
                <Input
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  placeholder="เช่น ดูเพิ่มเติม"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">ลิงก์ปุ่ม</label>
                <Input
                  value={buttonLink}
                  onChange={(e) => setButtonLink(e.target.value)}
                  placeholder="https://..."
                  maxLength={500}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">เผยแพร่</label>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="w-full rounded-xl"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editing ? "บันทึกการแก้ไข" : "สร้างประกาศ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
