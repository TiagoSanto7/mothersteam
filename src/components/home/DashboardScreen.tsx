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

  const nextAppointment = useMemo(() => {
    if (!routineItems) return null
    const now = new Date()
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return routineItems.find((r) => !r.done && r.time >= nowTime) ?? null
  }, [routineItems])
  const lastFeed = babyEntries?.find((e) => e.type === 'feed') ?? null
  const initial = (motherName || 'M').charAt(0).toUpperCase()

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

        {/* Row: next appointment + last feed */}
        <div className="flex gap-2 px-4">
          <div className="flex-1 bg-white rounded-2xl p-3.5 shadow-sm">
            <p className="text-[9px] font-bold text-graphite-muted uppercase tracking-wide mb-1">
              Próximo
            </p>
            {nextAppointment ? (
              <>
                <p className="text-[13px] font-semibold text-graphite leading-tight">
                  {nextAppointment.title}
                </p>
                <p className="text-[11px] text-graphite-muted mt-0.5">
                  Hoje · {nextAppointment.time}
                </p>
              </>
            ) : (
              <p className="text-[12px] text-graphite-muted">Nenhum compromisso hoje</p>
            )}
          </div>

          <div className="flex-1 bg-white rounded-2xl p-3.5 shadow-sm">
            <p className="text-[9px] font-bold text-graphite-muted uppercase tracking-wide mb-1">
              Última mamada
            </p>
            {lastFeed ? (
              <p className="text-[13px] font-semibold text-graphite">
                {relativeTimeFeed(lastFeed.createdAt)}
              </p>
            ) : (
              <p className="text-[12px] text-graphite-muted">Nenhum registro ainda</p>
            )}
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Registrar mamada"
              className="mt-1.5 inline-block bg-sara-gold text-white rounded-xl text-[10px] font-semibold px-2.5 py-1"
            >
              Registrar
            </button>
          </div>
        </div>

        {/* Community card */}
        <div className="mx-4 bg-white rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-graphite-muted uppercase tracking-wide mb-0.5">
                Comunidade
              </p>
              <p className="text-[13px] font-semibold text-graphite">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-sara-terracotta mr-1.5 align-middle" />
                Ir para o feed
              </p>
            </div>
            <button
              onClick={() => setActiveTab('comunidade')}
              aria-label="Ir para a comunidade"
              className="text-[10px] font-semibold text-sara-gold"
            >
              Ver →
            </button>
          </div>
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
