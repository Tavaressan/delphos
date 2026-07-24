'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validação real de credenciais contra o backend/mock — o role nunca é
      // decidido pelo cliente (issue #316).
      await login(username, password);
      router.push('/');
    } catch (err) {
      setError('Usuário ou senha inválidos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 font-body p-4">
      <motion.div
        className="w-full max-w-md bg-white border border-slate-200 rounded shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >

        {/* Header */}
        <div className="bg-primary p-6 text-center text-white flex flex-col items-center gap-3">
          <motion.img
            src="/assets/images/LogoMarca_Alfabra.png"
            alt="Alfabra"
            className="h-14 object-contain brightness-0 invert"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.35 }}
          />
          <motion.span
            className="text-xs uppercase font-mono font-bold tracking-widest text-accent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            Login Unificado
          </motion.span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLoginSubmit} className="p-8 flex flex-col gap-5 text-left">
          <div>
            <label className="label-alfabra">Usuário ou E-mail</label>
            <input
              type="text"
              className="input-alfabra"
              placeholder="vitor.tavares@alfabra.com.br"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="label-alfabra">Senha</label>
            <input
              type="password"
              className="input-alfabra"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username || !password}
            className={`btn-primary w-full py-2.5 rounded font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
              isSubmitting || !username || !password
                ? 'opacity-50 cursor-not-allowed bg-slate-300 border-slate-300 text-slate-500'
                : 'bg-primary hover:bg-primary/95 text-white'
            }`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Validar e Entrar</span>
          </button>

          {error && (
            <div className="flex items-center gap-1.5 justify-center text-danger text-xs font-semibold mt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
