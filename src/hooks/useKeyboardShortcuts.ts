'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  callback: () => void;
  description: string;
}

export interface TransactionShortcuts {
  onCreateIncome: () => void;
  onCreateExpense: () => void;
  onCreateTransfer: () => void;
}

// Hook for general keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const altMatches = !!shortcut.altKey === event.altKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const metaMatches = !!shortcut.metaKey === event.metaKey;

      if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
        event.preventDefault();
        shortcut.callback();
        break;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

// Specific hook for transaction shortcuts (i/e/t)
export function useTransactionShortcuts(
  { onCreateIncome, onCreateExpense, onCreateTransfer }: TransactionShortcuts,
  enabled = true
) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'i',
      callback: onCreateIncome,
      description: 'Crear nuevo ingreso (I)',
    },
    {
      key: 'e',
      callback: onCreateExpense,
      description: 'Crear nuevo gasto (E)',
    },
    {
      key: 't',
      callback: onCreateTransfer,
      description: 'Crear nueva transferencia (T)',
    },
  ];

  useKeyboardShortcuts(shortcuts, enabled);

  return shortcuts;
}

// Hook for form shortcuts
export function useFormShortcuts(
  callbacks: {
    onSave?: () => void;
    onCancel?: () => void;
    onReset?: () => void;
  },
  enabled = true
) {
  const shortcuts: KeyboardShortcut[] = [];

  if (callbacks.onSave) {
    shortcuts.push({
      key: 's',
      ctrlKey: true,
      callback: callbacks.onSave,
      description: 'Guardar (Ctrl+S)',
    });
  }

  if (callbacks.onCancel) {
    shortcuts.push({
      key: 'Escape',
      callback: callbacks.onCancel,
      description: 'Cancelar (Esc)',
    });
  }

  if (callbacks.onReset) {
    shortcuts.push({
      key: 'r',
      ctrlKey: true,
      callback: callbacks.onReset,
      description: 'Reiniciar formulario (Ctrl+R)',
    });
  }

  useKeyboardShortcuts(shortcuts, enabled);

  return shortcuts;
}

// KeyboardShortcut interface is already exported above