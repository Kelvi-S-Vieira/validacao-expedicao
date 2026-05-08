import { useState, useEffect } from 'react'
import {
  doc, collection, setDoc, getDoc, onSnapshot,
  updateDoc, deleteDoc, serverTimestamp, getDocs, query, where
} from 'firebase/firestore'
import { db } from './firebase'

const SESSAO_DOC = 'sessao_atual'
const COL_SESSOES = 'sessoes'
const COL_DOCAS   = 'docas'

// ─── Hook principal ───────────────────────────────────────
export function useSessao(usuario) {
  const [sessao, setSessao]       = useState(null)  // { id, data, docas, criadoPor, criadoEm }
  const [docas, setDocas]         = useState([])    // lista de docas com status em tempo real
  const [carregando, setCarregando] = useState(true)

  // Escuta a sessão ativa em tempo real
  useEffect(() => {
    if (!usuario) return
    const ref = doc(db, COL_SESSOES, SESSAO_DOC)
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setSessao({ id: snap.id, ...snap.data() })
      } else {
        setSessao(null)
      }
      setCarregando(false)
    })
    return () => unsub()
  }, [usuario])

  // Escuta as docas da sessão em tempo real
  useEffect(() => {
    if (!sessao) { setDocas([]); return }
    const ref = collection(db, COL_DOCAS)
    const unsub = onSnapshot(ref, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setDocas(lista.sort((a, b) => (a.doca || '').localeCompare(b.doca || '')))
    })
    return () => unsub()
  }, [sessao])

  // Fiscal cria nova sessão (upload do dia)
  async function criarSessao(docasBase) {
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    // Salva sessão
    await setDoc(doc(db, COL_SESSOES, SESSAO_DOC), {
      data:       hoje,
      criadoPor:  usuario.email,
      criadoEm:   serverTimestamp(),
      totalDocas: docasBase.length,
    })

    // Salva cada doca
    const promises = docasBase.map(d =>
      setDoc(doc(db, COL_DOCAS, `doca_${d.doca}`), {
        ...d,
        status:      'PENDENTE',
        conferente:  null,
        hrInicio:    null,
        hrFim:       null,
        hrValidado:  null,
        hrLiberado:  null,
        valDoca:     null,
        pendExp:     null,
        pendFrente:  null,
        pendDentro:  null,
        resultado:   null,
        logExp:      null,
        logFrente:   null,
        logDentro:   null,
        observacao:  null,
        tsAlerta:    null,
        statusAlerta: null,
        atualizadoEm: serverTimestamp(),
      })
    )
    await Promise.all(promises)
  }

  // Fiscal inicia validação de uma doca (bloqueia para outros)
  async function iniciarDoca(doca, conferente, hrInicio) {
    const ref = doc(db, COL_DOCAS, `doca_${doca}`)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Doca não encontrada')
    if (snap.data().status !== 'PENDENTE') throw new Error('Doca já está sendo validada')

    await updateDoc(ref, {
      status:      'EM_ANDAMENTO',
      conferente,
      hrInicio,
      atualizadoEm: serverTimestamp(),
    })
  }

  // Atualiza campos da doca durante validação
  async function atualizarDoca(doca, campos) {
    const ref = doc(db, COL_DOCAS, `doca_${doca}`)
    await updateDoc(ref, { ...campos, atualizadoEm: serverTimestamp() })
  }

  // Finaliza validação — solicita aprovação ou libera
  async function finalizarDoca(doca, dados) {
    const ref = doc(db, COL_DOCAS, `doca_${doca}`)
    await updateDoc(ref, {
      ...dados,
      atualizadoEm: serverTimestamp(),
    })
  }

  // Encerra sessão do dia (só fiscal/coordenador)
  async function encerrarSessao() {
    // Remove todas as docas
    const snaps = await getDocs(collection(db, COL_DOCAS))
    await Promise.all(snaps.docs.map(d => deleteDoc(d.ref)))
    // Remove sessão
    await deleteDoc(doc(db, COL_SESSOES, SESSAO_DOC))
  }

  return {
    sessao, docas, carregando,
    criarSessao, iniciarDoca, atualizarDoca, finalizarDoca, encerrarSessao,
  }
}