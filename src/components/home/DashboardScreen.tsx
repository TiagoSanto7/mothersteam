// src/components/home/DashboardScreen.tsx
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'
import { getMensagemParaFase } from '../../data/mensagemDeDeus'
import { getContextualPhrase } from '../../lib/helpers'
import type { ApiRoutineEntry, ApiBabyEntry } from '../../lib/types'
import type { PregnancyPhase } from '../../types'
import { QuickRegisterSheet } from './QuickRegisterSheet'
import { BabyDevCard } from './BabyDevCard'
import { BabyDevScreen } from './BabyDevScreen'
import { MomentoDeusCard } from './MomentoDeusCard'
import { MomentoDeusScreen } from './MomentoDeusScreen'

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function formatPhase(phase: PregnancyPhase): string {
  if (phase.stage === 'pregnant') return `Grávida · semana ${phase.week}`
  const months = Math.floor(phase.ageInDays / 30)
  const days = phase.ageInDays % 30
  if (months === 0) return `Bebê · ${days} dias`
  if (days === 0) return `Bebê · ${months} ${months === 1 ? 'mês' : 'meses'}`
  return `Bebê · ${months} ${months === 1 ? 'mês' : 'meses'} e ${days} dias`
}

export function relativeTimeFeed(iso: string): string {
  const totalMins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (totalMins < 1) return 'agora'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `há ${m}min`
  if (m === 0) return `há ${h}h`
  return `há ${h}h${m}`
}

export function DashboardScreen() {
  const motherName = useAppStore((s) => s.motherName)
  const phase = useAppStore((s) => s.phase)
  const isLoggedIn = useAppStore((s) => s.isLoggedIn)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [babyDevOpen, setBabyDevOpen] = useState(false)
  const [momentoDeusOpen, setMomentoDeusOpen] = useState(false)

  const selectedDate = useAppStore((s) => s.selectedDate)

  const { data: routineItems } = useQuery({
    queryKey: ['routine', selectedDate],
    queryFn: () => apiFetch<ApiRoutineEntry[]>(`/routine?date=${selectedDate}`),
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  const { data: babyEntries } = useQuery({
    queryKey: ['baby'],
    queryFn: () => apiFetch<ApiBabyEntry[]>('/baby?limit=5'),
    enabled: isLoggedIn,
    staleTime: 30_000,
  })

  const saraMensagem = useMemo(() => {
    const semanaOuDias = phase.stage === 'pregnant' ? phase.week : phase.ageInDays
    return getMensagemParaFase(phase.stage, semanaOuDias)
  }, [phase])

  const initial = (motherName || 'M').charAt(0).toUpperCase()

  const todayStr = selectedDate

  const timelineRows = useMemo(() => {
    const routineRows = (routineItems ?? []).map((r) => ({
      time: r.time,
      label: r.title,
      done: r.done,
      type: 'rotina' as const,
    }))

    const lastFeedToday = babyEntries?.find(
      (e) => e.type === 'feed' && e.createdAt.startsWith(todayStr)
    ) ?? null

    const feedRow = lastFeedToday
      ? {
          time: (() => {
            const d = new Date(lastFeedToday.createdAt)
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          })(),
          label: 'Mamada',
          done: true,
          type: 'feed' as const,
        }
      : null

    return [...routineRows, ...(feedRow ? [feedRow] : [])].sort((a, b) =>
      a.time.localeCompare(b.time)
    )
  }, [routineItems, babyEntries, todayStr])

  return (
    <>
      <div className="flex flex-col gap-3 pb-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-5">
          <div>
            <p className="text-[12px] text-graphite-muted font-medium">
              {getGreeting()},
            </p>
            <p className="text-[22px] font-bold font-serif text-graphite leading-tight">
              {motherName || 'Mãe'} 🌷
            </p>
            <p className="text-[12px] text-graphite-muted mt-0.5">
              {getContextualPhrase(phase)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initial}
          </div>
        </div>

        {/* Sara card — hero */}
        <div className="mx-4 rounded-2xl p-5 bg-gradient-to-br from-sara-gold to-sara-terracotta shadow-md flex flex-col">
          <p className="text-[9px] font-bold text-white/75 uppercase tracking-wide mb-2">
            ✦ Sara diz
          </p>
          <p className="text-[14px] font-medium text-white leading-relaxed flex-1">
            "{saraMensagem.mensagem}"
          </p>
          <button
            onClick={() => setActiveTab('maeIA')}
            aria-label="Conversar com a Sara"
            className="mt-3 self-start bg-white/20 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl"
          >
            Conversar com a Sara →
          </button>
        </div>

        {/* Bloco Hoje */}
        <div className="mx-4 bg-white rounded-2xl p-3.5 shadow-sm">
          <p className="text-[9px] font-bold text-graphite-muted uppercase tracking-wide mb-2">
            Hoje
          </p>

          {timelineRows.length === 0 ? (
            <p className="text-[12px] text-graphite-muted">Dia livre hoje 🌸</p>
          ) : (
            <div className="flex flex-col gap-2">
              {timelineRows.map((row) => (
                <div key={`${row.type}-${row.time}`} className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      row.done ? 'bg-graphite-muted/40' : 'bg-sara-gold'
                    }`}
                  />
                  <span className="text-[11px] text-graphite-muted w-9 flex-shrink-0">
                    {row.time}
                  </span>
                  <span
                    className={`text-[12px] font-medium ${
                      row.done && row.type === 'rotina' ? 'line-through text-graphite-muted' : 'text-graphite'
                    }`}
                  >
                    {row.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Registrar mamada"
            className="mt-2.5 inline-block bg-sara-gold text-white rounded-xl text-[10px] font-semibold px-2.5 py-1"
          >
            + Registrar mamada
          </button>
        </div>

        <BabyDevCard onClick={() => setBabyDevOpen(true)} />
        <MomentoDeusCard onClick={() => setMomentoDeusOpen(true)} />
      </div>

      <QuickRegisterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <BabyDevScreen open={babyDevOpen} onClose={() => setBabyDevOpen(false)} />
      <MomentoDeusScreen open={momentoDeusOpen} onClose={() => setMomentoDeusOpen(false)} />
    </>
  )
}
