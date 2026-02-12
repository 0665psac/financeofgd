import { useState, useEffect } from "react";
import { ArrowLeft, Megaphone, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Snowflakes from "@/components/Snowflakes";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  button_label: string | null;
  button_link: string | null;
  created_at: string;
}

const Announcements = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("id, title, description, banner_url, button_label, button_link, created_at")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setAnnouncements(data as Announcement[]);
        }
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

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

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-3xl overflow-hidden">
                <Skeleton className="w-full h-40" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex justify-between items-center pt-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center">
            <p className="text-muted-foreground text-sm">ยังไม่มีประกาศในขณะนี้</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => (
              <div key={ann.id} className="glass-card rounded-3xl overflow-hidden">
                {ann.banner_url && (
                  <img
                    src={ann.banner_url}
                    alt={ann.title}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-5">
                  <h2 className="font-bold text-foreground mb-1">{ann.title}</h2>
                  {ann.description && (
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">
                      {ann.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(ann.created_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    {ann.button_label && ann.button_link && (
                      <a
                        href={ann.button_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        {ann.button_label}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
