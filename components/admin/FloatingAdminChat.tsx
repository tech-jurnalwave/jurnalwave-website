'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  X,
  Send,
  ExternalLink,
  RefreshCw,
  Search,
  ArrowLeft,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { useAdminData } from '@/context/AdminDataContext'
import { DummyReport } from '@/data/dummyReports'

export default function FloatingAdminChat() {
  const { reports, isLoadingReports, counts, refreshReports } = useAdminData()
  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'semua' | 'belum_dibalas' | 'sudah_respon'>('semua')
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [mobilePane, setMobilePane] = useState<'inbox' | 'chat'>('inbox')
  const [activePhoto, setActivePhoto] = useState<string | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const prevTicketIdRef = useRef<string>('')
  const prevMessagesLengthRef = useRef(0)
  const seenAdminChatIdsRef = useRef<Set<string>>(new Set())
  const hasInitializedAdminChatRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Buka izin Web Audio API saat pertama kali user melakukan interaksi di halaman admin
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioCtx) return
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx()
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume()
        }
      } catch {}
    }
    window.addEventListener('click', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })
    return () => {
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [])

  // Suara lonceng/chime notifikasi saat ada warga mengirim pesan
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = audioContextRef.current || new AudioCtx()
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      // Dual-tone ramah & jelas: F5 (698.46Hz) ke C6 (1046.5Hz)
      osc.frequency.setValueAtTime(698.46, ctx.currentTime)
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  // Map ringkasan metadata per tiket (pesan terakhir, belum dibaca, status menunggu)
  const [ticketMeta, setTicketMeta] = useState<
    Record<
      string,
      {
        lastMessage: string
        lastTime: string
        unreadCount: number
        isWaitingAdmin: boolean
        messageCount: number
      }
    >
  >({})

  // Auto-select tiket pertama saat reports tersedia
  useEffect(() => {
    if (!selectedTicketId && reports.length > 0) {
      setSelectedTicketId(reports[0].nomor_tiket || reports[0].id)
    }
  }, [reports, selectedTicketId])

  // Listener event buka floating chat fullscreen dari halaman lain (misal tombol Buka Chat di detail aduan)
  useEffect(() => {
    const handleExternalOpen = (e: any) => {
      const detail = e.detail || {}
      if (detail.ticketNumber) {
        setSelectedTicketId(detail.ticketNumber)
        setMobilePane('chat')
      }
      setIsOpen(true)
      setIsMaximized(detail.isMaximized !== false)
    }

    window.addEventListener('openFloatingAdminChat', handleExternalOpen as any)
    return () => {
      window.removeEventListener('openFloatingAdminChat', handleExternalOpen as any)
    }
  }, [])

  // Cek parameter openChat / ticket di URL saat pertama kali halaman dimuat
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    const openChatParam = urlParams.get('openChat') || urlParams.get('ticket')
    if (openChatParam) {
      setSelectedTicketId(openChatParam)
      setMobilePane('chat')
      setIsOpen(true)
      setIsMaximized(true)
    }
  }, [])

  // Scan metadata percakapan dari seluruh tiket secara real-time dari database
  const scanAllTicketChats = async () => {
    try {
      let dbAllMessages: any[] = []
      try {
        const res = await fetch('/api/chat?all=true', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.data)) {
            dbAllMessages = json.data
          }
        }
      } catch (apiErr) {
        console.warn('Notice floating chat API scan error:', apiErr)
      }

      // Kelompokkan chat DB berdasarkan nomor tiket
      const messagesByTicket: Record<string, any[]> = {}
      let hasNewCitizenMessage = false

      dbAllMessages.forEach((m) => {
        const key = String(m.ticketNumber || '').toUpperCase()
        if (!messagesByTicket[key]) messagesByTicket[key] = []
        messagesByTicket[key].push(m)

        const isCitizen =
          m.role !== 'admin' &&
          m.role !== 'redaksi' &&
          m.sender_id !== 'admin-redaksi' &&
          m.sender_id !== 'admin' &&
          m.senderId !== 'admin-redaksi' &&
          m.senderId !== 'admin' &&
          m.profiles?.role !== 'admin' &&
          m.profiles?.role !== 'redaksi' &&
          !(m.sender_name && m.sender_name.toLowerCase().includes('redaksi'))

        if (isCitizen && m.id) {
          if (!seenAdminChatIdsRef.current.has(m.id)) {
            if (hasInitializedAdminChatRef.current) {
              hasNewCitizenMessage = true
            }
            seenAdminChatIdsRef.current.add(m.id)
          }
        }
      })

      if (!hasInitializedAdminChatRef.current) {
        hasInitializedAdminChatRef.current = true
      } else if (hasNewCitizenMessage) {
        playNotificationChime()
        if (typeof document !== 'undefined') {
          const originalTitle = document.title
          document.title = '🔔 (Pesan Baru Warga!) ' + originalTitle.replace(/^🔔 \(.*?\)\s*/, '')
          setTimeout(() => {
            document.title = originalTitle.replace(/^🔔 \(.*?\)\s*/, '')
          }, 4000)
        }
      }

      const readSet = new Set<string>(
        typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('halo_jurnal_read_chats') || '[]')
          : []
      )
      const readTicketTimes: Record<string, number> =
        typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('halo_jurnal_read_ticket_times') || '{}')
          : {}

      const newMeta: Record<string, any> = {}

      reports.forEach((rep) => {
        const keyId = rep.id
        const keyTicket = rep.nomor_tiket ? String(rep.nomor_tiket).toUpperCase() : null

        // Ambil pesan dari DB (gabungkan keyTicket dan keyId jika ada)
        const dbList = [
          ...((keyTicket && messagesByTicket[keyTicket]) || []),
          ...((keyId && messagesByTicket[String(keyId).toUpperCase()]) || []),
        ]

        // Ambil pesan lokal jika ada dari semua varian key (ID cuid dan nomor tiket)
        let localList: any[] = []
        if (typeof window !== 'undefined') {
          const sources = [
            localStorage.getItem(`halo_jurnal_chat_${keyId}`),
            rep.nomor_tiket ? localStorage.getItem(`halo_jurnal_chat_${rep.nomor_tiket}`) : null,
            rep.nomor_tiket ? localStorage.getItem(`halo_jurnal_chat_${rep.nomor_tiket.toLowerCase()}`) : null,
            rep.nomor_tiket ? localStorage.getItem(`halo_jurnal_chat_${rep.nomor_tiket.toUpperCase()}`) : null,
          ].filter(Boolean)

          sources.forEach((src) => {
            try {
              const parsed = JSON.parse(src!)
              if (Array.isArray(parsed)) {
                localList.push(...parsed)
              }
            } catch {}
          })
        }

        // Deduplikasi pesan gabungan DB & lokal
        const itemMap = new Map<string, any>()
        if (Array.isArray(localList)) {
          localList.forEach((m: any) => {
            if (!m) return
            const k = m.id || `${m.created_at}_${m.message}`
            itemMap.set(k, m)
          })
        }
        if (Array.isArray(dbList)) {
          dbList.forEach((m: any) => {
            if (!m) return
            let matchedKey: string | null = null
            for (const [k, loc] of itemMap.entries()) {
              if (loc.id === m.id) {
                matchedKey = k
                break
              }
              const sameText = (loc.message || '').trim() === (m.message || '').trim()
              const timeDiff = Math.abs(new Date(loc.created_at).getTime() - new Date(m.created_at).getTime())
              if (sameText && timeDiff < 15000) {
                matchedKey = k
                break
              }
            }
            if (matchedKey) itemMap.delete(matchedKey)
            const authoritativeKey = m.id || `${m.created_at}_${m.message}`
            itemMap.set(authoritativeKey, m)
          })
        }
        const combined = Array.from(itemMap.values())

        const isCurrentlyActiveTicket =
          isOpen &&
          (mobilePane === 'chat' || (typeof window !== 'undefined' && window.innerWidth >= 640)) &&
          (selectedTicketId === rep.id ||
            selectedTicketId?.toLowerCase() === rep.nomor_tiket?.toLowerCase())

        const latestMsgTime = combined.reduce((max: number, m: any) => {
          const t = new Date(m.created_at).getTime()
          return isNaN(t) ? max : Math.max(max, t)
        }, 0)

        if (isCurrentlyActiveTicket) {
          const readBarrier = latestMsgTime ? Math.max(Date.now(), latestMsgTime) : Date.now()
          readTicketTimes[rep.id] = readBarrier
          if (rep.nomor_tiket) {
            readTicketTimes[rep.nomor_tiket] = readBarrier
            readTicketTimes[rep.nomor_tiket.toLowerCase()] = readBarrier
            readTicketTimes[rep.nomor_tiket.toUpperCase()] = readBarrier
          }
        }

        const ticketReadTime = Math.max(
          readTicketTimes[rep.id] || 0,
          rep.nomor_tiket ? readTicketTimes[rep.nomor_tiket] || 0 : 0,
          rep.nomor_tiket ? readTicketTimes[rep.nomor_tiket.toLowerCase()] || 0 : 0,
          rep.nomor_tiket ? readTicketTimes[rep.nomor_tiket.toUpperCase()] || 0 : 0
        )

        if (Array.isArray(combined) && combined.length > 0) {
          const sorted = [...combined].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          const lastMsg = sorted[sorted.length - 1]
          const isWargaLast =
            !lastMsg.isSystem &&
            !String(lastMsg.id || '').startsWith('sys-') &&
            lastMsg.role !== 'admin' &&
            lastMsg.role !== 'redaksi' &&
            lastMsg.sender_id !== 'admin-redaksi' &&
            lastMsg.sender_id !== 'dev-admin' &&
            lastMsg.sender_id !== 'admin' &&
            lastMsg.profiles?.role !== 'admin' &&
            lastMsg.profiles?.role !== 'redaksi' &&
            !(lastMsg.sender_name && lastMsg.sender_name.toLowerCase().includes('redaksi'))

          if (isCurrentlyActiveTicket) {
            sorted.forEach((m) => {
              if (m.id) readSet.add(String(m.id))
            })
          }

          const unread = isCurrentlyActiveTicket
            ? 0
            : sorted.filter((m) => {
                const isSystem = m.isSystem || String(m.id || '').startsWith('sys-')
                if (isSystem) return false

                const isCitizen =
                  m.role !== 'admin' &&
                  m.role !== 'redaksi' &&
                  m.sender_id !== 'admin-redaksi' &&
                  m.sender_id !== 'dev-admin' &&
                  m.sender_id !== 'admin' &&
                  m.profiles?.role !== 'admin' &&
                  m.profiles?.role !== 'redaksi' &&
                  !(m.sender_name && m.sender_name.toLowerCase().includes('redaksi'))
                if (!isCitizen) return false

                if (m.id && readSet.has(String(m.id))) return false

                const msgTime = new Date(m.created_at).getTime()
                if (ticketReadTime && msgTime <= ticketReadTime) return false

                return true
              }).length

          const pelaporName = (rep as any).pelaporName || (rep as any).nama_pelapor || 'Warga'
          const metaPayload = {
            lastMessage: lastMsg.message || `Halo ${pelaporName}, terima kasih telah berbagi informasi ini.`,
            lastTime: lastMsg.created_at,
            unreadCount: unread,
            isWaitingAdmin: isWargaLast,
            messageCount: sorted.length,
          }
          newMeta[rep.id] = metaPayload
          if (rep.nomor_tiket) {
            newMeta[rep.nomor_tiket] = metaPayload
            newMeta[rep.nomor_tiket.toLowerCase()] = metaPayload
            newMeta[rep.nomor_tiket.toUpperCase()] = metaPayload
          }
        } else {
          const pelaporName = (rep as any).pelaporName || (rep as any).nama_pelapor || 'Warga'
          const defaultMeta = {
            lastMessage: `Halo ${pelaporName}, terima kasih telah berbagi informasi ini.`,
            lastTime: rep.created_at,
            unreadCount: 0,
            isWaitingAdmin: false,
            messageCount: 0,
          }
          newMeta[rep.id] = defaultMeta
          if (rep.nomor_tiket) {
            newMeta[rep.nomor_tiket] = defaultMeta
            newMeta[rep.nomor_tiket.toLowerCase()] = defaultMeta
            newMeta[rep.nomor_tiket.toUpperCase()] = defaultMeta
          }
        }
      })

      if (typeof window !== 'undefined') {
        const chatsStr = JSON.stringify(Array.from(readSet))
        if (localStorage.getItem('halo_jurnal_read_chats') !== chatsStr) {
          localStorage.setItem('halo_jurnal_read_chats', chatsStr)
        }
        const timesStr = JSON.stringify(readTicketTimes)
        if (localStorage.getItem('halo_jurnal_read_ticket_times') !== timesStr) {
          localStorage.setItem('halo_jurnal_read_ticket_times', timesStr)
        }
      }

      setTicketMeta((prev) => {
        const prevKeys = Object.keys(prev)
        const newKeys = Object.keys(newMeta)
        if (
          prevKeys.length === newKeys.length &&
          newKeys.every((k) => {
            const p = prev[k]
            const n = newMeta[k]
            return (
              p &&
              n &&
              p.unreadCount === n.unreadCount &&
              p.lastMessage === n.lastMessage &&
              p.lastTime === n.lastTime &&
              p.messageCount === n.messageCount &&
              p.isWaitingAdmin === n.isWaitingAdmin
            )
          })
        ) {
          return prev
        }
        return newMeta
      })
    } catch (err) {
      console.error('Error scanning floating ticket chats:', err)
    }
  }

  // Muat pesan aktif untuk tiket terpilih
  const loadActiveMessages = async () => {
    if (!selectedTicketId) return
    const activeReport = reports.find(
      (r) => r.id === selectedTicketId || r.nomor_tiket === selectedTicketId
    )
    const targetId = activeReport?.id || selectedTicketId
    const targetTicket = activeReport?.nomor_tiket

    let dbMessages: any[] = []
    try {
      const res = await fetch(`/api/chat?ticketNumber=${encodeURIComponent(targetTicket || targetId)}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          dbMessages = json.data
        }
      }
    } catch {}

    let merged: any[] = []
    if (typeof window !== 'undefined') {
      let local: any[] = []
      try {
        const sources = [
          localStorage.getItem(`halo_jurnal_chat_${targetId}`),
          targetTicket ? localStorage.getItem(`halo_jurnal_chat_${targetTicket}`) : null,
          targetTicket ? localStorage.getItem(`halo_jurnal_chat_${targetTicket.toLowerCase()}`) : null,
          targetTicket ? localStorage.getItem(`halo_jurnal_chat_${targetTicket.toUpperCase()}`) : null,
        ].filter(Boolean)

        sources.forEach((src) => {
          try {
            const parsed = JSON.parse(src!)
            if (Array.isArray(parsed)) local.push(...parsed)
          } catch {}
        })
      } catch {}

      const msgMap = new Map<string, any>()
      local.forEach((m: any) => {
        const key = m.id || `${m.created_at}_${m.message}`
        msgMap.set(key, m)
      })

      dbMessages.forEach((dbM: any) => {
        let matchedOldKey: string | null = null
        for (const [k, loc] of msgMap.entries()) {
          if (loc.id === dbM.id) {
            matchedOldKey = k
            break
          }
          const sameText = (loc.message || '').trim() === (dbM.message || '').trim()
          const sameSender =
            loc.sender_id === dbM.sender_id ||
            loc.senderId === dbM.sender_id ||
            loc.sender_name === dbM.sender_name
          const timeDiff = Math.abs(
            new Date(loc.created_at).getTime() - new Date(dbM.created_at).getTime()
          )
          if (sameText && sameSender && timeDiff < 15000) {
            matchedOldKey = k
            break
          }
        }

        if (matchedOldKey) {
          const matchedLocal = msgMap.get(matchedOldKey)
          if (matchedLocal?.file_url && !dbM.file_url) {
            dbM.file_url = matchedLocal.file_url
            dbM.file_type = matchedLocal.file_type
          }
          msgMap.delete(matchedOldKey)
        }

        const authoritativeKey = dbM.id || `${dbM.created_at}_${dbM.message}`
        msgMap.set(authoritativeKey, dbM)
      })

      merged = Array.from(msgMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      const serialized = JSON.stringify(merged)
      if (localStorage.getItem(`halo_jurnal_chat_${targetId}`) !== serialized) {
        localStorage.setItem(`halo_jurnal_chat_${targetId}`, serialized)
        if (targetTicket) {
          localStorage.setItem(`halo_jurnal_chat_${targetTicket}`, serialized)
        }
      }
    } else {
      merged = dbMessages
    }

    // Selalu sertakan pesan pembuka resmi redaksi di paling awal agar tidak hilang
    const ticketNum = activeReport?.nomor_tiket || activeReport?.id || selectedTicketId
    const pelapor = (activeReport as any)?.pelaporName || (activeReport as any)?.nama_pelapor || 'Warga'
    const fallbackCreatedAt = activeReport?.created_at || '2026-01-01T00:00:00.000Z'
    const initialWelcomeMessage = {
      id: `sys-${ticketNum}`,
      isSystem: true,
      role: 'admin',
      sender_id: 'admin-redaksi',
      sender_name: '🛡️ Redaksi Hallo Jurnal',
      message: `Halo ${pelapor}, terima kasih telah berbagi informasi ini. Ruang obrolan ini dapat Anda gunakan untuk koordinasi langsung atau menambahkan keterangan tambahan jika diperlukan.`,
      created_at: fallbackCreatedAt,
      profiles: {
        full_name: '🛡️ Redaksi Hallo Jurnal',
        role: 'admin',
      },
    }

    const hasWelcome = merged.some(
      (m: any) => m.isSystem || (m.role === 'admin' && String(m.id || '').startsWith('sys-'))
    )
    const finalMerged = activeReport && !hasWelcome ? [initialWelcomeMessage, ...merged] : merged

    setMessages((prev) => {
      if (
        prev.length === finalMerged.length &&
        prev.every(
          (m, idx) =>
            m.id === finalMerged[idx]?.id &&
            m.message === finalMerged[idx]?.message &&
            m.created_at === finalMerged[idx]?.created_at
        )
      ) {
        return prev
      }
      return finalMerged
    })

    // Tandai pesan tiket ini sudah dibaca dan simpan timestamp read
    if (typeof window !== 'undefined') {
      try {
        const latestMsgTime = finalMerged.reduce((max: number, m: any) => {
          const t = new Date(m.created_at).getTime()
          return isNaN(t) ? max : Math.max(max, t)
        }, 0)
        const readBarrier = latestMsgTime ? Math.max(Date.now(), latestMsgTime) : Date.now()

        const times: Record<string, number> = JSON.parse(
          localStorage.getItem('halo_jurnal_read_ticket_times') || '{}'
        )
        times[targetId] = readBarrier
        if (targetTicket) {
          times[targetTicket] = readBarrier
          times[targetTicket.toLowerCase()] = readBarrier
          times[targetTicket.toUpperCase()] = readBarrier
        }
        localStorage.setItem('halo_jurnal_read_ticket_times', JSON.stringify(times))

        const readChats: string[] = JSON.parse(
          localStorage.getItem('halo_jurnal_read_chats') || '[]'
        )
        const readSet = new Set(readChats)
        finalMerged.forEach((m: any) => {
          if (m.id) readSet.add(String(m.id))
        })
        localStorage.setItem(
          'halo_jurnal_read_chats',
          JSON.stringify(Array.from(readSet))
        )

        // Langsung nolkan unreadCount tiket terpilih jika belum 0
        setTicketMeta((prev) => {
          if (
            (prev[targetId]?.unreadCount === 0 || !prev[targetId]) &&
            (!targetTicket || prev[targetTicket]?.unreadCount === 0)
          ) {
            return prev
          }
          const updated = { ...prev }
          if (updated[targetId]) updated[targetId] = { ...updated[targetId], unreadCount: 0 }
          if (targetTicket) {
            if (updated[targetTicket]) updated[targetTicket] = { ...updated[targetTicket], unreadCount: 0 }
            if (updated[targetTicket.toLowerCase()]) updated[targetTicket.toLowerCase()] = { ...updated[targetTicket.toLowerCase()], unreadCount: 0 }
            if (updated[targetTicket.toUpperCase()]) updated[targetTicket.toUpperCase()] = { ...updated[targetTicket.toUpperCase()], unreadCount: 0 }
          }
          return updated
        })
      } catch {}
    }
  }

  // Fungsi Tandai Semua Sudah Dibaca (Mark All As Read)
  const handleMarkAllAsRead = () => {
    try {
      const now = Date.now()
      const times: Record<string, number> = {}
      reports.forEach((rep) => {
        times[rep.id] = now
        if (rep.nomor_tiket) {
          times[rep.nomor_tiket] = now
          times[rep.nomor_tiket.toLowerCase()] = now
          times[rep.nomor_tiket.toUpperCase()] = now
        }
      })

      const readChats: string[] = JSON.parse(
        localStorage.getItem('halo_jurnal_read_chats') || '[]'
      )
      const readSet = new Set(readChats)
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('halo_jurnal_chat_')) {
          const ticketKey = k.replace('halo_jurnal_chat_', '')
          times[ticketKey] = now
          times[ticketKey.toLowerCase()] = now
          times[ticketKey.toUpperCase()] = now
          try {
            const list = JSON.parse(localStorage.getItem(k) || '[]')
            if (Array.isArray(list)) {
              list.forEach((m: any) => {
                if (m.id) readSet.add(String(m.id))
              })
            }
          } catch {}
        }
      }
      localStorage.setItem('halo_jurnal_read_ticket_times', JSON.stringify(times))
      localStorage.setItem('halo_jurnal_read_chats', JSON.stringify(Array.from(readSet)))

      setTicketMeta((prev) => {
        const updated: Record<string, any> = {}
        Object.keys(prev).forEach((k) => {
          updated[k] = { ...prev[k], unreadCount: 0 }
        })
        return updated
      })

      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new CustomEvent('openFloatingAdminChat'))
    } catch (err) {
      console.error('Error mark all as read:', err)
    }
  }

  // Sinkronisasi realtime saat data reports berubah
  useEffect(() => {
    scanAllTicketChats()
  }, [reports])

  // Sinkronisasi realtime global (selalu aktif di background agar notifikasi berbunyi meski popup ditutup)
  useEffect(() => {
    scanAllTicketChats()
    if (isOpen) {
      loadActiveMessages()
    }

    const handleSync = () => {
      scanAllTicketChats()
      if (isOpen) {
        loadActiveMessages()
      }
    }
    window.addEventListener('storage', handleSync)
    window.addEventListener('focus', handleSync)

    let broadcastChannel: BroadcastChannel | null = null
    try {
      broadcastChannel = new BroadcastChannel('jurnalwave_chat')
      broadcastChannel.onmessage = (event) => {
        if (event?.data?.type === 'chat_sent') {
          scanAllTicketChats()
          if (isOpen) {
            loadActiveMessages()
          }
        }
      }
    } catch {}

    const pollInterval = setInterval(() => {
      scanAllTicketChats()
      if (isOpen) {
        loadActiveMessages()
      }
    }, 1500)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('focus', handleSync)
      if (broadcastChannel) {
        try {
          broadcastChannel.close()
        } catch {}
      }
    }
  }, [isOpen, selectedTicketId])

  // Deteksi posisi scroll: apakah admin sedang membaca riwayat di atas atau sedang di posisi paling bawah
  const handleChatScroll = () => {
    if (!chatScrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100
  }

  // Scroll cerdas: hanya scroll ke dasar saat ganti tiket, kirim pesan, atau ada pesan baru dan admin memang sedang di dasar
  useEffect(() => {
    if (!isOpen || !chatScrollRef.current) return

    const isTicketChanged = prevTicketIdRef.current !== selectedTicketId
    const hasNewMessage = messages.length > prevMessagesLengthRef.current

    if (isTicketChanged) {
      prevTicketIdRef.current = selectedTicketId
      prevMessagesLengthRef.current = messages.length
      isNearBottomRef.current = true
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
      return
    }

    if (hasNewMessage) {
      prevMessagesLengthRef.current = messages.length
      // Hanya scroll jika admin memang sedang berada di dasar kontainer
      if (isNearBottomRef.current) {
        chatScrollRef.current.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
    }
  }, [messages, isOpen, selectedTicketId])

  // Kirim balasan redaksi
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !selectedTicketId || isSending) return

    setIsSending(true)
    const activeReport = reports.find(
      (r) => r.id === selectedTicketId || r.nomor_tiket === selectedTicketId
    )
    const targetId = activeReport?.id || selectedTicketId
    const targetTicket = activeReport?.nomor_tiket
    const text = inputText.trim()

    setInputText('')

    // Kirim langsung ke API database
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber: targetTicket || targetId,
          senderId: 'admin-redaksi',
          senderName: '🛡️ Redaksi Hallo Jurnal',
          role: 'admin',
          message: text,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const newMsg = {
            id: json.data.id,
            ticketNumber: json.data.ticketNumber,
            sender_id: json.data.sender_id,
            sender_name: json.data.sender_name || '🛡️ Redaksi Hallo Jurnal',
            role: json.data.role || 'redaksi',
            message: json.data.message,
            created_at: json.data.created_at,
            profiles: {
              full_name: json.data.sender_name || '🛡️ Redaksi Hallo Jurnal',
              role: 'admin',
            },
          }
          const next = [...messages, newMsg]
          setMessages(next)
          if (typeof window !== 'undefined') {
            localStorage.setItem(`halo_jurnal_chat_${targetId}`, JSON.stringify(next))
            if (targetTicket) {
              localStorage.setItem(`halo_jurnal_chat_${targetTicket}`, JSON.stringify(next))
            }
            try {
              const bc = new BroadcastChannel('jurnalwave_chat')
              bc.postMessage({ type: 'chat_sent', ticketNumber: targetTicket || targetId })
              bc.close()
            } catch {}
            window.dispatchEvent(new Event('storage'))
          }
          setIsSending(false)
          isNearBottomRef.current = true
          setTimeout(() => {
            if (chatScrollRef.current) {
              chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
            }
          }, 30)
          return
        }
      }
    } catch (err) {
      console.warn('Notice chat API sync error:', err)
    }

    // Fallback lokal jika offline
    const sentMsg = {
      id: `chat-admin-${Date.now()}`,
      laporan_id: targetId,
      sender_id: 'admin-redaksi',
      sender_name: '🛡️ Redaksi Hallo Jurnal',
      role: 'redaksi',
      message: text,
      created_at: new Date().toISOString(),
      profiles: {
        full_name: '🛡️ Redaksi Hallo Jurnal',
        role: 'admin',
      },
    }

    const next = [...messages, sentMsg]
    setMessages(next)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`halo_jurnal_chat_${targetId}`, JSON.stringify(next))
        if (targetTicket) {
          localStorage.setItem(`halo_jurnal_chat_${targetTicket}`, JSON.stringify(next))
        }
        try {
          const bc = new BroadcastChannel('jurnalwave_chat')
          bc.postMessage({ type: 'chat_sent', ticketNumber: targetTicket || targetId })
          bc.close()
        } catch {}
        window.dispatchEvent(new Event('storage'))
      } catch (err) {
        console.error('Error saving chat locally:', err)
      }
    }

    setIsSending(false)
    isNearBottomRef.current = true
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
      }
    }, 30)
  }

  // Filter daftar tiket warga di panel kiri
  const filteredReports = reports.filter((rep) => {
    const meta = ticketMeta[rep.nomor_tiket] || ticketMeta[rep.id]
    const matchesSearch =
      rep.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.nomor_tiket.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.lokasi && rep.lokasi.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false
    if (filterType === 'belum_dibalas') {
      return meta?.isWaitingAdmin || (meta?.unreadCount || 0) > 0
    }
    if (filterType === 'sudah_respon') {
      return !meta?.isWaitingAdmin && (meta?.messageCount || 0) > 0
    }
    return true
  })

  // Tiket yang sedang dibuka
  const currentReport = reports.find(
    (r) => r.id === selectedTicketId || r.nomor_tiket === selectedTicketId
  )

  const unreadTotal = useMemo(() => {
    const countedTickets = new Set<string>()
    let sum = 0
    reports.forEach((rep) => {
      const ticketKey = (rep.nomor_tiket || rep.id).toLowerCase()
      if (countedTickets.has(ticketKey)) return
      countedTickets.add(ticketKey)

      const meta =
        ticketMeta[rep.id] ||
        (rep.nomor_tiket ? ticketMeta[rep.nomor_tiket] : null) ||
        (rep.nomor_tiket ? ticketMeta[rep.nomor_tiket.toUpperCase()] : null) ||
        (rep.nomor_tiket ? ticketMeta[rep.nomor_tiket.toLowerCase()] : null)

      if (meta?.unreadCount && meta.unreadCount > 0) {
        sum += meta.unreadCount
      }
    })
    return sum
  }, [reports, ticketMeta])

  return (
    <>
      {/* 1. Floating Action Bubble (Pojok Kanan Bawah) */}
      <div className="fixed bottom-5 right-5 z-40 select-none">
        <button
          type="button"
          onClick={() => {
            const next = !isOpen
            setIsOpen(next)
            if (next) {
              scanAllTicketChats()
              loadActiveMessages()
            }
          }}
          className="relative flex items-center gap-2 px-4 py-3 bg-[#c00015] hover:bg-[#a00012] text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer group"
          title="Buka Pusat Chat Warga Hallo Jurnal"
        >
          <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="text-xs font-bold tracking-wide">
            Chat Warga
          </span>

          {unreadTotal > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5.5 min-w-5.5 px-1.5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-extrabold ring-2 ring-white shadow-md">
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>
      </div>

      {/* 2. Floating Popup Chat Window (Full Layar di Mobile, Floating / True Full Layar di Desktop) */}
      {isOpen && (
        <>
          {/* Backdrop gelap saat mode floating di desktop jika diperlukan */}
          {isMaximized && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 animate-in fade-in duration-200"
              onClick={() => setIsMaximized(false)}
            />
          )}

          <div
            className={`fixed z-50 bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
              isMaximized
                ? 'inset-0 w-full h-full rounded-none border-0'
                : 'inset-0 w-full h-full rounded-none border-0 sm:inset-auto sm:bottom-20 sm:right-6 sm:w-[680px] md:w-[780px] lg:w-[860px] sm:h-[620px] sm:max-h-[86vh] sm:rounded-2xl sm:border sm:border-slate-200 animate-in fade-in slide-in-from-bottom-4'
            }`}
          >
            {/* Header Utama Popup Bar */}
            <div className="px-4 py-2.5 bg-white text-slate-800 border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
              <h3 className="text-xs sm:text-sm font-bold font-heading text-slate-900 leading-tight truncate">
                Pusat Chat Warga
              </h3>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    scanAllTicketChats()
                    loadActiveMessages()
                    refreshReports()
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  title="Segarkan Chat"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMaximized((prev) => !prev)}
                  className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  title={isMaximized ? 'Perkecil Tampilan' : 'Perluas ke Layar Penuh'}
                >
                  {isMaximized ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setIsMaximized(false)
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  title="Tutup Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Area Kerja 2-Panel (Inbox Tiket di Kiri, Workspace Chat di Kanan) */}
            <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
              {/* ================= PANEL KIRI: INBOX TIKET WARGA ================= */}
              <div
                className={`w-full ${
                  isMaximized ? 'sm:w-80 md:w-96 lg:w-[400px]' : 'sm:w-72 md:w-80'
                } border-r border-slate-200 flex flex-col bg-slate-50/60 shrink-0 h-full overflow-hidden transition-all duration-200 ${
                  mobilePane === 'chat' ? 'hidden sm:flex' : 'flex'
                }`}
              >
              {/* Search Bar & Filter Tabs */}
              <div className="p-2.5 border-b border-slate-200 bg-white space-y-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nomor tiket / aduan..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015] transition"
                  />
                </div>

                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <div className="flex items-center gap-1">
                    {[
                      { key: 'semua', label: 'Semua' },
                      { key: 'belum_dibalas', label: 'Perlu Balasan' },
                      { key: 'sudah_respon', label: 'Direspons' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setFilterType(tab.key as any)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                          filterType === tab.key
                            ? 'bg-[#c00015] text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {unreadTotal > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] text-slate-500 hover:text-[#c00015] font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
                      title="Tandai semua pesan warga sudah dibaca"
                    >
                      Baca Semua
                    </button>
                  )}
                </div>
              </div>

              {/* List Tiket Percakapan */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 [scrollbar-width:thin]">
                {isLoadingReports && filteredReports.length === 0 ? (
                  <div className="p-3 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white border border-slate-100 space-y-1.5 animate-pulse">
                        <div className="h-3 bg-slate-200 rounded w-20" />
                        <div className="h-3 bg-slate-200 rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                    <MessageSquare className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-600">Tidak ada tiket</p>
                    <p className="text-[10px]">Coba ubah kata kunci atau filter.</p>
                  </div>
                ) : (
                  filteredReports.map((rep) => {
                    const isSelected =
                      selectedTicketId === rep.nomor_tiket || selectedTicketId === rep.id
                    const meta = ticketMeta[rep.nomor_tiket] || ticketMeta[rep.id]
                    const hasUnread = (meta?.unreadCount || 0) > 0
                    const isWaiting = meta?.isWaitingAdmin

                    return (
                      <div
                        key={rep.id}
                        onClick={() => {
                          const targetKey = rep.nomor_tiket || rep.id
                          setSelectedTicketId(targetKey)
                          setMobilePane('chat')
                          const now = Date.now() + 86400000
                          try {
                            const times: Record<string, number> = JSON.parse(
                              localStorage.getItem('halo_jurnal_read_ticket_times') || '{}'
                            )
                            times[rep.id] = now
                            if (rep.nomor_tiket) {
                              times[rep.nomor_tiket] = now
                              times[rep.nomor_tiket.toLowerCase()] = now
                              times[rep.nomor_tiket.toUpperCase()] = now
                            }
                            localStorage.setItem('halo_jurnal_read_ticket_times', JSON.stringify(times))
                          } catch {}

                          setTicketMeta((prev) => ({
                            ...prev,
                            [rep.id]: { ...(prev[rep.id] || {}), unreadCount: 0 },
                            ...(rep.nomor_tiket
                              ? {
                                  [rep.nomor_tiket]: { ...(prev[rep.nomor_tiket] || {}), unreadCount: 0 },
                                  [rep.nomor_tiket.toLowerCase()]: { ...(prev[rep.nomor_tiket.toLowerCase()] || {}), unreadCount: 0 },
                                  [rep.nomor_tiket.toUpperCase()]: { ...(prev[rep.nomor_tiket.toUpperCase()] || {}), unreadCount: 0 },
                                }
                              : {}),
                          }))
                        }}
                        className={`p-2.5 transition cursor-pointer text-left relative ${
                          isSelected
                            ? 'bg-red-50/70 border-l-2 border-l-[#c00015]'
                            : 'hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-xs font-bold text-slate-900 shrink-0">
                              {rep.nomor_tiket}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {hasUnread && (
                              <span className="px-1.5 py-0.5 rounded-full font-bold bg-[#c00015] text-white text-[9px]">
                                {meta.unreadCount} baru
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {meta?.lastTime
                                ? new Date(meta.lastTime).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </div>
                        </div>

                        <h4 className="text-xs font-heading font-semibold text-slate-900 line-clamp-1">
                          {rep.judul}
                        </h4>

                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {meta?.lastMessage || 'Belum ada percakapan'}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* ================= PANEL KANAN: WORKSPACE CHAT AKTIF ================= */}
            <div
              className={`flex-1 flex flex-col bg-white h-full overflow-hidden min-w-0 ${
                mobilePane === 'inbox' ? 'hidden sm:flex' : 'flex'
              }`}
            >
              {currentReport ? (
                <>
                  {/* Header Obrolan Tiket Terpilih */}
                  <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Tombol Kembali ke Inbox (Khusus Layar Kecil) */}
                      <button
                        type="button"
                        onClick={() => setMobilePane('inbox')}
                        className="sm:hidden p-1 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0"
                        title="Kembali ke Daftar Tiket"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-heading font-bold text-slate-900 truncate">
                          {currentReport.judul}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate mt-0.5">
                          <span className="font-mono font-semibold text-slate-700">
                            {currentReport.nomor_tiket}
                          </span>
                          <span>•</span>
                          <span>
                            {(currentReport as any).pelaporName ||
                              (currentReport as any).nama_pelapor ||
                              'Warga Sukabumi'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/jurnal-central/laporan/${currentReport.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold transition shadow-2xs shrink-0 cursor-pointer"
                    >
                      <span>Detail</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                  </div>

                  {/* Area Balon Percakapan */}
                  <div
                    ref={chatScrollRef}
                    onScroll={handleChatScroll}
                    className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#fbf9f9] [scrollbar-width:thin] overscroll-contain"
                  >
                    {messages.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                        <p className="font-semibold text-slate-600">Belum ada percakapan langsung</p>
                        <p className="text-[10px] text-slate-400">
                          Ketik pesan di bawah untuk memulai koordinasi dengan pelapor.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isSystemGreeting =
                          msg.isSystem || String(msg.id || '').startsWith('sys-')

                        const timeStr = new Date(msg.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })

                        if (isSystemGreeting) {
                          return (
                            <div key={msg.id} className="flex flex-col items-center my-2">
                              <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl px-4 py-2.5 max-w-[92%] sm:max-w-[85%] shadow-2xs">
                                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-900 mb-1">
                                  <span>🛡️ Pesan Pembuka Otomatis Redaksi</span>
                                </div>
                                <p className="text-xs text-amber-950/90 whitespace-pre-line leading-relaxed">
                                  {msg.message}
                                </p>
                                <div className="text-[9px] text-amber-800/70 mt-1 select-none text-right">
                                  {timeStr}
                                </div>
                              </div>
                            </div>
                          )
                        }

                        const isAdmin =
                          msg.role === 'admin' ||
                          msg.role === 'redaksi' ||
                          msg.sender_id === 'admin-redaksi' ||
                          msg.sender_id === 'dev-admin' ||
                          msg.sender_id === 'admin' ||
                          msg.profiles?.role === 'admin' ||
                          msg.profiles?.role === 'redaksi' ||
                          msg.sender_name === 'Admin Redaksi' ||
                          (msg.sender_name && msg.sender_name.toLowerCase().includes('redaksi'))

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                          >
                            {!isAdmin && (
                              <div className="mb-1 text-[10px] text-slate-600 font-bold">
                                {msg.sender_name || msg.profiles?.full_name || 'Pelapor'}
                              </div>
                            )}

                            <div
                              className={`rounded-2xl px-3.5 py-2 max-w-[85%] text-xs leading-relaxed ${
                                isAdmin
                                  ? 'bg-[#c00015] text-white rounded-tr-none shadow-2xs'
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-2xs'
                              }`}
                            >
                              <p className="whitespace-pre-line">{msg.message}</p>
                              {msg.file_url && (
                                <button
                                  type="button"
                                  onClick={() => setActivePhoto(msg.file_url)}
                                  className="mt-1.5 block rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition text-left cursor-pointer"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={msg.file_url}
                                    alt="Lampiran bukti"
                                    className="max-h-36 w-auto object-cover rounded"
                                  />
                                </button>
                              )}
                              <div
                                className={`text-[10px] text-right mt-1 font-medium select-none ${
                                  isAdmin ? 'text-white/80' : 'text-slate-400'
                                }`}
                              >
                                {timeStr}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Pinned Bottom: Form Input */}
                  <div className="p-2.5 sm:px-3 border-t border-slate-200 bg-white shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ketik balasan untuk pelapor..."
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015] transition"
                      />
                      <button
                        type="submit"
                        disabled={isSending || !inputText.trim()}
                        className="px-3.5 py-2 rounded-lg bg-[#c00015] hover:bg-[#a00012] disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:shadow-none text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                      >
                        {isSending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Kirim</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-slate-400">
                  Pilih salah satu tiket di sebelah kiri untuk membuka ruang obrolan warga.
                </div>
              )}
            </div>
          </div>

          {/* Modal Lightbox Foto Resolusi Penuh */}
          {activePhoto && (
            <div
              onClick={() => setActivePhoto(null)}
              className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-2xl max-h-[85vh] flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePhoto}
                  alt="Foto Bukti Diperbesar"
                  className="max-h-[80vh] max-w-full w-auto rounded-xl object-contain shadow-2xl"
                />
                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/90 hover:bg-black text-white rounded-full shadow-lg transition cursor-pointer"
                  title="Tutup foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          </div>
        </>
      )}
    </>
  )
}
