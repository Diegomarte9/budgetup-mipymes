'use client';

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    label: 'Al menos 8 caracteres',
    test: (password) => password.length >= 8,
  },
  {
    label: 'Una mayúscula',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'Una minúscula',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'Un número',
    test: (password) => /[0-9]/.test(password),
  },
  {
    label: 'Un carácter especial',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return 0;
    return requirements.filter((req) => req.test(password)).length;
  }, [password]);

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return 'bg-red-500';
    if (strength < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 2) return 'Débil';
    if (strength < 4) return 'Media';
    return 'Fuerte';
  };

  if (!password && !showRequirements) return null;

  return (
    <div className="space-y-2">
      {password && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Fortaleza:</span>
            <span
              className={`font-medium ${
                strength < 2
                  ? 'text-red-400'
                  : strength < 4
                    ? 'text-yellow-400'
                    : 'text-green-400'
              }`}
            >
              {getStrengthText(strength)}
            </span>
          </div>
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i < strength ? getStrengthColor(strength) : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {showRequirements && (
        <div className="space-y-1">
          <p className="text-sm text-slate-400">
            La contraseña debe contener:
          </p>
          <ul className="space-y-1">
            {requirements.map((requirement, index) => {
              const isValid = password ? requirement.test(password) : false;
              return (
                <li
                  key={index}
                  className={`flex items-center space-x-2 text-sm ${
                    isValid ? 'text-green-400' : 'text-slate-500'
                  }`}
                >
                  {isValid ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  <span>{requirement.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}