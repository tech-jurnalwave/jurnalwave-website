'use client'

import React, { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function ChatRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const ticket = searchParams.get('ticket') || searchParams.get('id') || ''
    const targetUrl = ticket
      ? `/jurnal-central/laporan?openChat=${encodeURIComponent(ticket)}`
      : `/jurnal-central/laporan?openChat=true`

    // Buka jendela floating chat admin secara otomatis dalam mode fullscreen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('openFloatingAdminChat', {
          detail: {
            ticketNumber: ticket,
            isMaximized: true,
          },
        })
      )
    }

    router.replace(targetUrl)
  }, [router, searchParams])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-8 h-8 text-[#c00015] animate-spin mb-3" />
      <p className="text-sm font-semibold text-slate-700">Membuka Pusat Chat Warga...</p>
      <p className="text-xs text-slate-400 mt-1">Mengalihkan ke jendela obrolan terpadu</p>
    </div>
  )
}

export default function ChatRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#c00015] animate-spin" />
        </div>
      }
    >
      <ChatRedirectContent />
    </Suspense>
  )
}
