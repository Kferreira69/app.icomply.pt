export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 text-white">
            <img
              src="/favicon.svg"
              alt="iComply"
              className="w-10 h-10"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span className="text-2xl font-bold tracking-tight">iComply</span>
          </div>
          <p className="text-blue-200 mt-2 text-sm tracking-wide">Governance Operating System</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {children}
        </div>
        <p className="text-center text-blue-200 text-xs mt-6">
          © 2026 iComply · All rights reserved
        </p>
      </div>
    </div>
  );
}
