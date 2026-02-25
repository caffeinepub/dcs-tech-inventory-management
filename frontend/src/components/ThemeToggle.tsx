import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-9 w-9 rounded-md"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-sidebar-foreground" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
