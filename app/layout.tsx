import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RehabRight - Recover Faster. Live Better.',
  description: 'Instant, private form feedback on your phone. AI-powered physiotherapy guidance.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        {children}
      </body>
    </html>
  )
}
