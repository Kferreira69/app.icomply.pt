export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-white">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-brand-700 font-bold text-xl">i</span>
            </div>
            <span className="text-2xl font-bold">iComply</span>
          </div>
          <p className="text-blue-200 mt-2 text-sm">Compliance Operating System</p>
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
