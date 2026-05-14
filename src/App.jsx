import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import Login from './Login'
import Aprovacao from './Aprovacao'
import Relatorio from './Relatorio'
import EntradaDados from './EntradaDados'
import Conferentes, { useConferentes } from './Conferentes'
import DashboardHistorico from './DashboardHistorico'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  AlertTriangle, CheckCircle, Clock, Package, TrendingUp,
  Calendar, Bell, RefreshCw, User, LogOut, Truck,
  ClipboardList, BarChart2, AlertCircle, FileText, PlusCircle, Users,
  History, Menu, X, Zap, ShieldAlert, Key, Eye, EyeOff
} from 'lucide-react'
import { useFCM } from './useFCM'

const API_KEY        = import.meta.env.VITE_GOOGLE_API_KEY
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID

function useResponsive() {
  const measure = () => ({
    isMobile:  window.innerWidth < 480,
    isTablet:  window.innerWidth >= 480 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    width:     window.innerWidth,
  })
  const [dims, setDims] = useState(measure)
  useEffect(() => {
    let raf = null
    const update = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => setDims(measure()))
      })
    }
    const ro = new ResizeObserver(update)
    ro.observe(document.documentElement)
    window.addEventListener('orientationchange', update)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', update)
      window.removeEventListener('resize', update)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return dims
}

async function buscarAbas() {
  const url  = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`
  const res  = await fetch(url)
  const data = await res.json()
  return data.sheets
    .map(s => s.properties.title)
    .filter(nome => /^\d{2}-\d{2}-\d{4}$/.test(nome))
}

async function buscarDadosAba(nomeAba) {
  const url  = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(nomeAba)}?key=${API_KEY}`
  const res  = await fetch(url)
  const data = await res.json()
  const linhas = data.values || []
  if (linhas.length < 2) return []
  const cabecalho = linhas[0]
  return linhas.slice(1).map(linha => {
    const obj = {}
    cabecalho.forEach((col, i) => obj[col] = linha[i] || '')
    return obj
  })
}

function normalizarLinha(linha, dataAba) {
  const pendExp    = Number(linha['Pend. Expedição'])   || 0
  const pendFrente = Number(linha['Pend. Frente Doca']) || 0
  const pendDentro = Number(linha['Pend. Dentro Doca']) || 0
  const soma       = pendExp + pendFrente + pendDentro
  const resultado  = pendExp - pendFrente - pendDentro
  const alerta     = linha['Alerta Enviado']
    ? (linha['Alerta Enviado'].includes('GERENTE') ? 'GERENTE' : 'COORDENADOR')
    : ''
  const partes        = dataAba.split('-')
  const dataFormatada = partes.length === 3 ? `${partes[0]}/${partes[1]}` : dataAba
  return {
    data: dataFormatada, doca: linha['Doca'] || '',
    remessa: linha['Remessa'] || '', horario: linha['Horario'] || '',
    pendExp, pendFrente, pendDentro, total: soma, resultado,
    validado: linha['VALIDADO'] || '', liberado: linha['LIBERADO'] || '',
    supervisor: linha['Supervisor'] || '', turno: linha['Turno'] || '',
    alerta, aprovado: false,
  }
}

// ── Busca perfil no Firestore (suporta ADMIN e qualquer e-mail) ──
async function buscarPerfil(uid) {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid))
    if (snap.exists()) return snap.data().perfil || null
  } catch {}
  return null
}

// ── Fallback por e-mail ──────────────────────────────────
function detectarPerfilPorEmail(email) {
  if (email.includes('gerente'))     return 'GERENTE'
  if (email.includes('coordenador')) return 'COORDENADOR'
  if (email.includes('analista'))    return 'ANALISTA'
  return 'FISCAL'
}

const COR_PERFIL = {
  GERENTE: '#ef4444', COORDENADOR: '#f97316', ANALISTA: '#22c55e',
  FISCAL: '#3b82f6', ADMIN: '#8b5cf6'
}

const ABAS_POR_PERFIL = {
  FISCAL:      ['entrada', 'dashboard'],
  COORDENADOR: ['dashboard', 'historico', 'tabela', 'alertas', 'aprovacao', 'conferentes'],
  GERENTE:     ['dashboard', 'historico', 'tabela', 'alertas', 'aprovacao', 'relatorio', 'conferentes'],
  ANALISTA:    ['dashboard', 'historico', 'tabela', 'relatorio'],
  ADMIN:       ['entrada', 'dashboard', 'historico', 'tabela', 'alertas', 'aprovacao', 'relatorio', 'conferentes'],
}

const LABELS = {
  entrada: 'Entrada', dashboard: 'Dashboard',
  historico: 'Histórico', tabela: 'Tabela',
  alertas: 'Alertas', aprovacao: 'Aprovação',
  relatorio: 'Relatório', conferentes: 'Fiscais',
}

const ICONS = {
  entrada:     <PlusCircle size={16} />,
  dashboard:   <BarChart2 size={16} />,
  historico:   <History size={16} />,
  tabela:      <ClipboardList size={16} />,
  alertas:     <AlertCircle size={16} />,
  aprovacao:   <CheckCircle size={16} />,
  relatorio:   <FileText size={16} />,
  conferentes: <Users size={16} />,
}

function MetricCard({ label, valor, icon, cor, sub, compact }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 12, padding: compact ? '14px 16px' : '20px 24px',
      border: '1px solid var(--border)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cor, borderRadius: '12px 12px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: compact ? 10 : 11, color: 'var(--text-muted)', marginBottom: compact ? 6 : 10, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: compact ? 28 : 36, fontWeight: 900, color: cor, lineHeight: 1 }}>{valor}</div>
          {sub && !compact && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{sub}</div>}
        </div>
        <div style={{ background: cor + '20', borderRadius: 8, padding: compact ? 8 : 10, color: cor }}>{icon}</div>
      </div>
    </div>
  )
}

function Badge({ text }) {
  const cores = {
    SIM:         { bg: 'var(--green-dim)',  color: 'var(--green)' },
    NÃO:         { bg: 'var(--red-dim)',    color: 'var(--red)' },
    GERENTE:     { bg: 'var(--red-dim)',    color: 'var(--red)' },
    COORDENADOR: { bg: 'var(--orange-dim)', color: 'var(--orange)' },
    default:     { bg: 'var(--border)',     color: 'var(--text-secondary)' },
  }
  const c = cores[text] || cores.default
  return (
    <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
      {text || 'N/A'}
    </span>
  )
}

function PainelTempoReal({ compact }) {
  const [docasVivas, setDocasVivas] = useState([])
  const [sessaoAtiva, setSessaoAtiva] = useState(null)

  useEffect(() => {
    const unsubS = onSnapshot(collection(db, 'sessoes'), snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0))
      setSessaoAtiva(lista[0] || null)
    })
    return () => unsubS()
  }, [])

  useEffect(() => {
    const unsubD = onSnapshot(collection(db, 'docas'), snap => {
      setDocasVivas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsubD()
  }, [])

  const docasSessao = sessaoAtiva
    ? docasVivas.filter(d => d.sessaoId === sessaoAtiva.id || (!d.sessaoId && d.id.startsWith('doca_')))
    : []

  if (!sessaoAtiva || docasSessao.length === 0) return null

  const total       = docasSessao.length
  const concluidas  = docasSessao.filter(d => d.status === 'CONCLUIDO').length
  const emAndamento = docasSessao.filter(d => d.status === 'EM_ANDAMENTO').length
  const aguardando  = docasSessao.filter(d => ['AGUARD_COORD','AGUARD_GERENTE','ESCALADO'].includes(d.status)).length
  const pendentes   = docasSessao.filter(d => d.status === 'PENDENTE').length
  const pct         = total > 0 ? Math.round(concluidas / total * 100) : 0

  const STATUS_INFO = {
    PENDENTE:       { label: 'Pendente',           cor: 'var(--text-muted)' },
    EM_ANDAMENTO:   { label: 'Em andamento',        cor: 'var(--yellow)' },
    AGUARD_COORD:   { label: 'Aguard. coordenador', cor: 'var(--orange)' },
    AGUARD_GERENTE: { label: 'Aguard. gerente',     cor: 'var(--red)' },
    ESCALADO:       { label: 'Escalado → gerente',  cor: 'var(--red)' },
    CONCLUIDO:      { label: 'Concluído',            cor: 'var(--green)' },
    REJEITADO:      { label: 'Rejeitado',            cor: 'var(--red)' },
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Turno em andamento</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {sessaoAtiva.data} · {total} docas</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>upload: {sessaoAtiva.criadoPor?.split('@')[0]}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Concluídas',   valor: `${concluidas} (${pct}%)`, cor: 'var(--green)' },
          { label: 'Em andamento', valor: emAndamento,                cor: 'var(--yellow)' },
          { label: 'Aguardando',   valor: aguardando,                 cor: 'var(--orange)' },
          { label: 'Pendentes',    valor: pendentes,                  cor: 'var(--text-muted)' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)', borderLeft: `3px solid ${c.cor}` }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: c.cor }}>{c.valor}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--green)', borderRadius: 4, width: `${pct}%`, transition: 'width 0.5s ease' }} />
      </div>
      {(emAndamento > 0 || aguardando > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Docas que precisam de atenção</div>
          {docasSessao
            .filter(d => ['EM_ANDAMENTO','AGUARD_COORD','AGUARD_GERENTE','ESCALADO'].includes(d.status))
            .slice(0, compact ? 3 : 6)
            .map(d => {
              const info = STATUS_INFO[d.status] || STATUS_INFO.PENDENTE
              return (
                <div key={d.id} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 14px', border: `1px solid ${info.cor}33`, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: 'var(--yellow-dim)', borderRadius: 6, padding: '4px 10px', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 9, color: 'var(--yellow)', fontWeight: 700 }}>DOCA</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--yellow)', lineHeight: 1 }}>{d.doca}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nomeFilial || d.remessa || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {d.conferente && `👤 ${d.conferente}`}
                      {d.resultado != null && <span style={{ color: d.resultado >= 5 ? 'var(--red)' : d.resultado >= 3 ? 'var(--yellow)' : 'var(--green)', fontWeight: 700, marginLeft: 8 }}>Resultado: {d.resultado}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: info.cor, background: info.cor + '15', padding: '3px 10px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>{info.label}</span>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { isMobile, isTablet, isDesktop } = useResponsive()
  const compact = !isDesktop

  const [usuario, setUsuario]                     = useState(null)
  const [verificando, setVerificando]             = useState(true)
  const [dados, setDados]                         = useState([])
  const [carregando, setCarregando]               = useState(true)
  const [erro, setErro]                           = useState(null)
  const [diaSelecionado, setDiaSelecionado]       = useState('todos')
  const [abaSelecionada, setAbaSelecionada]       = useState('dashboard')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [perfilAprovacao, setPerfilAprovacao]     = useState('COORDENADOR')
  const [conferentes]                             = useConferentes()
  const [mostrarNotif, setMostrarNotif]           = useState(false)
  const [menuAberto, setMenuAberto]               = useState(false)

  const { permissao, notificacoes, marcarLida, limparNotificacoes, solicitarPermissao, tokenExpirado } = useFCM(usuario)
  const notifNaoLidas = notificacoes.filter(n => !n.lida).length

  useEffect(() => {
    const handler = e => setAbaSelecionada('aprovacao')
    window.addEventListener('abrirAprovacao', handler)
    return () => window.removeEventListener('abrirAprovacao', handler)
  }, [])

  // ── Auth state — busca perfil no Firestore ────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (user) {
        const perfilFirestore = await buscarPerfil(user.uid)
        const perfil = perfilFirestore || detectarPerfilPorEmail(user.email)
        setUsuario({ email: user.email, perfil, uid: user.uid })
        setAbaSelecionada(ABAS_POR_PERFIL[perfil]?.[0] || 'dashboard')
      } else {
        setUsuario(null)
      }
      setVerificando(false)
    })
    return () => unsub()
  }, [])

  async function carregarDados() {
    setCarregando(true); setErro(null)
    try {
      const abas = await buscarAbas()
      const todasLinhas = []
      for (const aba of abas) {
        const linhas = await buscarDadosAba(aba)
        linhas.forEach(linha => {
          if (linha['Doca']) todasLinhas.push(normalizarLinha(linha, aba))
        })
      }
      setDados(todasLinhas)
      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
    } catch {
      setErro('Erro ao carregar dados do Google Sheets.')
    }
    setCarregando(false)
  }

  useEffect(() => {
    if (!usuario) return
    carregarDados()
    const t = setInterval(carregarDados, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [usuario])

  const dias           = ['todos', ...new Set(dados.map(d => d.data))]
  const dadosFiltrados = diaSelecionado === 'todos' ? dados : dados.filter(d => d.data === diaSelecionado)
  const totalDocas     = dadosFiltrados.length
  const totalLiberadas = dadosFiltrados.filter(d => d.liberado === 'SIM').length
  const totalAlertas   = dadosFiltrados.filter(d => d.alerta !== '').length
  const totalCriticos  = dadosFiltrados.filter(d => d.alerta === 'GERENTE').length
  const pctLiberadas   = totalDocas > 0 ? Math.round(totalLiberadas / totalDocas * 100) : 0

  const dadosGrafico = dias.filter(d => d !== 'todos').map(dia => ({
    dia,
    Liberadas: dados.filter(d => d.data === dia && d.liberado === 'SIM').length,
    Pendentes: dados.filter(d => d.data === dia && d.liberado !== 'SIM').length,
  }))

  const dadosPizza = [
    { name: 'Liberadas', value: totalLiberadas,              cor: '#22c55e' },
    { name: 'Pendentes', value: totalDocas - totalLiberadas, cor: '#ef4444' },
  ]

  function handleAprovar(row)  { setDados(prev => prev.map(d => d.doca === row.doca && d.data === row.data ? { ...d, aprovado: true }  : d)) }
  function handleRejeitar(row) { setDados(prev => prev.map(d => d.doca === row.doca && d.data === row.data ? { ...d, rejeitado: true } : d)) }

  function navegar(aba) { setAbaSelecionada(aba); setMenuAberto(false) }

  const abasPerfil = usuario ? (ABAS_POR_PERFIL[usuario.perfil] || ['dashboard']) : ['dashboard']
  const semFiltro  = ['entrada', 'conferentes', 'historico']
  const podeNotif  = ['COORDENADOR', 'GERENTE', 'ADMIN'].includes(usuario?.perfil)
  const isAdmin    = usuario?.perfil === 'ADMIN'
  const pad        = compact ? '16px' : '24px 32px'

  // ── Estados do modal de alterar senha ────────────────
  const [modalSenha, setModalSenha]               = useState(false)
  const [senhaAtual, setSenhaAtual]               = useState('')
  const [senhaNova, setSenhaNova]                 = useState('')
  const [senhaNovaConf, setSenhaNovaConf]         = useState('')
  const [erroSenha, setErroSenha]                 = useState('')
  const [sucSenha, setSucSenha]                   = useState(false)
  const [loadingSenha, setLoadingSenha]           = useState(false)
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false)
  const [mostrarSenhaNova, setMostrarSenhaNova]   = useState(false)

  function fecharModalSenha() {
    setModalSenha(false); setErroSenha(''); setSucSenha(false)
    setSenhaAtual(''); setSenhaNova(''); setSenhaNovaConf('')
    setMostrarSenhaAtual(false); setMostrarSenhaNova(false)
  }

  async function handleAlterarSenha(e) {
    e.preventDefault()
    setErroSenha(''); setSucSenha(false)
    if (senhaNova.length < 6) { setErroSenha('A nova senha deve ter pelo menos 6 caracteres.'); return }
    if (senhaNova !== senhaNovaConf) { setErroSenha('As senhas não coincidem.'); return }
    setLoadingSenha(true)
    try {
      const { currentUser } = auth
      const credential = EmailAuthProvider.credential(currentUser.email, senhaAtual)
      await reauthenticateWithCredential(currentUser, credential)
      await updatePassword(currentUser, senhaNova)
      setSucSenha(true)
      setSenhaAtual(''); setSenhaNova(''); setSenhaNovaConf('')
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErroSenha('Senha atual incorreta.')
      } else {
        setErroSenha('Erro ao alterar senha. Tente novamente.')
      }
    }
    setLoadingSenha(false)
  }

  const INPUT_SENHA = {
    width: '100%', padding: '11px 42px 11px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
  }

  if (verificando) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--yellow)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</span>
    </div>
  )

  if (!usuario) return <Login onLogin={u => { setUsuario(u); setAbaSelecionada(ABAS_POR_PERFIL[u.perfil]?.[0] || 'dashboard') }} />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>

      {/* HEADER */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: `0 ${compact ? '16px' : '32px'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'var(--yellow)', borderRadius: 6, padding: '3px 8px' }}>
            <span style={{ fontSize: isMobile ? 10 : 12, fontWeight: 900, color: '#1a1a1a' }}>
              {isMobile ? 'GPP' : 'grupo'}{!isMobile && <strong>pernambucanas</strong>}
            </span>
          </div>
          {!isMobile && (
            <>
              <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Truck size={14} color="var(--yellow)" />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Validação de Expedição</span>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isDesktop && ultimaAtualizacao && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Atualizado {ultimaAtualizacao}</span>
          )}

          <button onClick={carregarDados} disabled={carregando} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <RefreshCw size={13} style={{ animation: carregando ? 'spin 1s linear infinite' : 'none' }} />
            {!isMobile && 'Atualizar'}
          </button>

          {podeNotif && permissao !== 'granted' && (
            <button onClick={solicitarPermissao} style={{ background: 'var(--yellow-dim)', border: '1px solid var(--yellow)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: 'var(--yellow)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Bell size={12} />{!isMobile && 'Ativar notif.'}
            </button>
          )}

          {podeNotif && tokenExpirado && permissao === 'granted' && (
            <button onClick={solicitarPermissao} style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: 'var(--red)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={12} />{!isMobile && 'Renovar notif.'}
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <button onClick={() => setMostrarNotif(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: (totalAlertas > 0 || notifNaoLidas > 0) ? 'var(--yellow-dim)' : 'none',
              border: `1px solid ${(totalAlertas > 0 || notifNaoLidas > 0) ? 'var(--yellow)' : 'var(--border)'}`,
              borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
            }}>
              <Bell size={14} color={(totalAlertas > 0 || notifNaoLidas > 0) ? 'var(--yellow)' : 'var(--text-muted)'} />
              {(totalAlertas + notifNaoLidas) > 0 && (
                <span style={{ fontSize: 12, color: 'var(--yellow)', fontWeight: 700 }}>{totalAlertas + notifNaoLidas}</span>
              )}
            </button>

            {mostrarNotif && notificacoes.length > 0 && (
              <div style={{ position: 'absolute', top: 42, right: 0, width: isMobile ? 280 : 320, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Notificações</span>
                  <button onClick={() => { limparNotificacoes(); setMostrarNotif(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}>Limpar</button>
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {notificacoes.map(n => (
                    <div key={n.id} onClick={() => { marcarLida(n.id); setMostrarNotif(false); setAbaSelecionada('aprovacao') }}
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.lida ? 'transparent' : 'var(--yellow-dim)' }}>
                      <div style={{ fontSize: 13, fontWeight: n.lida ? 400 : 700, marginBottom: 3 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{n.body}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{n.ts}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PERFIL + CHAVE + LOGOUT — desktop */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid var(--border)', paddingLeft: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{usuario.email.split('@')[0]}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  {isAdmin && <ShieldAlert size={10} color="#8b5cf6" />}
                  <div style={{ fontSize: 10, color: COR_PERFIL[usuario.perfil], fontWeight: 700 }}>{usuario.perfil}</div>
                </div>
              </div>
              <button onClick={() => setModalSenha(true)} title="Alterar senha"
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <Key size={14} />
              </button>
              <button onClick={() => signOut(auth)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <LogOut size={14} />
              </button>
            </div>
          )}

          {isMobile && (
            <button onClick={() => setMenuAberto(v => !v)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {menuAberto ? <X size={16} /> : <Menu size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* MENU MOBILE */}
      {isMobile && menuAberto && (
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '8px 0', zIndex: 50 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{usuario.email.split('@')[0]}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {isAdmin && <ShieldAlert size={10} color="#8b5cf6" />}
                <div style={{ fontSize: 11, color: COR_PERFIL[usuario.perfil], fontWeight: 700 }}>{usuario.perfil}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setModalSenha(true); setMenuAberto(false) }}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Key size={13} /> Senha
              </button>
              <button onClick={() => signOut(auth)}
                style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--red)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <LogOut size={13} /> Sair
              </button>
            </div>
          </div>
          {abasPerfil.map(aba => (
            <button key={aba} onClick={() => navegar(aba)} style={{
              width: '100%', padding: '12px 16px', background: abaSelecionada === aba ? 'var(--yellow-dim)' : 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14,
              color: abaSelecionada === aba ? 'var(--yellow)' : 'var(--text-primary)',
              fontWeight: abaSelecionada === aba ? 700 : 400,
              display: 'flex', alignItems: 'center', gap: 10,
              borderLeft: abaSelecionada === aba ? '3px solid var(--yellow)' : '3px solid transparent',
            }}>
              {ICONS[aba]}{LABELS[aba]}
            </button>
          ))}
        </div>
      )}

      {/* NAVEGAÇÃO desktop/tablet */}
      {!isMobile && (
        <div style={{ background: 'var(--bg-secondary)', padding: `0 ${compact ? '16px' : '32px'}`, display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {abasPerfil.map(aba => (
            <button key={aba} onClick={() => navegar(aba)} style={{
              padding: isTablet ? '12px 12px' : '14px 16px',
              background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              color: abaSelecionada === aba ? 'var(--yellow)' : 'var(--text-muted)',
              borderBottom: abaSelecionada === aba ? '2px solid var(--yellow)' : '2px solid transparent',
              fontWeight: abaSelecionada === aba ? 700 : 400, fontSize: isTablet ? 12 : 13,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {ICONS[aba]}{LABELS[aba]}
            </button>
          ))}
        </div>
      )}

      {/* CONTEÚDO */}
      <div style={{ padding: pad }}>
        {erro && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>
            ⚠️ {erro}
          </div>
        )}

        {carregando && !semFiltro.includes(abaSelecionada) && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--yellow)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
            <div style={{ fontSize: 13 }}>Carregando dados...</div>
          </div>
        )}

        <div className="fade-in">
          {abaSelecionada === 'entrada'     && <EntradaDados usuario={usuario} conferentes={conferentes} onDadosSalvos={carregarDados} tokenFCMExpirado={tokenExpirado} onRenovarToken={solicitarPermissao} />}
          {abaSelecionada === 'conferentes' && <Conferentes />}
          {abaSelecionada === 'historico'   && <DashboardHistorico dadosRecentes={dados} />}

          {!semFiltro.includes(abaSelecionada) && !carregando && !erro && (
            <>
              {abaSelecionada === 'dashboard' && (
                <>
                  <PainelTempoReal compact={compact} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <Calendar size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Histórico (Sheets):</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {dias.map(dia => (
                        <button key={dia} onClick={() => setDiaSelecionado(dia)} style={{
                          padding: '4px 12px', borderRadius: 20, border: '1px solid',
                          borderColor: diaSelecionado === dia ? 'var(--yellow)' : 'var(--border)',
                          cursor: 'pointer', fontSize: 12,
                          background: diaSelecionado === dia ? 'var(--yellow-dim)' : 'transparent',
                          color: diaSelecionado === dia ? 'var(--yellow)' : 'var(--text-muted)',
                          fontWeight: diaSelecionado === dia ? 700 : 400,
                        }}>
                          {dia === 'todos' ? 'Todos' : dia}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: compact ? 10 : 16, marginBottom: compact ? 16 : 24 }}>
                    <MetricCard label="Total Docas"  valor={totalDocas}     icon={<Package size={18} />}       cor="#3b82f6" sub={`${dias.filter(d => d !== 'todos').length} dia(s)`} compact={compact} />
                    <MetricCard label="Liberadas"    valor={totalLiberadas} icon={<CheckCircle size={18} />}   cor="#22c55e" sub={`${pctLiberadas}%`} compact={compact} />
                    <MetricCard label="Alertas"      valor={totalAlertas}   icon={<AlertTriangle size={18} />} cor="var(--yellow)" sub="Aguardando" compact={compact} />
                    <MetricCard label="Críticos"     valor={totalCriticos}  icon={<TrendingUp size={18} />}    cor="#ef4444" sub="≥ 5 pend." compact={compact} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '2fr 1fr' : '1fr', gap: compact ? 12 : 16 }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: compact ? 16 : 24, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evolução Diária</div>
                      <ResponsiveContainer width="100%" height={compact ? 180 : 220}>
                        <BarChart data={dadosGrafico} barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="dia" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                          <Legend iconType="circle" iconSize={8} />
                          <Bar dataKey="Liberadas" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={40} />
                          <Bar dataKey="Pendentes" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: compact ? 16 : 24, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Geral</div>
                      <ResponsiveContainer width="100%" height={compact ? 140 : 160}>
                        <PieChart>
                          <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                            {dadosPizza.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 6 }}>
                        {dadosPizza.map((d, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.cor }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{d.name}: <strong style={{ color: d.cor }}>{d.value}</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {abaSelecionada !== 'dashboard' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  <Calendar size={13} color="var(--text-muted)" />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Período:</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {dias.map(dia => (
                      <button key={dia} onClick={() => setDiaSelecionado(dia)} style={{
                        padding: '4px 12px', borderRadius: 20, border: '1px solid',
                        borderColor: diaSelecionado === dia ? 'var(--yellow)' : 'var(--border)',
                        cursor: 'pointer', fontSize: 12,
                        background: diaSelecionado === dia ? 'var(--yellow-dim)' : 'transparent',
                        color: diaSelecionado === dia ? 'var(--yellow)' : 'var(--text-muted)',
                        fontWeight: diaSelecionado === dia ? 700 : 400,
                      }}>
                        {dia === 'todos' ? 'Todos' : dia}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {abaSelecionada === 'tabela' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Docas — {dadosFiltrados.length} registro(s)
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? 12 : 13, minWidth: 700 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                          {['Data','Doca','Remessa','P.Exp','Frente','Dentro','Resultado','Supervisor','Liberado','Alerta'].map(col => (
                            <th key={col} style={{ padding: compact ? '10px 12px' : '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dadosFiltrados.map((row, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--border)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: compact ? '10px 12px' : '12px 16px', color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{row.data}</td>
                            <td style={{ padding: compact ? '10px 12px' : '12px 16px', fontWeight: 800, color: 'var(--yellow)' }}>{row.doca}</td>
                            <td style={{ padding: compact ? '10px 12px' : '12px 16px', fontFamily: 'monospace', fontSize: 11 }}>{row.remessa}</td>
                            <td style={{ padding: compact ? '10px 12px' : '12px 16px', fontWeight: 700, color: row.pendExp > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{row.pendExp}</td>
                            <td style={{ padding: compact ? '10px 12px' : '12px 16px', color: row.pendFrente > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{row.pendFrente}</td>
                            <td style={{ padding: compact ? '10px 12px' : '12px 16px', color: row.pendDentro > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{row.pendDentro}</td>
                            <td style={{ padding: compact ? '10px 12px' : '12px 16px', fontWeight: 900, color: row.resultado >= 5 ? 'var(--red)' : row.resultado >= 3 ? 'var(--yellow)' : 'var(--green)' }}>{row.resultado ?? row.total}</td>
                            <td style={{ padding: compact ? '10px 12px' : '12px 16px', fontSize: 11, whiteSpace: 'nowrap' }}>{row.supervisor}</td>
                            <td style={{ padding: compact ? '10px 12px' : '12px 16px' }}><Badge text={row.liberado || 'N/A'} /></td>
                            <td style={{ padding: compact ? '10px 12px' : '12px 16px' }}>{row.alerta && <Badge text={row.alerta} />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {abaSelecionada === 'alertas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dadosFiltrados.filter(d => d.alerta !== '').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                      <CheckCircle size={44} color="var(--green)" style={{ marginBottom: 14, opacity: 0.5 }} />
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Tudo em ordem!</div>
                      <div style={{ fontSize: 13 }}>Nenhum alerta ativo</div>
                    </div>
                  ) : dadosFiltrados.filter(d => d.alerta !== '').map((row, i) => {
                    const cor = row.alerta === 'GERENTE' ? 'var(--red)' : 'var(--yellow)'
                    return (
                      <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: compact ? '14px 16px' : '16px 20px', border: `1px solid ${row.alerta === 'GERENTE' ? '#ef444430' : '#F5E64230'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ background: cor + '20', borderRadius: 8, padding: 8, flexShrink: 0 }}>
                            <AlertTriangle size={18} color={cor} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: compact ? 13 : 15 }}>Doca {row.doca} — {row.remessa}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                              Resultado: <strong style={{ color: cor }}>{row.resultado ?? row.total}</strong> pendências
                            </div>
                          </div>
                        </div>
                        <Badge text={row.alerta} />
                      </div>
                    )
                  })}
                </div>
              )}

              {abaSelecionada === 'aprovacao' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                    <User size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visualizando como:</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['COORDENADOR', 'GERENTE'].map(p => (
                        <button key={p} onClick={() => setPerfilAprovacao(p)} style={{
                          padding: '6px 14px', borderRadius: 20,
                          border: `1px solid ${perfilAprovacao === p ? (p === 'GERENTE' ? 'var(--red)' : 'var(--orange)') : 'var(--border)'}`,
                          cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          background: perfilAprovacao === p ? (p === 'GERENTE' ? 'var(--red-dim)' : 'var(--orange-dim)') : 'transparent',
                          color: perfilAprovacao === p ? (p === 'GERENTE' ? 'var(--red)' : 'var(--orange)') : 'var(--text-muted)',
                        }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Aprovacao usuario={usuario} dados={dadosFiltrados} perfil={perfilAprovacao} onAprovar={handleAprovar} onRejeitar={handleRejeitar} />
                </div>
              )}

              {abaSelecionada === 'relatorio' && <Relatorio dados={dadosFiltrados} />}
            </>
          )}
        </div>
      </div>

      {/* ── MODAL ALTERAR SENHA ── */}
      {modalSenha && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Key size={18} color="var(--yellow)" />
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>Alterar senha</h3>
              </div>
              <button onClick={fecharModalSenha} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1 }}>✕</button>
            </div>

            {sucSenha ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={44} color="var(--green)" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Senha alterada com sucesso!</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Use a nova senha no próximo login.</p>
                <button onClick={fecharModalSenha} style={{ background: 'var(--yellow)', border: 'none', borderRadius: 10, padding: '12px 28px', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#1a1a1a' }}>
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleAlterarSenha}>
                {[
                  { label: 'Senha atual',         val: senhaAtual,    set: setSenhaAtual,    show: mostrarSenhaAtual, toggle: () => setMostrarSenhaAtual(v => !v) },
                  { label: 'Nova senha',           val: senhaNova,     set: setSenhaNova,     show: mostrarSenhaNova,  toggle: () => setMostrarSenhaNova(v => !v)  },
                  { label: 'Confirmar nova senha', val: senhaNovaConf, set: setSenhaNovaConf, show: mostrarSenhaNova,  toggle: () => setMostrarSenhaNova(v => !v)  },
                ].map((f, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.label}</label>
                    <div style={{ position: 'relative' }}>
                      <input type={f.show ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)} required
                        style={INPUT_SENHA}
                        onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                      <button type="button" onClick={f.toggle} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                        {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}

                {erroSenha && (
                  <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: 'var(--red)', fontSize: 13 }}>
                    {erroSenha}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                  <button type="button" onClick={fecharModalSenha}
                    style={{ padding: '12px', borderRadius: 10, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={loadingSenha}
                    style={{ padding: '12px', borderRadius: 10, border: 'none', background: loadingSenha ? 'var(--border)' : 'var(--yellow)', color: loadingSenha ? 'var(--text-muted)' : '#1a1a1a', fontWeight: 800, cursor: loadingSenha ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Key size={15} />{loadingSenha ? 'Salvando...' : 'Alterar senha'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
        * { -webkit-tap-highlight-color: transparent; }
        input, select, textarea { font-size: 16px !important; }
        #root, body, html { min-height: 100dvh; min-height: 100vh; }
        .fade-in { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  )
}