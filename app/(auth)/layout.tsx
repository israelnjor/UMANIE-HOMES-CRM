export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0D5271] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-lg">
            <span className="text-2xl font-black text-[#0D5271]">U</span>
          </div>
          <h1 className="text-2xl font-bold text-white">UMANIE Homes</h1>
          <p className="text-[#7AB8D4] text-sm mt-1">Operations CRM</p>
        </div>
        {children}
      </div>
    </div>
  )
}