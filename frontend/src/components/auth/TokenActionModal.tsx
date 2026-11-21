import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, MailCheck, UserPlus, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { UserRole } from '@/types';

export type EmailTokenAction =
  | { type: 'verify-email'; token: string }
  | { type: 'reset-password'; token: string }
  | { type: 'accept-invitation'; token: string }
  | null;

interface TokenActionModalProps {
  action: EmailTokenAction;
  onClose: () => void;
  onAuthenticated?: (role: UserRole) => void;
  onGoToLogin: () => void;
}

/**
 * Resuelve los enlaces enviados por correo desde el backend:
 * /verify-email?token=..., /reset-password?token=..., /accept-invitation?token=...
 */
export const TokenActionModal: React.FC<TokenActionModalProps> = ({
  action,
  onClose,
  onAuthenticated,
  onGoToLogin,
}) => {
  const { setSessionUser } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Reset password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Accept invitation state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    setErrorMessage('');
    setNewPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');

    if (!action) {
      setStatus('idle');
      return;
    }

    if (action.type === 'accept-invitation' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qName = params.get('name')?.trim() || '';
      const qPhone = params.get('phone')?.trim() || '';
      if (qName) {
        const parts = qName.split(/\s+/);
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
      if (qPhone) {
        setPhone(qPhone);
      }
    }

    if (action.type === 'verify-email') {
      setStatus('loading');
      authService
        .verifyEmailToken(action.token)
        .then(() => {
          setStatus('success');
          showToast('Correo verificado', 'Tu dirección de correo fue confirmada correctamente.', 'success');
        })
        .catch((err) => {
          setStatus('error');
          setErrorMessage(err?.message || 'El enlace de verificación expiró o no es válido.');
        });
    } else {
      setStatus('idle');
    }
  }, [action, showToast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action || action.type !== 'reset-password') return;
    if (newPassword.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }
    setStatus('loading');
    setErrorMessage('');
    try {
      await authService.resetPasswordWithToken({ token: action.token, password: newPassword });
      setStatus('success');
      showToast('Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva clave.', 'success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'No se pudo restablecer la contraseña.');
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action || action.type !== 'accept-invitation') return;
    if (!firstName.trim()) {
      setErrorMessage('Ingresa tu nombre para completar el registro.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setStatus('loading');
    setErrorMessage('');
    try {
      const res = await authService.acceptInvitationToken({
        token: action.token,
        firstName,
        lastName,
        password: newPassword,
        phone,
      });
      setStatus('success');
      showToast('Invitación aceptada', 'Tu cuenta corporativa está lista.', 'success');
      if (res.user && onAuthenticated) {
        setSessionUser(res.user);
        onClose();
        onAuthenticated(res.user.role);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'No se pudo aceptar la invitación.');
    }
  };

  if (!action) return null;

  const title =
    action.type === 'verify-email'
      ? 'Verificación de correo electrónico'
      : action.type === 'reset-password'
      ? 'Restablecer contraseña'
      : 'Aceptar invitación de equipo';

  return (
    <Modal isOpen={Boolean(action)} onClose={onClose} title={title} maxWidth="md" variant="manila">
      {action.type === 'verify-email' && (
        <div className="space-y-4 py-2 text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B5D46] dark:text-[#C8FF45]" />
              <p className="text-sm text-[#70553b] dark:text-slate-300">Validando enlace de verificación...</p>
            </div>
          )}
          {status === 'success' && (
            <div className="space-y-3 py-2">
              <div className="w-12 h-12 rounded-2xl mx-auto bg-emerald-500/15 text-[#0B5D46] dark:text-[#C8FF45] flex items-center justify-center">
                <MailCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#3a2818] dark:text-[#F1F2EC]">
                ¡Correo verificado exitosamente!
              </p>
              <p className="text-xs text-[#70553b] dark:text-slate-400">
                Ya puedes iniciar sesión normalmente en tu panel.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    onGoToLogin();
                  }}
                >
                  Ir a iniciar sesión
                </Button>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-3 py-2">
              <div className="w-12 h-12 rounded-2xl mx-auto bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{errorMessage}</p>
              <Button size="sm" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      )}

      {action.type === 'reset-password' && (
        status === 'success' ? (
          <div className="space-y-4 py-3 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto bg-emerald-500/15 text-[#0B5D46] dark:text-[#C8FF45] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#3a2818] dark:text-[#F1F2EC]">
              Contraseña restablecida correctamente.
            </p>
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onGoToLogin();
              }}
            >
              Iniciar sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3.5 pt-1">
            <div className="flex items-center gap-2 text-xs text-[#70553b] dark:text-slate-400">
              <KeyRound className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45]" />
              <span>Define una nueva contraseña segura (mínimo 8 caracteres).</span>
            </div>
            <Input
              label="Nueva contraseña *"
              type="password"
              isPassword
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirmar contraseña *"
              type="password"
              isPassword
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {errorMessage && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errorMessage}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" isLoading={status === 'loading'}>
                Guardar contraseña
              </Button>
            </div>
          </form>
        )
      )}

      {action.type === 'accept-invitation' && (
        status === 'success' ? (
          <div className="space-y-4 py-3 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto bg-emerald-500/15 text-[#0B5D46] dark:text-[#C8FF45] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#3a2818] dark:text-[#F1F2EC]">
              Invitación aceptada. Ya puedes iniciar sesión con tu cuenta corporativa.
            </p>
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onGoToLogin();
              }}
            >
              Ir al acceso
            </Button>
          </div>
        ) : (
          <form onSubmit={handleAcceptInvitation} className="space-y-3.5 pt-1">
            <div className="flex items-center gap-2 text-xs text-[#70553b] dark:text-slate-400">
              <UserPlus className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45]" />
              <span>Completa tus datos para activar tu acceso a la empresa.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombre *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Carlos"
                required
              />
              <Input
                label="Apellido"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Arismendi"
              />
            </div>
            <Input
              label="Teléfono / Telegram"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (809) 555-0000"
            />
            <Input
              label="Contraseña de acceso *"
              type="password"
              isPassword
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {errorMessage && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errorMessage}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" isLoading={status === 'loading'}>
                Activar cuenta
              </Button>
            </div>
          </form>
        )
      )}
    </Modal>
  );
};
