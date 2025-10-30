import type { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsHelp({ shortcuts }: KeyboardShortcutsHelpProps) {
  if (shortcuts.length === 0) return null;

  return (
    <div className="text-xs text-gray-500 space-y-1">
      <p className="font-medium">Atajos de teclado:</p>
      {shortcuts.map((shortcut, index) => (
        <p key={index} className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
            {shortcut.ctrlKey && 'Ctrl+'}
            {shortcut.altKey && 'Alt+'}
            {shortcut.shiftKey && 'Shift+'}
            {shortcut.metaKey && 'Cmd+'}
            {shortcut.key}
          </kbd>
          <span>{shortcut.description}</span>
        </p>
      ))}
    </div>
  );
}