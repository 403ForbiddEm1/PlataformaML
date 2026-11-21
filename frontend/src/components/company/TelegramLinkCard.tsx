import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Send as TelegramIcon, ShieldCheck } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { companyService } from '@/services/company.service';

type TelegramStatus = Awaited<ReturnType<typeof companyService.getTelegramStatus>>;

interface TelegramLinkCardProps {
  /** Solo el administrador de la empresa puede vincular o cambiar la cuenta */
  canManage: boolean;
  className?: string;
}

/**
 * Vincula la cuenta real de Telegram de la empresa (con su foto, nombre y @usuario).
 * Desde ahí salen los mensajes de todo el equipo de RRHH hacia los candidatos.
 */
export const TelegramLinkCard: React.FC<TelegramLinkCardProps> = ({ canManage, className = '' }) => {
  const { showToast } = useToast();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<'idle' | 'phone' | 'code'>('idle');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password2FA, setPassword2FA] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await companyService.getTelegramStatus());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'No se pudo consultar el estado de Telegram.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setBusy(true);
    try {
      const res = await companyService.sendTelegramCode(phone.trim());
      setPhone(res.telefono);
      setStep('code');
      showToast('Código enviado', res.mensaje, 'success');
    } catch (err: any) {
      showToast('No se pudo enviar el código', err?.message || 'Revisa el número e inténtalo de nuevo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await companyService.verifyTelegramCode(code.trim(), password2FA || undefined);
      showToast('Telegram conectado', `La cuenta ${res.username || res.telefono} ya envía los mensajes de tu empresa.`, 'success');
      setStep('idle');
      setCode('');
      setPassword2FA('');
      setNeeds2FA(false);
      await load();
    } catch (err: any) {
      const msg: string = err?.message || 'Código inválido o expirado.';
      if (/2 pasos|2FA/i.test(msg)) setNeeds2FA(true);
      showToast('No se pudo verificar', msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-[#0B0F17] border border-[#DED7C8] dark:border-[#232D42] text-[#090A0C] dark:text-[#F1F2EC] placeholder:text-[#777873] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]';
  const primaryBtn =
    'press px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0B5D46] hover:bg-[#0F7358] dark:bg-[#C8FF45] dark:hover:bg-[#D5FF6B] text-white dark:text-[#090A0C] disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2';

  return (
    <section
      className={`rounded-2xl border border-[#DED7C8] dark:border-[#232D42] bg-[#FCFBF8] dark:bg-[#111622] p-5 sm:p-6 space-y-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-300 border border-sky-500/25 flex items-center justify-center shrink-0">
          <TelegramIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-base text-[#090A0C] dark:text-[#F1F2EC]">Telegram de la empresa</h3>
          <p className="text-xs text-[#777873] leading-relaxed mt-0.5">
            Conecta la cuenta de Telegram de tu empresa. Todo el equipo escribe desde la plataforma y el mensaje
            llega al Telegram del candidato firmado con el nombre de quien lo envió. (Se recomienda usar un número distinto al personal de candidato, aunque puedes usar el mismo número en ambos sin inconveniente).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-16" />
      ) : error ? (
        <div className="flex items-center justify-between gap-3 text-sm text-rose-600 dark:text-rose-300">
          <span>{error}</span>
          <button type="button" onClick={load} className="press px-3 py-1.5 rounded-lg border border-[#DED7C8] dark:border-[#232D42] text-xs font-semibold cursor-pointer">
            Reintentar
          </button>
        </div>
      ) : status?.conectado ? (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/25">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#090A0C] dark:text-[#F1F2EC] truncate">
              {status.nombreCuenta || 'Cuenta conectada'} {status.username ? `· ${status.username}` : ''}
            </p>
            <p className="text-[11px] font-mono-tabular text-[#777873]">{status.telefono}</p>
          </div>
          {canManage && step === 'idle' && (
            <button type="button" onClick={() => setStep('phone')} className="press text-xs font-semibold text-[#0B5D46] dark:text-[#C8FF45] hover:underline cursor-pointer">
              Cambiar cuenta
            </button>
          )}
        </div>
      ) : !status?.apiConfigurada ? (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5">
          El servidor aún no tiene configuradas las credenciales de Telegram (TELEGRAM_API_ID / TELEGRAM_API_HASH).
        </p>
      ) : (
        <p className="text-sm text-[#777873] bg-[#EFE5D4]/50 dark:bg-[#0B0F17] border border-[#DED7C8] dark:border-[#232D42] rounded-xl p-3.5">
          Aún no hay una cuenta de Telegram conectada. Mientras tanto, los avisos salen únicamente por correo.
        </p>
      )}

      {canManage && !loading && !error && status?.apiConfigurada && (
        <>
          {step === 'idle' && !status?.conectado && (
            <button type="button" onClick={() => setStep('phone')} className={primaryBtn}>
              <TelegramIcon className="w-4 h-4" /> Conectar Telegram
            </button>
          )}

          {step === 'phone' && (
            <form onSubmit={sendCode} className="space-y-3 animate-pop-in">
              <label className="block text-xs font-semibold text-[#090A0C] dark:text-[#F1F2EC]">
                Número de Telegram de la empresa
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+58 412 1234567"
                  className={`${inputClass} mt-1.5`}
                  autoFocus
                />
              </label>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={busy} className={primaryBtn}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Enviar código
                </button>
                <button type="button" onClick={() => setStep('idle')} className="press px-3 py-2.5 text-xs font-semibold text-[#777873] hover:text-[#090A0C] dark:hover:text-[#F1F2EC] cursor-pointer">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verify} className="space-y-3 animate-pop-in">
              <p className="text-xs text-[#777873]">
                Telegram envió un código a la app de <span className="font-mono-tabular font-semibold">{phone}</span>.
              </p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                placeholder="Código de 5 dígitos"
                inputMode="numeric"
                className={`${inputClass} font-mono-tabular tracking-[0.3em] text-center`}
                autoFocus
              />
              {needs2FA && (
                <input
                  type="password"
                  value={password2FA}
                  onChange={(e) => setPassword2FA(e.target.value)}
                  placeholder="Contraseña de verificación en 2 pasos"
                  className={inputClass}
                />
              )}
              <div className="flex items-center gap-2">
                <button type="submit" disabled={busy} className={primaryBtn}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Verificar y conectar
                </button>
                <button type="button" onClick={() => setStep('phone')} className="press px-3 py-2.5 text-xs font-semibold text-[#777873] hover:text-[#090A0C] dark:hover:text-[#F1F2EC] cursor-pointer">
                  Cambiar número
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {!canManage && !loading && (
        <p className="flex items-center gap-1.5 text-[11px] text-[#777873]">
          <ShieldCheck className="w-3.5 h-3.5" /> Solo el administrador de la empresa puede conectar o cambiar la cuenta.
        </p>
      )}
    </section>
  );
};
