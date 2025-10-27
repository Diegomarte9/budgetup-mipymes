'use client';

import React from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Organization {
  id: string;
  name: string;
  role?: string;
}

interface OrganizationSwitcherProps {
  organizations: Organization[];
  currentOrganization?: Organization;
  onOrganizationChange: (organizationId: string) => void;
  disabled?: boolean;
}

export function OrganizationSwitcher({
  organizations,
  currentOrganization,
  onOrganizationChange,
  disabled = false,
}: OrganizationSwitcherProps) {
  const [open, setOpen] = React.useState(false);

  if (organizations.length === 0) {
    return (
      <Button variant="outline" disabled className="w-full justify-start">
        <Building2 className="mr-2 h-4 w-4" />
        Sin organizaciones
      </Button>
    );
  }

  if (organizations.length === 1) {
    return (
      <Button variant="outline" disabled className="w-full justify-start">
        <Building2 className="mr-2 h-4 w-4" />
        {organizations[0].name}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <div className="flex items-center">
            <Building2 className="mr-2 h-4 w-4" />
            {currentOrganization?.name || 'Seleccionar organización'}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar organización..." />
          <CommandEmpty>No se encontraron organizaciones.</CommandEmpty>
          <CommandGroup>
            {organizations.map((org) => (
              <CommandItem
                key={org.id}
                value={org.name}
                onSelect={() => {
                  onOrganizationChange(org.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    currentOrganization?.id === org.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex flex-col">
                  <span>{org.name}</span>
                  {org.role && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {org.role}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}