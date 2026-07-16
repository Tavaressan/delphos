'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button, Input } from '../../../components/ui';
import { useAuth } from '../../../providers/AuthProvider';
import { userRepository } from '../../../infrastructure/repositories/UserRepository';
import { executionRepository } from '../../../infrastructure/repositories/ExecutionRepository';
import { UserProfile } from '../../../domain/entities';
import { ListExecutionItemResponse } from '../../../domain/dto';
import { ShieldCheck, Building2, Calendar, Activity, Camera, Save, Loader2 } from 'lucide-react';

const getInitials = (name?: string) => {
  if (!name) return 'US';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return value;
  }
};

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 py-2 border-b border-border-color last:border-b-0">
    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono">{label}</span>
    <span className="text-sm text-text-primary font-semibold">{value}</span>
  </div>
);

export default function ProfilePage() {
  const { user, tenantId } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [executions, setExecutions] = useState<ListExecutionItemResponse[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await userRepository.getMe(user.id);
        if (cancelled) return;
        setProfile(data);
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
        setJobTitle(data.jobTitle ?? '');
        setEmail(data.email ?? '');
        setEmailConfirm(data.email ?? '');
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Falha ao carregar perfil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!tenantId) return;
    executionRepository.listExecutions(tenantId)
      .then((list) => setExecutions(list.slice(0, 5)))
      .catch(() => setExecutions([]));
  }, [tenantId]);

  const displayName = (profile?.firstName ?? user?.firstName)
    ? `${profile?.firstName ?? user?.firstName}${(profile?.lastName ?? user?.lastName) ? ` ${profile?.lastName ?? user?.lastName}` : ''}`
    : profile?.username ?? user?.username ?? 'Usuário';

  const handleSave = async () => {
    if (!user?.id) return;
    if (email !== emailConfirm) {
      setError('A confirmação de e-mail não corresponde ao e-mail informado.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const updated = await userRepository.updateMe(user.id, {
        firstName,
        lastName,
        jobTitle,
        email,
      });
      setProfile(updated);
      setSaveMessage('Perfil atualizado com sucesso.');
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    setUploadingAvatar(true);
    setError(null);
    try {
      const avatarUrl = await userRepository.uploadAvatar(user.id, file);
      setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao enviar avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const currentRole = profile?.roles?.[0] ?? user?.role ?? 'ROLE_USER';

  return (
    <>
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 flex flex-col min-h-0 font-body transition-colors duration-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Meu Perfil</h2>
            <p className="text-text-secondary text-xs mt-1">Informações da sua conta e acesso no sistema.</p>
          </div>

          {error && (
            <div className="mb-4 max-w-4xl text-xs font-mono text-danger bg-red-50 dark:bg-red-950/20 border border-danger/30 rounded px-3 py-2">
              {error}
            </div>
          )}
          {saveMessage && (
            <div className="mb-4 max-w-4xl text-xs font-mono text-success bg-emerald-50 dark:bg-emerald-950/20 border border-success/30 rounded px-3 py-2">
              {saveMessage}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-4xl">

            {/* Avatar + identidade */}
            <div className="card-alfabra flex flex-col items-center gap-4 xl:col-span-1">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-full bg-primary text-white font-bold flex items-center justify-center text-2xl shadow-md select-none overflow-hidden bg-cover bg-center"
                  style={
                    avatarPreview || profile?.avatarUrl
                      ? { backgroundImage: `url(${avatarPreview ?? profile?.avatarUrl})` }
                      : undefined
                  }
                >
                  {!avatarPreview && !profile?.avatarUrl && getInitials(displayName)}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1.5 shadow-md hover:bg-primary/90"
                  aria-label="Alterar avatar"
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="text-center">
                <p className="font-bold text-text-primary text-base">{displayName}</p>
                <p className="text-xs text-text-secondary font-mono mt-0.5">{profile?.username ?? user?.username ?? '—'}</p>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <Badge variant="primary" className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {currentRole}
                </Badge>
                <Badge variant="secondary">
                  Tenant: {profile?.tenantId ?? tenantId}
                </Badge>
              </div>
            </div>

            {/* Dados pessoais + acesso */}
            <div className="xl:col-span-2 flex flex-col gap-6">

              <div className="card-alfabra">
                <div className="flex items-center gap-2 border-b border-border-color pb-3 mb-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-text-primary text-sm heading-font uppercase">Identidade</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                  <div className="flex flex-col gap-1">
                    <label className="label-alfabra">Nome</label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="label-alfabra">Sobrenome</label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="label-alfabra">Cargo / Departamento</label>
                    <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} disabled={loading} placeholder="Ex.: Engenharia de Software" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="label-alfabra">E-mail</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="label-alfabra">Confirmar e-mail</label>
                    <Input type="email" value={emailConfirm} onChange={(e) => setEmailConfirm(e.target.value)} disabled={loading} />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} disabled={saving || loading} className="flex items-center gap-1.5">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar alterações
                  </Button>
                </div>
              </div>

              <div className="card-alfabra">
                <div className="flex items-center gap-2 border-b border-border-color pb-3 mb-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-text-primary text-sm heading-font uppercase">Dados de Acesso</h3>
                </div>
                <InfoRow label="Papel (Role)" value={
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> {currentRole}
                  </span>
                } />
                <InfoRow label="Tenant / Organização" value={profile?.tenantId ?? tenantId} />
                <InfoRow label="Conta criada em" value={formatDate(profile?.createdAt ?? null)} />
              </div>

              <div className="card-alfabra">
                <div className="flex items-center gap-2 border-b border-border-color pb-3 mb-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-text-primary text-sm heading-font uppercase">Atividade Recente</h3>
                </div>
                <InfoRow label="Último login" value={formatDate(profile?.lastLogin ?? null)} />
                {executions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                    <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm text-text-secondary">Nenhuma execução de agente recente.</p>
                  </div>
                ) : (
                  <ul className="flex flex-col divide-y divide-border-color">
                    {executions.map((execution) => (
                      <li key={execution.executionId} className="py-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-text-primary truncate max-w-[60%]">{execution.prompt ?? execution.executionId}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{execution.status}</Badge>
                          <span className="text-[10px] text-text-secondary font-mono">{formatDate(execution.startedAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </div>
        </main>
    </>
  );
}
