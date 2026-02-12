import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Image, Loader2, BarChart3, X } from "lucide-react";
import Snowflakes from "@/components/Snowflakes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface PollOption {
  id: string;
  label: string;
  vote_count: number;
}

interface Poll {
  id: string;
  question: string;
  is_active: boolean;
  created_at: string;
  chat_poll_options: PollOption[];
}

const Admin = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Poll state
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollSaving, setPollSaving] = useState(false);
  const [pollDeleting, setPollDeleting] = useState<string | null>(null);

  const DRAFT_KEY = "admin_announcement_draft";

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  const draft = loadDraft();

  // Form state
  const [title, setTitle] = useState(draft?.title || "");
  const [description, setDescription] = useState(draft?.description || "");
  const [bannerUrl, setBannerUrl] = useState(draft?.bannerUrl || "");
  const [buttonLabel, setButtonLabel] = useState(draft?.buttonLabel || "");
  const [buttonLink, setButtonLink] = useState(draft?.buttonLink || "");
  const [isPublished, setIsPublished] = useState(draft?.isPublished ?? true);
  const [uploading, setUploading] = useState(false);

  // Save draft to localStorage on form changes
  useEffect(() => {
    if (dialogOpen) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description, bannerUrl, buttonLabel, buttonLink, isPublished }));
    }
  }, [title, description, bannerUrl, buttonLabel, buttonLink, isPublished, dialogOpen]);

  const apiCall = useCallback(async (action: string, options?: RequestInit) => {
    return fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=${action}`,
      {
        ...options,
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
          ...options?.headers,
        },
      }
    );
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await apiCall("list-all");
      const result = await response.json();
      if (response.ok) setAnnouncements(result);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const fetchPolls = useCallback(async () => {
    try {
      const response = await apiCall("list-polls");
      const result = await response.json();
      if (response.ok) setPolls(result);
    } catch (err) {
      console.error("Failed to fetch polls:", err);
    } finally {
      setPollsLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    // Check if admin is authenticated
    const isAdmin = sessionStorage.getItem("admin_verified");
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchAnnouncements();
    fetchPolls();
  }, [fetchAnnouncements, fetchPolls, navigate]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setBannerUrl("");
    setButtonLabel("");
    setButtonLink("");
    setIsPublished(true);
    setEditing(null);
    localStorage.removeItem(DRAFT_KEY);
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

  // Poll handlers
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim()) { toast.error("กรุณากรอกคำถาม"); return; }
    const validOptions = pollOptions.filter(o => o.trim());
    if (validOptions.length < 2) { toast.error("ต้องมีตัวเลือกอย่างน้อย 2 ข้อ"); return; }

    setPollSaving(true);
    try {
      const response = await apiCall("create-poll", {
        method: "POST",
        body: JSON.stringify({ question: pollQuestion, options: validOptions }),
      });
      if (response.ok) {
        toast.success("สร้างโพลสำเร็จ");
        setPollDialogOpen(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
        fetchPolls();
      } else { toast.error("เกิดข้อผิดพลาด"); }
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setPollSaving(false); }
  };

  const handleTogglePoll = async (id: string, is_active: boolean) => {
    try {
      await apiCall("toggle-poll", { method: "POST", body: JSON.stringify({ id, is_active }) });
      fetchPolls();
    } catch { toast.error("เกิดข้อผิดพลาด"); }
  };

  const handleDeletePoll = async (id: string) => {
    if (!confirm("ยืนยันการลบโพลนี้?")) return;
    setPollDeleting(id);
    try {
      const response = await apiCall("delete-poll", { method: "POST", body: JSON.stringify({ id }) });
      if (response.ok) { toast.success("ลบโพลสำเร็จ"); fetchPolls(); }
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setPollDeleting(null); }
  };

  return (
    <div className="min-h-screen mesh-gradient-bg relative overflow-hidden">
      <Snowflakes />

      <div className="relative z-10 container max-w-lg mx-auto px-4 py-8">
        <header className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </button>
          <h1 className="text-2xl font-bold text-foreground">แอดมิน</h1>
        </header>

        <Tabs defaultValue="announcements">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="announcements" className="flex-1">ประกาศ</TabsTrigger>
            <TabsTrigger value="polls" className="flex-1">โพล</TabsTrigger>
          </TabsList>

          {/* ===== ANNOUNCEMENTS TAB ===== */}
          <TabsContent value="announcements">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">จัดการประกาศข่าวสาร</p>
              <Button onClick={openCreate} size="sm" className="rounded-full gap-1.5">
                <Plus className="w-4 h-4" /> เพิ่ม
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="glass-card rounded-3xl p-8 text-center">
                <p className="text-muted-foreground text-sm">ยังไม่มีประกาศ</p>
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
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">ซ่อน</span>
                          )}
                        </div>
                        {ann.description && <p className="text-xs text-muted-foreground line-clamp-2">{ann.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(ann.created_at).toLocaleDateString("th-TH")}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(ann)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(ann.id)} disabled={deleting === ann.id} className="p-2 rounded-xl hover:bg-destructive/10 transition-colors">
                          {deleting === ann.id ? <Loader2 className="w-4 h-4 animate-spin text-destructive" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ===== POLLS TAB ===== */}
          <TabsContent value="polls">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">จัดการโพลสำรวจ</p>
              <Button onClick={() => { setPollQuestion(""); setPollOptions(["", ""]); setPollDialogOpen(true); }} size="sm" className="rounded-full gap-1.5">
                <Plus className="w-4 h-4" /> สร้างโพล
              </Button>
            </div>

            {pollsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : polls.length === 0 ? (
              <div className="glass-card rounded-3xl p-8 text-center">
                <p className="text-muted-foreground text-sm">ยังไม่มีโพล</p>
              </div>
            ) : (
              <div className="space-y-3">
                {polls.map((poll) => {
                  const totalVotes = poll.chat_poll_options.reduce((sum, o) => sum + (o.vote_count || 0), 0);
                  return (
                    <div key={poll.id} className="glass-card rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                            <h3 className="font-semibold text-foreground text-sm">{poll.question}</h3>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {poll.is_active ? "กำลังเปิด" : "ปิดแล้ว"} · {totalVotes} โหวต
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleTogglePoll(poll.id, !poll.is_active)}
                            className="p-2 rounded-xl hover:bg-muted transition-colors"
                            title={poll.is_active ? "ปิดโพล" : "เปิดโพล"}
                          >
                            {poll.is_active ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          <button onClick={() => handleDeletePoll(poll.id)} disabled={pollDeleting === poll.id} className="p-2 rounded-xl hover:bg-destructive/10 transition-colors">
                            {pollDeleting === poll.id ? <Loader2 className="w-4 h-4 animate-spin text-destructive" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                          </button>
                        </div>
                      </div>
                      {/* Vote results */}
                      <div className="space-y-2">
                        {poll.chat_poll_options.map((opt) => {
                          const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
                          return (
                            <div key={opt.id}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-foreground">{opt.label}</span>
                                <span className="text-muted-foreground">{opt.vote_count} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Announcement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขประกาศ" : "สร้างประกาศใหม่"}</DialogTitle>
            <DialogDescription>กรอกข้อมูลประกาศด้านล่าง</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">หัวข้อ *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="หัวข้อประกาศ" maxLength={200} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">รายละเอียด</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." rows={3} maxLength={2000} />
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
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadBanner} disabled={uploading} />
                </label>
                {bannerUrl && <Button variant="outline" size="sm" onClick={() => setBannerUrl("")}>ลบรูป</Button>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">ข้อความปุ่ม</label>
                <Input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} placeholder="เช่น ดูเพิ่มเติม" maxLength={50} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">ลิงก์ปุ่ม</label>
                <Input value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} placeholder="https://..." maxLength={500} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">เผยแพร่</label>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
            <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full rounded-xl">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? "บันทึกการแก้ไข" : "สร้างประกาศ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Poll Dialog */}
      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>สร้างโพลใหม่</DialogTitle>
            <DialogDescription>ผู้ใช้ในห้องแชทจะเห็นและโหวตโพลนี้</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">คำถาม *</label>
              <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="คำถามของโพล" maxLength={500} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">ตัวเลือก (อย่างน้อย 2 ข้อ)</label>
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[i] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      placeholder={`ตัวเลือก ${i + 1}`}
                      maxLength={100}
                    />
                    {pollOptions.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 10 && (
                  <Button variant="outline" size="sm" onClick={() => setPollOptions([...pollOptions, ""])} className="w-full rounded-xl">
                    + เพิ่มตัวเลือก
                  </Button>
                )}
              </div>
            </div>
            <Button onClick={handleCreatePoll} disabled={pollSaving || !pollQuestion.trim()} className="w-full rounded-xl">
              {pollSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              สร้างโพล
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
