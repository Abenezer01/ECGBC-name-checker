import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ECGBC Name Checker',
  description: 'ECGBC Registration Name Checker',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 dark:bg-slate-950 min-h-screen font-sans text-slate-900 dark:text-slate-100 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
