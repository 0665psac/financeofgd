import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  const cycleTheme = () => {
    const modes: Array<"system" | "light" | "dark"> = ["system", "light", "dark"];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  const getIcon = () => {
    switch (mode) {
      case "light":
        return <Sun className="h-5 w-5 text-foreground" />;
      case "dark":
        return <Moon className="h-5 w-5 text-foreground" />;
      case "system":
        return <Monitor className="h-5 w-5 text-foreground" />;
    }
  };

  const getLabel = () => {
    switch (mode) {
      case "light":
        return "Light mode";
      case "dark":
        return "Dark mode";
      case "system":
        return "System theme";
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="fixed top-4 right-4 h-10 w-10 rounded-full glass-card border-0 z-50"
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </Button>
  );
}
