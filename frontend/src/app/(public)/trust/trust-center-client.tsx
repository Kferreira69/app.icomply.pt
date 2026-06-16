'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Link2, Check } from 'lucide-react';

/** Redirects authenticated users to their org trust page if no ?org= param. */
export function TrustCenterAuthRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isAuthenticated && user?.organization?.slug && !searchParams.get('org')) {
      router.replace(`/trust?org=${user.organization.slug}`);
    }
  }, [isAuthenticated, user, searchParams, router]);

  return null;
}

/** "Copiar link público" button with 2-second confirmation */
export function CopyLinkButton({ accent }: { accent: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all bg-white/15 hover:bg-white/25 text-white backdrop-blur"
      title="Copiar link público"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copiado!
        </>
      ) : (
        <>
          <Link2 className="w-4 h-4" />
          Copiar link público
        </>
      )}
    </button>
  );
}
