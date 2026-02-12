import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2, BarChart3 } from "lucide-react";
import Snowflakes from "@/components/Snowflakes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEVICE_ID_KEY = "chat_device_id";
const CHAT_USER_KEY = "chat_user";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

interface ChatUser {
  id: string;
  nickname: string;
  device_id: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  chat_users?: { nickname: string } | null;
}

interface PollOption {
  id: string;
  label: string;
  poll_id: string;
}

interface Poll {
  id: string;
  question: string;
  is_active: boolean;
  created_at: string;
  chat_poll_options: PollOption[];
}

const Chat = () => {
  const navigate = useNavigate();
  const deviceId = getDeviceId();

  const [user, setUser] = useState<ChatUser | null>(() => {
    try {
      const saved = localStorage.getItem(CHAT_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [nicknameInput, setNicknameInput] = useState("");
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [nicknameDialog, setNicknameDialog] = useState(!user);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("chat_voted_polls");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [voting, setVoting] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Nickname map for display
  const [nicknameMap, setNicknameMap] = useState<Record<string, string>>({});

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Check if user exists on this device
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase
        .from("chat_users")
        .select("*")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (data) {
        setUser(data as ChatUser);
        localStorage.setItem(CHAT_USER_KEY, JSON.stringify(data));
        setNicknameDialog(false);
      }
    };
    if (!user) checkUser();
  }, [deviceId, user]);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, chat_users(nickname)")
        .order("created_at", { ascending: true })
        .limit(200);

      if (data) {
        setMessages(data as ChatMessage[]);
        // Build nickname map
        const map: Record<string, string> = {};
        data.forEach((m: any) => {
          if (m.chat_users?.nickname) map[m.user_id] = m.chat_users.nickname;
        });
        setNicknameMap(map);
      }
      setLoadingMessages(false);
      setTimeout(scrollToBottom, 100);
    };
    loadMessages();
  }, [scrollToBottom]);

  // Load polls
  useEffect(() => {
    const loadPolls = async () => {
      const { data } = await supabase
        .from("chat_polls")
        .select("*, chat_poll_options(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setPolls(data as Poll[]);
    };
    loadPolls();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const newMsg = payload.new as any;
          // Fetch nickname if not in map
          if (!nicknameMap[newMsg.user_id]) {
            const { data: userData } = await supabase
              .from("chat_users")
              .select("nickname")
              .eq("id", newMsg.user_id)
              .maybeSingle();
            if (userData) {
              setNicknameMap(prev => ({ ...prev, [newMsg.user_id]: userData.nickname }));
              newMsg.chat_users = { nickname: userData.nickname };
            }
          } else {
            newMsg.chat_users = { nickname: nicknameMap[newMsg.user_id] };
          }
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg as ChatMessage];
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [nicknameMap, scrollToBottom]);

  // Register nickname
  const handleRegister = async () => {
    const name = nicknameInput.trim();
    if (name.length < 2) {
      toast.error("ชื่อต้องยาวอย่างน้อย 2 ตัวอักษร");
      return;
    }
    if (name.length > 20) {
      toast.error("ชื่อต้องไม่เกิน 20 ตัวอักษร");
      return;
    }

    setCheckingNickname(true);
    try {
      // Check availability via edge function
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=check-nickname&nickname=${encodeURIComponent(name)}`,
        { headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const result = await res.json();
      if (!result.available) {
        toast.error("ชื่อนี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น");
        return;
      }

      // Insert user
      const { data, error } = await supabase
        .from("chat_users")
        .insert({ device_id: deviceId, nickname: name })
        .select()
        .single();

      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("ชื่อนี้ถูกใช้แล้ว");
        } else {
          toast.error("เกิดข้อผิดพลาด");
        }
        return;
      }

      const chatUser = data as ChatUser;
      setUser(chatUser);
      localStorage.setItem(CHAT_USER_KEY, JSON.stringify(chatUser));
      setNicknameDialog(false);
      toast.success(`ยินดีต้อนรับ ${chatUser.nickname}!`);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setCheckingNickname(false);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!messageInput.trim() || !user || sending) return;
    const content = messageInput.trim();
    if (content.length > 500) {
      toast.error("ข้อความยาวเกินไป (สูงสุด 500 ตัวอักษร)");
      return;
    }

    setSending(true);
    setMessageInput("");
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({ user_id: user.id, content });

      if (error) {
        setMessageInput(content);
        toast.error("ส่งข้อความไม่สำเร็จ");
      }
    } catch {
      setMessageInput(content);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSending(false);
    }
  };

  // Vote on poll
  const handleVote = async (pollId: string, optionId: string) => {
    if (votedPolls.has(pollId) || voting) return;

    setVoting(optionId);
    try {
      const { error } = await supabase
        .from("chat_poll_votes")
        .insert({ poll_id: pollId, option_id: optionId, device_id: deviceId });

      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("คุณโหวตไปแล้ว");
        } else {
          toast.error("โหวตไม่สำเร็จ");
        }
        return;
      }

      const newVoted = new Set(votedPolls);
      newVoted.add(pollId);
      setVotedPolls(newVoted);
      localStorage.setItem("chat_voted_polls", JSON.stringify([...newVoted]));
      toast.success("โหวตสำเร็จ!");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setVoting(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  };

  const isOwnMessage = (msg: ChatMessage) => user && msg.user_id === user.id;

  return (
    <div className="min-h-screen mesh-gradient-bg relative overflow-hidden flex flex-col">
      <Snowflakes />

      <div className="relative z-10 container max-w-lg mx-auto px-4 py-4 flex flex-col h-screen">
        {/* Header */}
        <header className="mb-3 shrink-0">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </button>
          <h1 className="text-xl font-bold text-foreground">ห้องแชท</h1>
          {user && (
            <p className="text-xs text-muted-foreground">แชทในชื่อ: <span className="font-medium text-foreground">{user.nickname}</span></p>
          )}
        </header>

        {/* Active Polls */}
        {polls.length > 0 && (
          <div className="space-y-2 mb-3 shrink-0">
            {polls.map((poll) => (
              <div key={poll.id} className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{poll.question}</p>
                </div>
                <div className="space-y-1.5">
                  {poll.chat_poll_options.map((opt) => {
                    const hasVoted = votedPolls.has(poll.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleVote(poll.id, opt.id)}
                        disabled={hasVoted || !!voting}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                          hasVoted
                            ? "bg-muted text-muted-foreground cursor-default"
                            : "bg-background/50 hover:bg-primary/10 text-foreground border border-border"
                        }`}
                      >
                        {voting === opt.id ? (
                          <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                        ) : null}
                        {opt.label}
                        {hasVoted && <span className="text-xs ml-1">(โหวตแล้ว)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 glass-card rounded-2xl overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                ยังไม่มีข้อความ เริ่มแชทกันเลย!
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => {
                  const own = isOwnMessage(msg);
                  const nickname = msg.chat_users?.nickname || nicknameMap[msg.user_id] || "???";
                  return (
                    <div key={msg.id} className={`flex flex-col ${own ? "items-end" : "items-start"}`}>
                      {!own && (
                        <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">{nickname}</span>
                      )}
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words ${
                          own
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 mx-1">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          {user && (
            <div className="p-3 border-t border-border shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="พิมพ์ข้อความ..."
                  maxLength={500}
                  className="flex-1 rounded-full"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!messageInput.trim() || sending}
                  className="rounded-full shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Nickname Dialog */}
      <Dialog open={nicknameDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>ตั้งชื่อเล่น</DialogTitle>
            <DialogDescription>กรุณาตั้งชื่อเล่นก่อนเข้าห้องแชท (ชื่อจะผูกกับอุปกรณ์นี้)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="ชื่อเล่น (2-20 ตัวอักษร)"
              maxLength={20}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            />
            <Button
              onClick={handleRegister}
              disabled={checkingNickname || nicknameInput.trim().length < 2}
              className="w-full rounded-xl"
            >
              {checkingNickname && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              เข้าห้องแชท
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full rounded-xl text-muted-foreground"
            >
              กลับหน้าหลัก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;
