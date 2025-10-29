'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  createInvitationSchema,
  type CreateInvitationFormData,
  type Invitation,
} from '@/lib/validations/invitations';

interface InviteUserFormProps {
  organizationId: string;
  onInviteSent: (invitation: Invitation) => void;
  onCancel?: () => void;
}

export function InviteUserForm({
  organizationId,
  onInviteSent,
  onCancel,
}: InviteUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateInvitationFormData>({
    resolver: zodResolver(createInvitationSchema),
    mode: 'onChange', // Enable real-time validation
    defaultValues: {
      email: '',
      role: 'member',
      organizationId,
    },
  });

  // Watch form values to clear errors when corrected
  const watchedEmail = form.watch('email');
  const watchedRole = form.watch('role');

  // Clear errors when fields are corrected
  useEffect(() => {
    if (watchedEmail && watchedEmail.trim()) {
      form.clearErrors('email');
    }
  }, [watchedEmail, form]);

  useEffect(() => {
    if (watchedRole) {
      form.clearErrors('role');
    }
  }, [watchedRole, form]);

  const onSubmit = async (data: CreateInvitationFormData) => {
    try {
      setIsLoading(true);

      // Clear any previous form errors
      form.clearErrors();

      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          if (result.error.includes('ya es miembro')) {
            form.setError('email', {
              type: 'manual',
              message: 'Este usuario ya es miembro de la organización'
            });
          } else if (result.error.includes('invitación pendiente')) {
            form.setError('email', {
              type: 'manual',
              message: 'Ya existe una invitación pendiente para este email'
            });
          } else {
            form.setError('email', {
              type: 'manual',
              message: result.error
            });
          }
          return;
        } else if (response.status === 400) {
          // Handle validation errors
          if (result.details && Array.isArray(result.details)) {
            result.details.forEach((detail: any) => {
              if (detail.path && detail.path.length > 0) {
                form.setError(detail.path[0] as keyof CreateInvitationFormData, {
                  type: 'manual',
                  message: detail.message
                });
              }
            });
          } else {
            toast.error(result.error || 'Datos de entrada inválidos');
          }
          return;
        } else if (response.status === 403) {
          toast.error('No tienes permisos para enviar invitaciones');
          return;
        }
        
        throw new Error(result.error || 'Error al enviar la invitación');
      }

      // Show success message with invitation link
      const invitationUrl = `${window.location.origin}/auth/invitation?code=${result.invitation.code}`;
      toast.success(
        `Invitación enviada exitosamente. Enlace: ${invitationUrl}`,
        { duration: 10000 }
      );
      
      onInviteSent(result.invitation);
      form.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email del usuario <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol <span className="text-red-500">*</span></FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="member">Miembro</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? 'Enviando...' : 'Enviar invitación'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}