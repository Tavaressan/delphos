'use client';

import React, { useEffect, useState } from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { Palette, Bell, Link2, ShieldCheck, Sun, Moon, Loader2, X } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../hooks/useTheme';
import { apiClient } from '../../infrastructure/api/apiClient';
import { userRepository } from '../../infrastructure/repositories/UserRepository';
import { UserSession } from '../../domain/entities';

type Locale = 'pt-BR' | 'en-US';
type Density = 'compact' | 'normal' | 'spacious';

interface NotificationPrefs {
  agentAlerts: boolean;
  ingestionAlerts: boolean;
  maintenanceAlerts: boolean;
}

const LOCALE_KEY = 'alfabra_locale';
const DENSITY_KEY = 'alfabra_density';
const NOTIFICATIONS_KEY = 'alfabra_notifications';
const TIMEOUT_KEY = 'alfabra_request_timeout_ms';

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  agentAlerts: true,
  ingestionAlerts: true,
  maintenanceAlerts: false,
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return value;
  }
};

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="card-alfabra flex flex-col gap-4">
    <div className="flex items-center gap-2 border-b border-border-color pb-3">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="font-bold text-text-primary text-sm heading-font uppercase">{title}</h3>
    </div>
    {children}
  </div>
);

const Toggle = ({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string }) => (
  <div className="flex items-center justify-between py-1 gap-4">
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <span className="text-xs text-text-secondary">{description}</span>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-4.5' : 'translate-x-1'}`} />
    </button>
  </div>
);

export default function SettingsPage() {
  const { user } = useAuth();

  const { theme, toggleTheme } = useTheme();
  const [locale, setLocale] = useState<Locale>('pt-BR');
  const [density, setDensity] = useState<Density>('normal');
  const [notifications, setNotifications] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);

  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [requestTimeout, setRequestTimeout] = useState<string>('15000');

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (savedLocale) setLocale(savedLocale);

    const savedDensity = localStorage.getItem(DENSITY_KEY) as Density | null;
    if (savedDensity) setDensity(savedDensity);

    const savedNotifications = localStorage.getItem(NOTIFICATIONS_KEY);
    if (savedNotifications) {
      try {
        setNotifications({ ...DEFAULT_NOTIFICATIONS, ...JSON.parse(savedNotifications) });
      } catch {
        // ignora preferências corrompidas
      }
    }

    const savedTimeout = localStorage.getItem(TIMEOUT_KEY);
    if (savedTimeout) setRequestTimeout(savedTimeout);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await apiClient.get<{ status: string }>('/actuator/health', { timeout: 3000 });
        setIsBackendOnline(response?.status === 'UP');
      } catch {
        setIsBackendOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setSessionsLoading(false);
      return;
    }
    let cancelled = false;
    userRepository.listSessions(user.id)
      .then((list) => {
        if (!cancelled) setSessions(list);
      })
      .catch((err: any) => {
        if (!cancelled) setSessionsError(err?.message ?? 'Falha ao carregar sessões ativas.');
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleLocaleChange = (value: Locale) => {
    setLocale(value);
    localStorage.setItem(LOCALE_KEY, value);
  };

  const handleDensityChange = (value: Density) => {
    setDensity(value);
    localStorage.setItem(DENSITY_KEY, value);
    document.documentElement.setAttribute('data-density', value);
  };

  const handleNotificationChange = (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  };

  const handleTimeoutChange = (value: string) => {
    setRequestTimeout(value);
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      localStorage.setItem(TIMEOUT_KEY, String(parsed));
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!user?.id) return;
    setRevoking(true);
    setSessionsError(null);
    try {
      await userRepository.revokeOtherSessions(user.id);
      setSessions([]);
    } catch (err: any) {
      setSessionsError(err?.message ?? 'Falha ao encerrar sessões.');
    } finally {
      setRevoking(false);
    }
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
    setShowPasswordModal(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da nova senha não corresponde.');
      return;
    }
    setPasswordSaving(true);
    setPasswordError(null);
    try {
      await userRepository.changePassword(user.id, { currentPassword, newPassword });
      setPasswordSuccess('Senha alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.message ?? 'Falha ao alterar senha.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary transition-colors duration-200">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 flex flex-col min-h-0 font-body transition-colors duration-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Configurações</h2>
            <p className="text-text-secondary text-xs mt-1">Preferências e configurações do sistema Alfabra Vector.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-4xl">

            <Section icon={Palette} title="Aparência">
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text-primary">Tema</span>
                  <span className="text-xs text-text-secondary">Alternar entre modo claro e escuro</span>
                </div>
                <Button variant="secondary" onClick={toggleTheme} className="flex items-center gap-1.5">
                  {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  {theme === 'light' ? 'Escuro' : 'Claro'}
                </Button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="label-alfabra">Idioma</label>
                <select
                  className="input-alfabra"
                  value={locale}
                  onChange={(e) => handleLocaleChange(e.target.value as Locale)}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="label-alfabra">Densidade</label>
                <select
                  className="input-alfabra"
                  value={density}
                  onChange={(e) => handleDensityChange(e.target.value as Density)}
                >
                  <option value="compact">Compacto</option>
                  <option value="normal">Normal</option>
                  <option value="spacious">Espaçado</option>
                </select>
              </div>
            </Section>

            <Section icon={Bell} title="Notificações">
              <Toggle
                label="Alertas de agentes"
                description="Notificar quando uma execução terminar ou falhar"
                checked={notifications.agentAlerts}
                onChange={(v) => handleNotificationChange('agentAlerts', v)}
              />
              <Toggle
                label="Ingestão de documentos"
                description="Notificar ao concluir indexação de documentos"
                checked={notifications.ingestionAlerts}
                onChange={(v) => handleNotificationChange('ingestionAlerts', v)}
              />
              <Toggle
                label="Atualizações do sistema"
                description="Receber avisos de manutenção e novidades"
                checked={notifications.maintenanceAlerts}
                onChange={(v) => handleNotificationChange('maintenanceAlerts', v)}
              />
            </Section>

            <Section icon={Link2} title="Integração">
              <div className="flex flex-col gap-1">
                <label className="label-alfabra">URL do Backend</label>
                <input
                  type="text"
                  className="input-alfabra opacity-60 cursor-not-allowed"
                  value={process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'}
                  readOnly
                  disabled
                />
                <span className="text-[10px] text-text-secondary font-mono mt-0.5">Configurado via variável de ambiente</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-semibold text-text-primary">Status do backend</span>
                <span className="font-mono text-[10px] uppercase font-bold">
                  {isBackendOnline === true ? (
                    <span className="text-success">Online</span>
                  ) : isBackendOnline === false ? (
                    <span className="text-danger">Offline</span>
                  ) : (
                    <span className="text-slate-400">Verificando...</span>
                  )}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="label-alfabra">Timeout de requisições (ms)</label>
                <Input
                  type="number"
                  min={1000}
                  step={500}
                  value={requestTimeout}
                  onChange={(e) => handleTimeoutChange(e.target.value)}
                />
              </div>
            </Section>

            <Section icon={ShieldCheck} title="Segurança">
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text-primary">Alterar senha</span>
                  <span className="text-xs text-text-secondary">Redefinir senha da conta atual</span>
                </div>
                <Button variant="secondary" onClick={openPasswordModal}>Alterar</Button>
              </div>

              <div className="flex flex-col gap-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-primary">Sessões ativas</span>
                  <Button
                    variant="danger"
                    onClick={handleRevokeOtherSessions}
                    disabled={revoking || sessionsLoading || sessions.length === 0}
                  >
                    {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Encerrar todas'}
                  </Button>
                </div>
                {sessionsLoading ? (
                  <span className="text-xs text-text-secondary">Carregando sessões...</span>
                ) : sessionsError ? (
                  <span className="text-xs text-danger">{sessionsError}</span>
                ) : sessions.length === 0 ? (
                  <span className="text-xs text-text-secondary">Nenhuma sessão ativa encontrada.</span>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {sessions.map((session) => (
                      <li key={session.id} className="flex flex-col gap-0.5 text-xs border border-border-color rounded px-2.5 py-2">
                        <span className="font-semibold text-text-primary">{session.userAgent ?? 'Dispositivo desconhecido'}</span>
                        <span className="text-text-secondary font-mono">
                          {session.ipAddress ?? '—'} · último acesso: {formatDate(session.lastActiveAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>

          </div>
        </main>
      </div>
      <Footer />

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-alfabra w-full max-w-sm relative">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-text-primary text-sm heading-font uppercase mb-4">Alterar senha</h3>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="label-alfabra">Senha atual</label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label-alfabra">Nova senha</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label-alfabra">Confirmar nova senha</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
              </div>
              {passwordError && <span className="text-xs text-danger">{passwordError}</span>}
              {passwordSuccess && <span className="text-xs text-success">{passwordSuccess}</span>}
              <Button type="submit" disabled={passwordSaving} className="mt-2 flex items-center justify-center gap-2">
                {passwordSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar nova senha'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
