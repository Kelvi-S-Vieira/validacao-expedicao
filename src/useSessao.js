import { useState, useEffect } from 'react'
import {
  doc, collection, setDoc, getDoc, onSnapshot,
  updateDoc, deleteDoc, serverTimestamp, getDocs
} from 'firebase/firestore'
import { db } from './firebase'

const SESSAO_DOC  = 'sessao_atual'
const COL_SESSOES = 'sessoes'
const COL_DOCAS   = 'docas'

export function useSessao(usuario) {
  const [sessao, setSessao]         = useState(null)
  const [docas, setDocas]           = useState([])
  const [carregando, setCarregando] = useState(true)

  // Escuta sessão ativa em tempo real
  useEffect(() => {
    if (!usuario) return
    const ref = doc(db, COL_SESSOES, SESSAO_DOC)
    const unsub = onSnapshot(ref, snap => {
      setSessao(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      setCarregando(false)
    })
    return () => unsub()
  }, [usuario])

  // Escuta docas em tempo real
  useEffect(() => {
    if (!sessao) { setDocas([]); return }
    const ref = collection(db, COL_DOCAS)
    const unsub = onSnapshot(ref, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setDocas(lista.sort((a, b) => (a.doca || '').localeCompare(b.doca || '')))
    })
    return () => unsub()
  }, [sessao])

  // Cria sessão do dia (fiscal)
  async function criarSessao(docasBase) {
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    await setDoc(doc(db, COL_SESSOES, SESSAO_DOC), {
      data:       hoje,
      criadoPor:  usuario.email,
      criadoEm:   serverTimestamp(),
      totalDocas: docasBase.length,
    })
    const promises = docasBase.map(d =>
      setDoc(doc(db, COL_DOCAS, `doca_${d.doca}`), {
        ...d,
        status: 'PENDENTE',
        conferente: null, hrInicio: null, hrFim: null,
        hrValidado: null, hrLiberado: null, valDoca: null,
        pendExp: null, pendFrente: null, pendDentro: null,
        resultado: null, logExp: null, logFrente: null,
        logDentro: null, observacao: null, tsAlerta: null,
        statusAlerta: null, aprovadoPor: null, hrAprovacao: null,
        rejeitadoPor: null, hrRejeicao: null, motivoRejeicao: null,
        atualizadoEm: serverTimestamp(),
      })
    )
    await Promise.all(promises)
  }

  // Inicia validação (bloqueia doca)
  async function iniciarDoca(doca, conferente, hrInicio) {
    const ref  = doc(db, COL_DOCAS, `doca_${doca}`)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Doca não encontrada')
    if (snap.data().status !== 'PENDENTE') throw new Error('Doca já está sendo validada')
    await updateDoc(ref, {
      status: 'EM_ANDAMENTO', conferente, hrInicio,
      atualizadoEm: serverTimestamp(),
    })
  }

  // Atualiza campos durante validação
  async function atualizarDoca(doca, campos) {
    const ref = doc(db, COL_DOCAS, `doca_${doca}`)
    await updateDoc(ref, { ...campos, atualizadoEm: serverTimestamp() })
  }

  // Finaliza validação
  async function finalizarDoca(doca, dados) {
    const ref = doc(db, COL_DOCAS, `doca_${doca}`)
    await updateDoc(ref, { ...dados, atualizadoEm: serverTimestamp() })
  }

  // ── APROVAR doca (coordenador ou gerente) ──────────────────
  async function aprovarDoca(doca, comentario) {
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const ref   = doc(db, COL_DOCAS, `doca_${doca}`)
    await updateDoc(ref, {
      status:      'CONCLUIDO',
      aprovadoPor: usuario.email,
      hrAprovacao: agora,
      comentarioAprovacao: comentario || '',
      atualizadoEm: serverTimestamp(),
    })
  }

  // ── REJEITAR doca (coordenador ou gerente) ─────────────────
  async function rejeitarDoca(doca, motivo) {
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const ref   = doc(db, COL_DOCAS, `doca_${doca}`)
    await updateDoc(ref, {
      status:        'REJEITADO',
      rejeitadoPor:  usuario.email,
      hrRejeicao:    agora,
      motivoRejeicao: motivo || '',
      atualizadoEm:  serverTimestamp(),
    })
  }

  // Encerra sessão
  async function encerrarSessao() {
    const snaps = await getDocs(collection(db, COL_DOCAS))
    await Promise.all(snaps.docs.map(d => deleteDoc(d.ref)))
    await deleteDoc(doc(db, COL_SESSOES, SESSAO_DOC))
  }

  return {
    sessao, docas, carregando,
    criarSessao, iniciarDoca, atualizarDoca, finalizarDoca,
    aprovarDoca, rejeitarDoca, encerrarSessao,
  }
}