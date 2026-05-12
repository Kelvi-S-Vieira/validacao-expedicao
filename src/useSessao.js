import { useState, useEffect } from 'react'
import {
  doc, collection, setDoc, getDoc, onSnapshot,
  updateDoc, deleteDoc, serverTimestamp, getDocs
} from 'firebase/firestore'
import { db } from './firebase'

const COL_SESSOES = 'sessoes'
const COL_DOCAS   = 'docas'
const COL_LOCKS   = 'upload_locks'
const MAX_SESSOES = 5
const LOCK_TTL_MS = 30_000 // 30 segundos

export function useSessao(usuario) {
  const [sessoes, setSessoes]       = useState([])
  const [sessaoId, setSessaoId]     = useState(null)
  const [sessao, setSessao]         = useState(null)
  const [docas, setDocas]           = useState([])
  const [carregando, setCarregando] = useState(true)

  // Escuta sessões disponíveis (últimas 5)
  useEffect(() => {
    if (!usuario) return
    const ref = collection(db, COL_SESSOES)
    const unsub = onSnapshot(ref, snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0))
        .slice(0, MAX_SESSOES)
      setSessoes(lista)
      if (lista.length > 0) setSessaoId(prev => prev || lista[0].id)
      else setSessaoId(null)
      setCarregando(false)
    })
    return () => unsub()
  }, [usuario])

  // Escuta sessão ativa
  useEffect(() => {
    if (!sessaoId) { setSessao(null); return }
    const ref = doc(db, COL_SESSOES, sessaoId)
    const unsub = onSnapshot(ref, snap => {
      setSessao(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    })
    return () => unsub()
  }, [sessaoId])

  // Escuta docas da sessão ativa
  useEffect(() => {
    if (!sessaoId) { setDocas([]); return }
    const ref = collection(db, COL_DOCAS)
    const unsub = onSnapshot(ref, snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => {
          if (d.sessaoId === sessaoId) return true
          if (!d.sessaoId && d.id.startsWith('doca_')) return true
          return false
        })
        .sort((a, b) => (a.doca || '').localeCompare(b.doca || ''))
      setDocas(lista)
    })
    return () => unsub()
  }, [sessaoId])

  // ── PROTEÇÃO 2: Lock de upload simultâneo ─────────────────
  async function adquirirLock() {
    const lockRef = doc(db, COL_LOCKS, 'upload')
    const snap    = await getDoc(lockRef)

    if (snap.exists()) {
      const { lockedBy, lockedAt } = snap.data()
      const ts = lockedAt?.toMillis?.() || 0
      const idade = Date.now() - ts

      // Lock ainda válido e não é do mesmo usuário
      if (idade < LOCK_TTL_MS && lockedBy !== usuario.email) {
        throw new Error(`Upload em andamento por ${lockedBy.split('@')[0]}. Aguarde ${Math.ceil((LOCK_TTL_MS - idade) / 1000)}s.`)
      }
    }

    // Adquire o lock
    await setDoc(lockRef, {
      lockedBy:  usuario.email,
      lockedAt:  serverTimestamp(),
    })
  }

  async function liberarLock() {
    try {
      await deleteDoc(doc(db, COL_LOCKS, 'upload'))
    } catch {}
  }

  // ── Cria nova sessão ──────────────────────────────────────
  async function criarSessao(docasBase) {
    // Proteção 2: bloqueia upload simultâneo
    await adquirirLock()

    try {
      const hoje    = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      const ts      = Date.now()
      const novoId  = `sessao_${hoje.replace(/\//g, '-')}_${ts}`
      const dataArquivo = docasBase.find(d => d.data)?.data || hoje

      // Remove sessão mais antiga se já tem MAX_SESSOES
      if (sessoes.length >= MAX_SESSOES) {
        const maisAntiga = sessoes[sessoes.length - 1]
        const snaps = await getDocs(collection(db, COL_DOCAS))
        const docasAntigas = snaps.docs.filter(d => d.data().sessaoId === maisAntiga.id)
        await Promise.all(docasAntigas.map(d => deleteDoc(d.ref)))
        await deleteDoc(doc(db, COL_SESSOES, maisAntiga.id))
      }

      // Cria a sessão
      await setDoc(doc(db, COL_SESSOES, novoId), {
        data:       dataArquivo,
        criadoPor:  usuario.email,
        criadoEm:   serverTimestamp(),
        totalDocas: docasBase.length,
      })

      // Cria docas com sessaoId correto
      await Promise.all(docasBase.map(d =>
        setDoc(doc(db, COL_DOCAS, `${novoId}_doca_${d.doca}`), {
          ...d,
          sessaoId: novoId,
          status: 'PENDENTE',
          conferente: null, hrInicio: null, hrFim: null,
          hrValidado: null, hrLiberado: null, valDoca: null,
          pendExp: null, pendFrente: null, pendDentro: null,
          resultado: null, logExp: null, logFrente: null,
          logDentro: null, observacao: null, tsAlerta: null,
          aprovadoPor: null, hrAprovacao: null,
          rejeitadoPor: null, hrRejeicao: null, motivoRejeicao: null,
          atualizadoEm: serverTimestamp(),
        })
      ))

      setSessaoId(novoId)
    } finally {
      // Sempre libera o lock
      await liberarLock()
    }
  }

  function selecionarSessao(id) { setSessaoId(id) }

  // ── Resolve ID da doca (novo sistema vs legado) ───────────
  async function getDocRef(doca) {
    const refNovo   = doc(db, COL_DOCAS, `${sessaoId}_doca_${doca}`)
    const snapNovo  = await getDoc(refNovo)
    if (snapNovo.exists()) return refNovo
    return doc(db, COL_DOCAS, `doca_${doca}`)
  }

  async function iniciarDoca(doca, conferente, hrInicio) {
    const ref  = await getDocRef(doca)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Doca não encontrada')
    if (snap.data().status !== 'PENDENTE') throw new Error('Doca já está sendo validada')
    await updateDoc(ref, { status: 'EM_ANDAMENTO', conferente, hrInicio, atualizadoEm: serverTimestamp() })
  }

  async function atualizarDoca(doca, campos) {
    const ref = await getDocRef(doca)
    await updateDoc(ref, { ...campos, atualizadoEm: serverTimestamp() })
  }

  async function finalizarDoca(doca, dados) {
    const ref = await getDocRef(doca)
    await updateDoc(ref, { ...dados, atualizadoEm: serverTimestamp() })
  }

  async function aprovarDoca(doca, comentario) {
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const ref   = await getDocRef(doca)
    await updateDoc(ref, {
      status: 'CONCLUIDO', aprovadoPor: usuario.email,
      hrAprovacao: agora, comentarioAprovacao: comentario || '',
      atualizadoEm: serverTimestamp(),
    })
  }

  async function rejeitarDoca(doca, motivo) {
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const ref   = await getDocRef(doca)
    await updateDoc(ref, {
      status: 'REJEITADO', rejeitadoPor: usuario.email,
      hrRejeicao: agora, motivoRejeicao: motivo || '',
      atualizadoEm: serverTimestamp(),
    })
  }

  async function encerrarSessao() {
    if (!sessaoId) return
    const snaps = await getDocs(collection(db, COL_DOCAS))
    const docasSessao = snaps.docs.filter(d => d.data().sessaoId === sessaoId)
    await Promise.all(docasSessao.map(d => deleteDoc(d.ref)))
    await deleteDoc(doc(db, COL_SESSOES, sessaoId))
    setSessaoId(null)
  }

  // ── PROTEÇÃO 1: Verifica sessões do dia anterior ──────────
  function sessoesDiaAnterior() {
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    return sessoes.filter(s => s.data !== hoje && s.data)
  }

  return {
    sessoes, sessao, sessaoId, docas, carregando,
    criarSessao, selecionarSessao,
    iniciarDoca, atualizarDoca, finalizarDoca,
    aprovarDoca, rejeitarDoca, encerrarSessao,
    sessoesDiaAnterior,
  }
}