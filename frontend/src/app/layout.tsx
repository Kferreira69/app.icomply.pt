import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { Providers } from './providers';
import { I18nProvider } from '@/i18n/provider';
import type { Locale } from '@/i18n/config';
import { defaultLocale } from '@/i18n/config';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'iComply — Compliance Operating System',
  description: 'European SaaS Compliance Management Platform',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const locale = (cookieStore.get('locale')?.value || defaultLocale) as Locale;

  // Load messages server-side — bundled as static JSON, zero round-trip
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const messages = (await import(`../../messages/${locale}.json`)).default;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <I18nProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
