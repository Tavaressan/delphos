// src/app/layout.tsx
import '../styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br" className="h-full">
      <head>
        <title>Alfabra Enterprise Agent Platform</title>
        <meta name="description" content="Plataforma corporativa de execução de agentes e busca híbrida RAG da Alfabra." />
      </head>
      <body className="h-full">
        {children}
      </body>
    </html>
  );
}
