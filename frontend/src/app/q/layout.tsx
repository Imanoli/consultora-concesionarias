export default function PublicQuoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 md:p-10">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  )
}
