import { useState, useEffect } from 'react'
import {
  doc, collection, setDoc, getDoc, onSnapshot,
  updateDoc, deleteDoc, serverTimestamp, getDocs, query, orderBy, limit
} from 'firebase/firestore'
import { db } from './firebase'

const COL_SESSOES = 'sessoes'
const COL_DOCAS   = 'docas'
const MAX_SESSOES = 5

export function useSessao(usuario) {
  const [sessoes, setSessoes]       = useState([])   // lista de sessões disponíveis
  const [sessaoId, setSessaoId]     = useState(null) // ID da sessão ativa
  const [sessao, setSessao]         = useState(null)
  const [docas, setDocas]           = useState([])
  const [carregando, setCarregando] = useState(true)

  // Escuta todas as sessões disponíveis (últimas 5)
  useEffect(() => {
    if (!usuario) return
    const ref = collection(db, COL_SESSOES)
    const unsub = onSnapshot(ref, snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          // Ordena por data decrescente
          const da = a.criadoEm?.toMillis?.() || 0
          const db_ = b.criadoEm?.toMillis?.() || 0
          return db_ - da
        })
        .slice(0, MAX_SESSOES)
      setSessoes(lista)

      // Se não há sessão selecionada, seleciona a mais recente
      if (lista.length > 0) {
        setSessaoId(prev => prev || lista[0].id)
      } else {
        setSessaoId(null)
      }
      setCarregando(false)
    })
    return () => unsub()
  }, [usuario])

  // Escuta a sessão ativa
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
        .filter(d => d.sessaoId === sessaoId)
        .sort((a, b) => (a.doca || '').localeCompare(b.doca || ''))
      setDocas(lista)
    })
    return () => unsub()
  }, [sessaoId])

  // Cria nova sessão com ID único baseado na data + timestamp
  async function criarSessao(docasBase) {
    const hoje  = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const ts    = Date.now()
    const novoId = `sessao_${hoje.replace(/\//g, '-')}_${ts}`

    // Remove sessões antigas se já tem MAX_SESSOES
    if (sessoes.length >= MAX_SESSOES) {
      const maisAntiga = sessoes[sessoes.length - 1]
      // Remove docas da sessão antiga
      const snaps = await getDocs(collection(db, COL_DOCAS))
      const docasAntigas = snaps.docs.filter(d => d.data().sessaoId === maisAntiga.id)
      await Promise.all(docasAntigas.map(d => deleteDoc(d.ref)))
      await deleteDoc(doc(db, COL_SESSOES, maisAntiga.id))
    }

    // Cria nova sessão
    await setDoc(doc(db, COL_SESSOES, novoId), {
      data:       hoje,
      criadoPor:  usuario.email,
      criadoEm:   serverTimestamp(),
      totalDocas: docasBase.length,
    })

    // Cria docas com referência à sessão
    const promises = docasBase.map(d =>
      setDoc(doc(db, COL_DOCAS, `${novoId}_doca_${d.doca}`), {
        ...d,
        sessaoId,
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
    )

    // Corrige o sessaoId nas docas
    const promises2 = docasBase.map(d =>
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
    )
    await Promise.all(promises2)

    setSessaoId(novoId)
  }

  // Alterna para outra sessão
  function selecionarSessao(id) {
    setSessaoId(id)
  }

  async function iniciarDoca(doca, conferente, hrInicio) {
    const docId = `${sessaoId}_doca_${doca}`
    const ref   = doc(db, COL_DOCAS, docId)
    const snap  = await getDoc(ref)
    if (!snap.exists()) throw new Error('Doca não encontrada')
    if (snap.data().status !== 'PENDENTE') throw new Error('Doca já está sendo validada')
    await updateDoc(ref, {
      status: 'EM_ANDAMENTO', conferente, hrInicio,
      atualizadoEm: serverTimestamp(),
    })
  }

  async function atualizarDoca(doca, campos) {
    const docId = `${sessaoId}_doca_${doca}`
    const ref   = doc(db, COL_DOCAS, docId)
    await updateDoc(ref, { ...campos, atualizadoEm: serverTimestamp() })
  }

  async function finalizarDoca(doca, dados) {
    const docId = `${sessaoId}_doca_${doca}`
    const ref   = doc(db, COL_DOCAS, docId)
    await updateDoc(ref, { ...dados, atualizadoEm: serverTimestamp() })
  }

  async function aprovarDoca(doca, comentario) {
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const docId = `${sessaoId}_doca_${doca}`
    const ref   = doc(db, COL_DOCAS, docId)
    await updateDoc(ref, {
      status:      'CONCLUIDO',
      aprovadoPor: usuario.email,
      hrAprovacao: agora,
      comentarioAprovacao: comentario || '',
      atualizadoEm: serverTimestamp(),
    })
  }

  async function rejeitarDoca(doca, motivo) {
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const docId = `${sessaoId}_doca_${doca}`
    const ref   = doc(db, COL_DOCAS, docId)
    await updateDoc(ref, {
      status:         'REJEITADO',
      rejeitadoPor:   usuario.email,
      hrRejeicao:     agora,
      motivoRejeicao: motivo || '',
      atualizadoEm:   serverTimestamp(),
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

  return {
    sessoes, sessao, sessaoId, docas, carregando,
    criarSessao, selecionarSessao,
    iniciarDoca, atualizarDoca, finalizarDoca,
    aprovarDoca, rejeitarDoca, encerrarSessao,
  }
}