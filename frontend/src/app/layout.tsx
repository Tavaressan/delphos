import '../styles/globals.css';
import { AuthProvider } from '../providers/AuthProvider';
import { ConversationProvider } from '../providers/ConversationProvider';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br" className="h-full">
      <head>
        <title>Alfabra Enterprise Agent Platform</title>
        <meta name="description" content="Plataforma corporativa de execução de agentes e busca híbrida RAG da Alfabra." />
        <link rel="icon" href="/assets/images/Logo_Alfabra_Icone.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`h-full bg-slate-50 text-slate-800 font-body ${inter.className}`}>
        <AuthProvider>
          <ConversationProvider>
            {children}
          </ConversationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
