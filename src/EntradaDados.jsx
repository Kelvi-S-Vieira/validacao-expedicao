import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FileSpreadsheet, Play, CheckCircle, Clock, Lock, Timer, Send,
  Trash2, ShieldCheck, Save, ChevronDown, AlertTriangle, RefreshCw
} from 'lucide-react'
import * as XLSX from 'xlsx-js-style'
import { useSessao } from './useSessao'

const COL = {
  DOCA:        13,
  REMESSA:     14,
  DATA:        20,
  HORARIO:     24,
  GPP:         23,
  LOJA:        30,
  NOME_FILIAL: 31,
}

function detectarSupervisor(horario) {
  if (!horario) return 'Virginia'
  try {
    let h = 0
    if (typeof horario === 'string') h = parseInt(horario.split(':')[0])
    else if (horario instanceof Date) h = horario.getHours()
    else if (typeof horario === 'number') h = Math.floor(horario * 24)
    return h >= 14 ? 'Magdiel' : 'Virginia'
  } catch { return 'Virginia' }
}

function formatarHorario(val) {
  if (!val) return ''
  if (typeof val === 'string') return val.substring(0, 5)
  if (val instanceof Date) return val.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (typeof val === 'number') {
    const m = Math.round(val * 24 * 60)
    return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  }
  return String(val).substring(0, 5)
}

function formatarData(val) {
  if (!val) return ''
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000))
    return `${String(date.getUTCDate()).padStart(2,'0')}/${String(date.getUTCMonth()+1).padStart(2,'0')}/${date.getUTCFullYear()}`
  }
  if (val instanceof Date && !isNaN(val)) {
    return `${String(val.getUTCDate()).padStart(2,'0')}/${String(val.getUTCMonth()+1).padStart(2,'0')}/${val.getUTCFullYear()}`
  }
  const str = String(val).trim()
  const partes = str.split('/')
  if (partes.length === 3) {
    return `${partes[0].padStart(2,'0')}/${partes[1].padStart(2,'0')}/${partes[2].length===2?'20'+partes[2]:partes[2]}`
  }
  return str
}

function horarioAtual() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function calcularTempo(inicio, fim) {
  if (!inicio || !fim) return ''
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fim.split(':').map(Number)
  const diff = (hf * 60 + mf) - (hi * 60 + mi)
  if (diff <= 0) return ''
  return `${String(Math.floor(diff / 60)).padStart(2,'0')}:${String(diff % 60).padStart(2,'0')}`
}

function segundosDesde(ts) {
  if (!ts) return Infinity
  const t = ts?.toMillis ? ts.toMillis() : ts
  return Math.floor((Date.now() - t) / 1000)
}

const INFO_ST = {
  PENDENTE:       { bg: 'var(--bg-secondary)', color: 'var(--text-muted)',  label: 'Pendente' },
  EM_ANDAMENTO:   { bg: 'var(--yellow-dim)',   color: 'var(--yellow)',      label: 'Em andamento' },
  AGUARD_COORD:   { bg: 'var(--orange-dim)',   color: 'var(--orange)',      label: 'Aguard. coordenador' },
  ESCALADO:       { bg: 'var(--red-dim)',      color: '#f97316',            label: 'Escalado → gerente' },
  AGUARD_GERENTE: { bg: 'var(--red-dim)',      color: 'var(--red)',         label: 'Aguard. gerente' },
  CONCLUIDO:      { bg: 'var(--green-dim)',    color: 'var(--green)',       label: 'Concluído' },
  REJEITADO:      { bg: 'var(--red-dim)',      color: 'var(--red)',         label: 'Rejeitado' },
}

const S = {
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: 16, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
  },
}

function Campo({ label, valor, onChange, type='number', min='0', readOnly, required, placeholder }) {
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' }}>
        {label}{required && <span style={{ color:'var(--yellow)', marginLeft:2 }}>*</span>}
      </label>
      <input type={type} value={valor||''} readOnly={readOnly} placeholder={placeholder}
        onChange={e => onChange && onChange(e.target.value)} min={min} required={required}
        style={{ ...S.input, background: readOnly ? 'var(--bg-secondary)' : 'var(--bg-primary)', cursor: readOnly ? 'default' : 'text' }}
        onFocus={e => !readOnly && (e.target.style.borderColor = 'var(--yellow)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )
}

function Countdown({ tsAlerta, onExpirar }) {
  const [restante, setRestante] = useState(() => Math.max(0, 300 - segundosDesde(tsAlerta)))
  useState(() => {
    const t = setInterval(() => {
      const r = Math.max(0, 300 - segundosDesde(tsAlerta))
      setRestante(r)
      if (r <= 0) { clearInterval(t); onExpirar?.() }
    }, 1000)
    return () => clearInterval(t)
  }, [tsAlerta])
  const min = Math.floor(restante / 60), seg = restante % 60
  return (
    <div style={{ background:'var(--orange-dim)', border:'1px solid var(--orange)', borderRadius:10, padding:'8px 14px', minWidth:180 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:11, color:'var(--orange)', fontWeight:600 }}>Escala em</span>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--orange)', fontFamily:'monospace' }}>
          {String(min).padStart(2,'0')}:{String(seg).padStart(2,'0')}
        </span>
      </div>
      <div style={{ height:3, background:'var(--border)', borderRadius:2 }}>
        <div style={{ height:'100%', background:'var(--orange)', borderRadius:2, width:`${(restante/300)*100}%`, transition:'width 1s linear' }} />
      </div>
    </div>
  )
}

function SeletorSessoes({ sessoes, sessaoId, onSelecionar, onNovaUpload, onRemover }) {
  const [aberto, setAberto] = useState(false)
  const sessaoAtual = sessoes.find(s => s.id === sessaoId)

  return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button onClick={() => setAberto(v => !v)} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', cursor:'pointer', color:'var(--text-primary)', fontSize:13, fontWeight:600 }}>
          <Clock size={14} color="var(--yellow)" />
          {sessaoAtual ? (() => {
            const ts = sessaoAtual.criadoEm?.toMillis?.()
            const hr = ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : null
            return `${sessaoAtual.data}${hr ? ` · upload ${hr}` : ''} · ${sessaoAtual.totalDocas} docas`
          })() : 'Selecionar sessão'}
          <ChevronDown size={14} color="var(--text-muted)" />
        </button>
        {onNovaUpload && (
          <button onClick={onNovaUpload} style={{ background:'var(--yellow-dim)', border:'1px solid var(--yellow)', borderRadius:8, padding:'8px 12px', cursor:'pointer', color:'var(--yellow)', fontSize:12, fontWeight:700 }}>
            + Novo upload
          </button>
        )}
      </div>

      {aberto && (
        <div style={{ position:'absolute', top:44, left:0, zIndex:100, minWidth:300, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
            Sessões disponíveis (últimas 5)
          </div>
          {sessoes.map(s => {
            const ativa    = s.id === sessaoId
            const ts       = s.criadoEm?.toMillis?.()
            const hrUpload = ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : null
            // Compara data da sessão com hoje (formato dd/mm/yyyy)
            const agora    = new Date().toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo' })
            const hoje     = agora.split(',')[0].trim() // pega só dd/mm/yyyy
            // Normaliza ambas para dd/mm/yyyy com zero à esquerda
            const normalizar = d => d ? d.split('/').map((p,i) => i<2 ? p.padStart(2,'0') : p).join('/') : ''
            const antiga   = s.data && normalizar(s.data) !== normalizar(hoje)
            return (
              <div key={s.id} onClick={() => { onSelecionar(s.id); setAberto(false) }}
                style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: ativa ? 'var(--yellow-dim)' : 'transparent', transition:'background 0.15s' }}
                onMouseEnter={e => !ativa && (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => !ativa && (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color: ativa ? 'var(--yellow)' : 'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
                      {antiga ? '⚠️' : '📅'} {s.data}
                      {hrUpload && <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:400 }}>upload {hrUpload}</span>}
                    </div>
                    <div style={{ fontSize:11, color: antiga ? 'var(--orange)' : 'var(--text-muted)', marginTop:3 }}>
                      {s.totalDocas} docas · por {s.criadoPor?.split('@')[0]}
                      {antiga && ' · DIA ANTERIOR'}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {ativa && <span style={{ fontSize:10, background:'var(--yellow)', color:'#1a1a1a', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>ATIVA</span>}
                    {onRemover && (
                      <button onClick={e => { e.stopPropagation(); if (confirm(`Remover sessão de ${s.data} (upload ${hrUpload||''})?\nAs docas serão apagadas.`)) { onRemover(s.id); setAberto(false) } }}
                        style={{ background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:6, padding:'4px 8px', cursor:'pointer', color:'var(--red)', display:'flex', alignItems:'center' }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {aberto && <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={() => setAberto(false)} />}
    </div>
  )
}

export default function EntradaDados({ usuario, conferentes=[], onDadosSalvos, tokenFCMExpirado, onRenovarToken }) {
  const {
    sessoes, sessao, sessaoId, docas, carregando,
    criarSessao, selecionarSessao,
    iniciarDoca, atualizarDoca, finalizarDoca, encerrarSessao,
    sessoesDiaAnterior,
  } = useSessao(usuario)

  const [tela, setTela]               = useState('lista')
  const [docaAtiva, setDocaAtiva]     = useState(null)
  const [valLocal, setValLocal]       = useState({})
  const [erro, setErro]               = useState('')
  const [salvando, setSalvando]       = useState(false)
  const [dragOver, setDragOver]       = useState(false)
  const [processando, setProcessando] = useState(false)
  const [mostrarUpload, setMostrarUpload] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState(null) // 'salvando' | 'salvo' | 'erro'
  const autoSaveTimer = useRef(null)

  const ehFiscal    = usuario?.perfil === 'FISCAL'
  const confsAtivos = conferentes.filter(c => c.ativo)

  // ── PROTEÇÃO 1: Alerta sessões do dia anterior ────────────
  const sessoesAntigas = sessoesDiaAnterior?.() || []

  // ── PROTEÇÃO 3: Auto-save ao mudar campos ─────────────────
  const autoSave = useCallback(async (campos) => {
    if (!docaAtiva || !sessaoId) return
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('salvando')
        await atualizarDoca(docaAtiva, campos)
        setAutoSaveStatus('salvo')
        setTimeout(() => setAutoSaveStatus(null), 2000)
      } catch {
        setAutoSaveStatus('erro')
      }
    }, 1500) // debounce 1.5s
  }, [docaAtiva, sessaoId, atualizarDoca])

  // Ao mudar valLocal durante validação, auto-salva os campos preenchidos
  useEffect(() => {
    if (tela !== 'validar' || !docaAtiva) return
    const campos = {}
    if (valLocal.pendExp    !== '' && valLocal.pendExp    != null) campos.pendExp    = Number(valLocal.pendExp)
    if (valLocal.pendFrente !== '' && valLocal.pendFrente != null) campos.pendFrente = Number(valLocal.pendFrente)
    if (valLocal.pendDentro !== '' && valLocal.pendDentro != null) campos.pendDentro = Number(valLocal.pendDentro)
    if (valLocal.logExp     !== '' && valLocal.logExp     != null) campos.logExp     = Number(valLocal.logExp)
    if (valLocal.logFrente  !== '' && valLocal.logFrente  != null) campos.logFrente  = Number(valLocal.logFrente)
    if (valLocal.logDentro  !== '' && valLocal.logDentro  != null) campos.logDentro  = Number(valLocal.logDentro)
    if (valLocal.observacao != null) campos.observacao = valLocal.observacao
    if (Object.keys(campos).length > 0) autoSave(campos)
  }, [valLocal.pendExp, valLocal.pendFrente, valLocal.pendDentro, valLocal.logExp, valLocal.logFrente, valLocal.logDentro, valLocal.observacao])

  async function processarArquivo(file) {
    setErro(''); setProcessando(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type:'binary', cellDates:false })
        const nome = wb.SheetNames.find(n => n.trim() === '121')
        if (!nome) { setErro('Aba "121" não encontrada.'); setProcessando(false); return }
        const ws   = wb.Sheets[nome]
        const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null, raw:true })
        const data = rows.slice(2).filter(r => r?.[COL.DOCA] != null && String(r[COL.DOCA]).trim() !== '')
        const vistas = new Set()
        const docasBase = []
        for (const r of data) {
          const doca = String(r[COL.DOCA]).trim()
          if (!vistas.has(doca)) {
            vistas.add(doca)
            const horario = formatarHorario(r[COL.HORARIO])
            docasBase.push({
              doca,
              remessa:    String(r[COL.REMESSA]    || '').trim(),
              data:       formatarData(r[COL.DATA]),
              horario,
              gpp:        String(r[COL.GPP]        || '').trim(),
              nomeFilial: String(r[COL.NOME_FILIAL] || '').trim(),
              loja:       String(r[COL.LOJA]        || '').trim(),
              supervisor: detectarSupervisor(r[COL.HORARIO]),
              turno:      detectarSupervisor(r[COL.HORARIO]) === 'Virginia' ? '1º Turno' : '2º Turno',
            })
          }
        }
        if (docasBase.length === 0) { setErro('Nenhuma doca encontrada.'); setProcessando(false); return }
        await criarSessao(docasBase)
        setMostrarUpload(false)
        setTela('lista')
      } catch (err) {
        console.error(err)
        setErro(err.message || 'Erro ao processar arquivo.')
      }
      setProcessando(false)
    }
    reader.readAsBinaryString(file)
  }

  async function handleIniciar(doca) {
    if (!valLocal.conferente) { setErro('Selecione um fiscal de prevenção antes de iniciar.'); return }
    setErro('')
    try {
      await iniciarDoca(doca.doca, valLocal.conferente, horarioAtual())
      setValLocal({ conferente: valLocal.conferente, cargaCertificada: false })
      setDocaAtiva(doca.doca)
      setTela('validar')
    } catch (err) { setErro(err.message) }
  }

  function handleContinuar(doca) {
    setDocaAtiva(doca.doca)
    setValLocal({
      conferente: doca.conferente,
      pendExp: doca.pendExp ?? '', pendFrente: doca.pendFrente ?? '', pendDentro: doca.pendDentro ?? '',
      logExp: doca.logExp ?? '0', logFrente: doca.logFrente ?? '0', logDentro: doca.logDentro ?? '0',
      hrLiberado: doca.hrLiberado || '', observacao: doca.observacao || '',
      cargaCertificada: doca.cargaCertificada || false,
    })
    setTela('validar')
  }

  async function handleFinalizar() {
    const docaObj  = docas.find(d => d.doca === docaAtiva)
    const agora    = horarioAtual()
    const pExp     = Number(valLocal.pendExp || 0)
    const pFrente  = Number(valLocal.pendFrente || 0)
    const pDentro  = Number(valLocal.pendDentro || 0)
    const resultado = pExp - pFrente - pDentro
    const lExp     = Number(valLocal.logExp || 0)
    const lFrente  = Number(valLocal.logFrente || 0)
    const lDentro  = Number(valLocal.logDentro || 0)
    const logResult = lExp - lFrente - lDentro
    const obsPartes = [valLocal.cargaCertificada ? 'CARGA CERTIFICADA' : '', valLocal.observacao || ''].filter(Boolean)
    let novoStatus = 'CONCLUIDO', tsAlerta = null
    if (logResult >= 1 || resultado >= 5) { novoStatus = 'AGUARD_GERENTE'; tsAlerta = new Date() }
    else if (resultado >= 3)              { novoStatus = 'AGUARD_COORD';   tsAlerta = new Date() }
    try {
      await finalizarDoca(docaAtiva, {
        status: novoStatus, hrFim: agora, hrValidado: agora,
        valDoca: calcularTempo(docaObj?.hrInicio, agora),
        pendExp: pExp, pendFrente: pFrente, pendDentro: pDentro,
        logExp: lExp, logFrente: lFrente, logDentro: lDentro,
        hrLiberado: valLocal.hrLiberado || '',
        observacao: obsPartes.join(' - '),
        cargaCertificada: valLocal.cargaCertificada || false,
        resultado, tsAlerta,
      })
      clearTimeout(autoSaveTimer.current)
      setDocaAtiva(null); setValLocal({}); setTela('lista')
    } catch (err) { setErro('Erro ao finalizar: ' + err.message) }
  }

  async function encerrarSessaoById(id) {
    try {
      const { getDocs, collection: col, deleteDoc: del, doc: d } = await import('firebase/firestore')
      const { db: db_ } = await import('./firebase')
      const snaps = await getDocs(col(db_, 'docas'))
      await Promise.all(snaps.docs.filter(x => x.data().sessaoId === id).map(x => del(x.ref)))
      await del(d(db_, 'sessoes', id))
    } catch (err) { alert('Erro ao remover: ' + err.message) }
  }

  async function salvarNoSheets() {
    setSalvando(true); setErro('')
    try {
      const hoje    = sessao?.data || new Date().toLocaleDateString('pt-BR', { timeZone:'America/Sao_Paulo' })
      const abaHoje = hoje.split('/').reverse().join('-')
      const docasSalvar = docas.filter(d => ['CONCLUIDO','AGUARD_COORD','ESCALADO','AGUARD_GERENTE'].includes(d.status))
      const linhas = docasSalvar.map(d => [
        d.data||hoje, d.doca, d.remessa, d.horario, d.valDoca||'',
        d.pendExp||0, d.pendFrente||0, d.pendDentro||0,
        d.logExp||0, d.logFrente||0, d.logDentro||0,
        d.hrValidado||'', d.conferente||'', d.hrLiberado||'',
        d.supervisor||'', d.gpp||'', '', '', d.turno||'',
        d.observacao||'', d.resultado||0,
        d.hrLiberado ? 'SIM' : (d.resultado||0) <= 0 ? 'SIM' : 'NÃO',
        (d.resultado||0) <= 0 ? 'VALIDADO' : 'PENDENTE', '',
      ])
      const res = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method:'POST', headers:{'Content-Type':'text/plain'},
        body: JSON.stringify({ abaHoje, linhas }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.erro || 'Erro ao salvar')
      setTela('sucesso'); if (onDadosSalvos) onDadosSalvos()
    } catch (e) { setErro(`Erro ao salvar: ${e.message}`) }
    setSalvando(false)
  }

  function TelaUpload({ onCancelar }) {
    return (
      <div style={{ maxWidth:560, margin:'0 auto', padding:'0 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          {onCancelar && <button onClick={onCancelar} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', cursor:'pointer', color:'var(--text-muted)', fontSize:12 }}>← Voltar</button>}
          <div>
            <h2 style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>Nova sessão</h2>
            <p style={{ fontSize:13, color:'var(--text-secondary)' }}>Upload do arquivo de composição.</p>
          </div>
        </div>
        <div onDrop={e => { e.preventDefault(); setDragOver(false); processarArquivo(e.dataTransfer.files[0]) }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('fi').click()}
          style={{ border:`2px dashed ${dragOver ? 'var(--yellow)' : 'var(--border)'}`, borderRadius:16, padding:'48px 24px', textAlign:'center', cursor: processando ? 'not-allowed' : 'pointer', background: dragOver ? 'var(--yellow-dim)' : 'var(--bg-card)', transition:'all 0.2s' }}>
          <input id="fi" type="file" accept=".xlsm,.xlsx,.xls" onChange={e => processarArquivo(e.target.files[0])} style={{ display:'none' }} disabled={processando} />
          {processando ? (
            <><div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'var(--yellow)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 14px' }} /><div style={{ fontSize:14, color:'var(--yellow)' }}>Processando...</div></>
          ) : (
            <><FileSpreadsheet size={48} color={dragOver ? 'var(--yellow)' : 'var(--text-muted)'} style={{ marginBottom:14 }} /><div style={{ fontSize:15, fontWeight:700, marginBottom:6, color: dragOver ? 'var(--yellow)' : 'var(--text-primary)' }}>Arraste ou clique para selecionar</div><div style={{ fontSize:12, color:'var(--text-muted)' }}>Aceita: .xlsm, .xlsx — aba "121"</div></>
          )}
        </div>
        {erro && <div style={{ marginTop:14, background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:10, padding:'12px 16px', color:'var(--red)', fontSize:13 }}>⚠️ {erro}</div>}
      </div>
    )
  }

  if (carregando) return (
    <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
      <div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'var(--yellow)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 14px' }} />
      <div style={{ fontSize:13 }}>Verificando sessões...</div>
    </div>
  )

  if (tela === 'sucesso') return (
    <div style={{ maxWidth:480, margin:'64px auto', textAlign:'center', padding:'0 16px' }}>
      <div style={{ width:80, height:80, background:'var(--green-dim)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}><CheckCircle size={40} color="var(--green)" /></div>
      <h2 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>Dados salvos!</h2>
      <p style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:32, lineHeight:1.6 }}>Docas registradas no Google Sheets com sucesso.</p>
      <button onClick={() => setTela('lista')} style={{ background:'var(--yellow)', border:'none', borderRadius:10, padding:'14px 32px', cursor:'pointer', fontSize:14, fontWeight:800, color:'#1a1a1a' }}>Voltar</button>
    </div>
  )

  if (sessoes.length === 0 || mostrarUpload) {
    if (!ehFiscal && sessoes.length === 0) return (
      <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
        <Clock size={48} style={{ marginBottom:16, opacity:0.4 }} />
        <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>Aguardando sessão do dia</div>
        <div style={{ fontSize:13 }}>O fiscal de prevenção ainda não fez o upload do arquivo de hoje.</div>
      </div>
    )
    return <TelaUpload onCancelar={sessoes.length > 0 ? () => setMostrarUpload(false) : null} />
  }

  // ── VALIDAÇÃO ─────────────────────────────────────────────
  if (tela === 'validar' && docaAtiva) {
    const docaObj     = docas.find(d => d.doca === docaAtiva)
    const pExp        = Number(valLocal.pendExp || 0)
    const pFrente     = Number(valLocal.pendFrente || 0)
    const pDentro     = Number(valLocal.pendDentro || 0)
    const resultado   = pExp - pFrente - pDentro
    const preenchido  = valLocal.conferente && valLocal.pendExp !== '' && valLocal.pendFrente !== '' && valLocal.pendDentro !== ''
    const lExp        = Number(valLocal.logExp || 0)
    const lFrente     = Number(valLocal.logFrente || 0)
    const lDentro     = Number(valLocal.logDentro || 0)
    const logResult   = lExp - lFrente - lDentro
    const logPreench  = valLocal.logExp !== '' && valLocal.logFrente !== '' && valLocal.logDentro !== ''
    const alertaGerente = resultado >= 5 || (logPreench && logResult >= 1)
    const alertaCoord   = !alertaGerente && resultado >= 3
    const podeLiberar   = preenchido && logPreench && !alertaGerente && !alertaCoord
    const podeSolicitar = preenchido && logPreench && (alertaGerente || alertaCoord)
    const corRes        = alertaGerente ? 'var(--red)' : alertaCoord ? 'var(--yellow)' : 'var(--green)'

    return (
      <div style={{ maxWidth:680, margin:'0 auto', padding:'0 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={() => { clearTimeout(autoSaveTimer.current); setDocaAtiva(null); setTela('lista') }} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', cursor:'pointer', color:'var(--text-muted)', fontSize:12 }}>← Lista</button>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:18, fontWeight:800 }}>Doca {docaObj?.doca} — {docaObj?.nomeFilial}</h2>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>Iniciado às {docaObj?.hrInicio} · {sessao?.data}</p>
              {/* PROTEÇÃO 3: indicador de auto-save */}
              {autoSaveStatus === 'salvando' && <span style={{ fontSize:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3 }}><RefreshCw size={10} style={{ animation:'spin 1s linear infinite' }} /> Salvando...</span>}
              {autoSaveStatus === 'salvo'    && <span style={{ fontSize:10, color:'var(--green)' }}>✓ Salvo</span>}
              {autoSaveStatus === 'erro'     && <span style={{ fontSize:10, color:'var(--red)' }}>⚠ Erro ao salvar</span>}
            </div>
          </div>
        </div>

        <div style={{ background:'var(--bg-card)', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ background:'var(--bg-secondary)', padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Dados do arquivo</div>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {[
                { label:'Remessa',   val: docaObj?.remessa },
                { label:'Horário',   val: docaObj?.horario },
                { label:'Supervisor',val: docaObj?.supervisor, cor: docaObj?.supervisor==='Virginia' ? 'var(--blue)' : 'var(--orange)' },
                { label:'Turno',     val: docaObj?.turno },
                { label:'GPP',       val: docaObj?.gpp },
                { label:'Hr Inicio', val: docaObj?.hrInicio, cor:'var(--green)' },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.5px' }}>{item.label}</div>
                  <div style={{ fontSize:13, fontWeight:600, color: item.cor || 'var(--text-primary)' }}>{item.val || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:'16px' }}>
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>Fiscal de Prevenção <span style={{ color:'var(--yellow)' }}>*</span></label>
              {confsAtivos.length === 0 ? <p style={{ fontSize:13, color:'var(--red)' }}>⚠️ Nenhum fiscal cadastrado.</p> : (
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {confsAtivos.map(c => (
                    <button key={c.id} onClick={() => setValLocal(p => ({ ...p, conferente: c.nome }))}
                      disabled={docaObj?.status==='EM_ANDAMENTO' && docaObj?.conferente !== c.nome}
                      style={{ padding:'8px 14px', borderRadius:20, border:`1px solid ${valLocal.conferente===c.nome ? 'var(--yellow)' : 'var(--border)'}`, background: valLocal.conferente===c.nome ? 'var(--yellow)' : 'var(--bg-secondary)', color: valLocal.conferente===c.nome ? '#1a1a1a' : 'var(--text-secondary)', cursor:'pointer', fontSize:13, fontWeight: valLocal.conferente===c.nome ? 700 : 400, opacity: docaObj?.status==='EM_ANDAMENTO' && docaObj?.conferente && docaObj?.conferente!==c.nome ? 0.3 : 1 }}>
                      {c.nome} <span style={{ fontSize:10, opacity:0.6 }}>{c.turno}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>Pendências</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:12 }}>
              <div><Campo label="Pend. Expedição" valor={valLocal.pendExp} onChange={v => setValLocal(p => ({...p,pendExp:v}))} required /><div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>Total na doca</div></div>
              <div><Campo label="Frente Doca" valor={valLocal.pendFrente} onChange={v => setValLocal(p => ({...p,pendFrente:v}))} required /><div style={{ fontSize:10, color:'var(--green)', marginTop:3 }}>Localizado frente</div></div>
              <div><Campo label="Dentro Doca" valor={valLocal.pendDentro} onChange={v => setValLocal(p => ({...p,pendDentro:v}))} required /><div style={{ fontSize:10, color:'var(--green)', marginTop:3 }}>Localizado dentro</div></div>
            </div>

            {valLocal.pendExp!=='' && valLocal.pendFrente!=='' && valLocal.pendDentro!=='' && (
              <div style={{ background:'var(--bg-secondary)', borderRadius:10, padding:'12px 16px', marginBottom:12, border:`1px solid ${corRes}44` }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>{pExp} − {pFrente} − {pDentro} =</span>
                    <span style={{ fontSize:28, fontWeight:900, color:corRes }}>{resultado}</span>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>resultado</span>
                  </div>
                  {resultado < 3 && <span style={{ fontSize:11, color:'var(--green)', background:'var(--green-dim)', padding:'3px 10px', borderRadius:20, fontWeight:700 }}>✅ Liberar</span>}
                  {resultado >= 3 && resultado < 5 && <div style={{ background:'var(--orange-dim)', border:'1px solid var(--orange)', borderRadius:8, padding:'5px 10px' }}><div style={{ fontSize:11, color:'var(--orange)', fontWeight:700 }}>⚠️ Requer coordenador (5 min → gerente)</div></div>}
                  {resultado >= 5 && <div style={{ background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:8, padding:'5px 10px' }}><div style={{ fontSize:11, color:'var(--red)', fontWeight:700 }}>🚨 Requer gerente</div></div>}
                </div>
              </div>
            )}

            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>Log localizado</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:12 }}>
              <div><Campo label="Log Expedição" valor={valLocal.logExp}    onChange={v => setValLocal(p => ({...p,logExp:v}))} /><div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>Total no log</div></div>
              <div><Campo label="Log Frente"    valor={valLocal.logFrente} onChange={v => setValLocal(p => ({...p,logFrente:v}))} /><div style={{ fontSize:10, color:'var(--green)', marginTop:3 }}>Localizado frente</div></div>
              <div><Campo label="Log Dentro"    valor={valLocal.logDentro} onChange={v => setValLocal(p => ({...p,logDentro:v}))} /><div style={{ fontSize:10, color:'var(--green)', marginTop:3 }}>Localizado dentro</div></div>
            </div>

            {logPreench && (
              <div style={{ background:'var(--bg-secondary)', borderRadius:10, padding:'12px 16px', marginBottom:16, border:`1px solid ${logResult>=1?'var(--red)':'var(--green)'}44` }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>{lExp} − {lFrente} − {lDentro} =</span>
                    <span style={{ fontSize:24, fontWeight:900, color: logResult>=1?'var(--red)':'var(--green)' }}>{logResult}</span>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>log resultado</span>
                  </div>
                  {logResult===0 && <span style={{ fontSize:11, color:'var(--green)', background:'var(--green-dim)', padding:'3px 10px', borderRadius:20, fontWeight:700 }}>✅ Log ok</span>}
                  {logResult>=1  && <div style={{ background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:8, padding:'5px 10px' }}><div style={{ fontSize:11, color:'var(--red)', fontWeight:700 }}>🚨 Log com divergência — requer gerente</div></div>}
                </div>
              </div>
            )}

            <div style={{ marginBottom:16 }}><Campo label="Hr Liberado" valor={valLocal.hrLiberado} onChange={v => setValLocal(p => ({...p,hrLiberado:v}))} type="text" placeholder="Ex: 22:05" /></div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>Tipo de carga</label>
              <button type="button" onClick={() => setValLocal(p => ({...p,cargaCertificada:!p.cargaCertificada}))}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:14, background: valLocal.cargaCertificada?'var(--green-dim)':'var(--bg-secondary)', border:`2px solid ${valLocal.cargaCertificada?'var(--green)':'var(--border)'}`, borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'all 0.2s', textAlign:'left' }}>
                <div style={{ width:24, height:24, borderRadius:6, flexShrink:0, border:`2px solid ${valLocal.cargaCertificada?'var(--green)':'var(--border)'}`, background: valLocal.cargaCertificada?'var(--green)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                  {valLocal.cargaCertificada && <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <ShieldCheck size={16} color={valLocal.cargaCertificada?'var(--green)':'var(--text-muted)'} />
                    <span style={{ fontSize:14, fontWeight:700, color: valLocal.cargaCertificada?'var(--green)':'var(--text-primary)' }}>Carga Certificada</span>
                    {valLocal.cargaCertificada && <span style={{ fontSize:11, background:'var(--green)', color:'#fff', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>ATIVO</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{valLocal.cargaCertificada ? 'Será registrado "CARGA CERTIFICADA" na observação' : 'Marque se esta remessa possui certificação'}</div>
                </div>
              </button>
            </div>

            <div style={{ marginBottom:16 }}>
              <Campo label="Observação" valor={valLocal.observacao} onChange={v => setValLocal(p => ({...p,observacao:v}))} type="text" placeholder={valLocal.cargaCertificada ? 'Ex: volume extra...' : 'Opcional...'} />
              {valLocal.cargaCertificada && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Será salvo como: <strong style={{ color:'var(--green)' }}>CARGA CERTIFICADA{valLocal.observacao ? ` - ${valLocal.observacao}` : ''}</strong></div>}
            </div>

            {erro && <div style={{ background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:8, padding:'10px 14px', marginBottom:14, color:'var(--red)', fontSize:13 }}>⚠️ {erro}</div>}

            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10 }}>
              {podeLiberar   && <button onClick={handleFinalizar} style={{ padding:'14px', borderRadius:10, border:'none', background:'var(--green)', color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><CheckCircle size={18} /> Liberar doca</button>}
              {podeSolicitar && <button onClick={handleFinalizar} style={{ padding:'14px', borderRadius:10, border:'none', background: alertaGerente?'var(--red)':'var(--orange)', color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><Send size={18} />{alertaGerente ? (logResult>=1&&resultado<5 ? 'Solicitar — Gerente (divergência no log)' : 'Solicitar — Gerente') : 'Solicitar — Coordenador'}</button>}
              {!preenchido   && <button disabled style={{ padding:'14px', borderRadius:10, border:'none', background:'var(--border)', color:'var(--text-muted)', fontWeight:800, fontSize:15, cursor:'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><Timer size={18} /> Preencha todos os campos</button>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LISTA ─────────────────────────────────────────────────
  const counts = {
    pendente:    docas.filter(d => d.status==='PENDENTE').length,
    emAndamento: docas.filter(d => d.status==='EM_ANDAMENTO').length,
    aguardando:  docas.filter(d => ['AGUARD_COORD','ESCALADO','AGUARD_GERENTE'].includes(d.status)).length,
    concluido:   docas.filter(d => d.status==='CONCLUIDO').length,
  }
  const prontas = docas.filter(d => ['CONCLUIDO','AGUARD_COORD','ESCALADO','AGUARD_GERENTE'].includes(d.status))

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'0 0 80px' }}>

      {/* PROTEÇÃO 1: Alerta sessões do dia anterior */}
      {sessoesAntigas.length > 0 && (
        <div style={{ background:'var(--orange-dim)', border:'1px solid var(--orange)', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <AlertTriangle size={18} color="var(--orange)" style={{ flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--orange)' }}>Sessões de dias anteriores ativas</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
              {sessoesAntigas.map(s => s.data).join(', ')} — verifique se há docas pendentes antes de iniciar o dia de hoje.
            </div>
          </div>
        </div>
      )}

      {/* PROTEÇÃO 4: Alerta token FCM expirado */}
      {tokenFCMExpirado && (
        <div style={{ background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <AlertTriangle size={18} color="var(--red)" style={{ flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--red)' }}>Notificações desativadas</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>Token de notificação expirado. Clique para renovar.</div>
          </div>
          <button onClick={onRenovarToken} style={{ background:'var(--red)', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <RefreshCw size={13} /> Renovar
          </button>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>Validação de Docas</h2>
          <SeletorSessoes sessoes={sessoes} sessaoId={sessaoId} onSelecionar={selecionarSessao}
            onNovaUpload={ehFiscal ? () => setMostrarUpload(true) : null}
            onRemover={ehFiscal ? encerrarSessaoById : null} />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {ehFiscal && sessao && (
            <button onClick={() => { if (confirm('Encerrar esta sessão?')) encerrarSessao() }}
              style={{ background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:8, padding:'8px 12px', cursor:'pointer', color:'var(--red)', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
              <Trash2 size={13} /> Encerrar
            </button>
          )}
          {prontas.length > 0 && (ehFiscal || ['COORDENADOR','GERENTE'].includes(usuario?.perfil)) && (
            <button onClick={() => setTela('confirmacao')} style={{ background:'var(--yellow)', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', color:'#1a1a1a', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
              <Save size={14} /> Salvar ({prontas.length})
            </button>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, marginBottom:14 }}>
        {[
          { label:'Pendentes',    val:counts.pendente,    cor:'var(--text-muted)' },
          { label:'Em andamento', val:counts.emAndamento, cor:'var(--yellow)' },
          { label:'Aguardando',   val:counts.aguardando,  cor:'var(--orange)' },
          { label:'Concluídas',   val:counts.concluido,   cor:'var(--green)' },
        ].map((s, i) => (
          <div key={i} style={{ background:'var(--bg-card)', borderRadius:10, padding:'12px 10px', border:'1px solid var(--border)', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:s.cor }}>{s.val}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {!docaAtiva && (
        <div style={{ background:'var(--bg-card)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--border)', marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>Qual fiscal vai validar?</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {confsAtivos.map(c => (
              <button key={c.id} onClick={() => setValLocal(p => ({...p,conferente:c.nome}))} style={{ padding:'8px 14px', borderRadius:20, border:`1px solid ${valLocal.conferente===c.nome?'var(--yellow)':'var(--border)'}`, background: valLocal.conferente===c.nome?'var(--yellow)':'var(--bg-secondary)', color: valLocal.conferente===c.nome?'#1a1a1a':'var(--text-secondary)', cursor:'pointer', fontSize:13, fontWeight: valLocal.conferente===c.nome?700:400 }}>{c.nome}</button>
            ))}
          </div>
        </div>
      )}

      {erro && <div style={{ background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:10, padding:'12px 16px', marginBottom:12, color:'var(--red)', fontSize:13 }}>⚠️ {erro}</div>}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {docas.length === 0 ? (
          <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
            <Clock size={40} style={{ marginBottom:12, opacity:0.3 }} />
            <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>Nenhuma doca nesta sessão</div>
          </div>
        ) : docas.map(d => {
          const inf      = INFO_ST[d.status] || INFO_ST.PENDENTE
          const minha    = d.conferente === valLocal.conferente
          const borderCor = ['AGUARD_GERENTE','ESCALADO'].includes(d.status) ? 'var(--red)' : d.status==='AGUARD_COORD' ? 'var(--orange)' : d.status==='EM_ANDAMENTO' ? 'var(--yellow)' : 'var(--border)'
          return (
            <div key={d.doca} style={{ background:'var(--bg-card)', borderRadius:12, border:`1px solid ${borderCor}` }}>
              <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ background:'var(--yellow-dim)', borderRadius:8, padding:'6px 12px', minWidth:56, textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontSize:9, color:'var(--yellow)', fontWeight:700 }}>DOCA</div>
                  <div style={{ fontSize:20, fontWeight:900, color:'var(--yellow)', lineHeight:1 }}>{d.doca}</div>
                </div>
                <div style={{ flex:1, minWidth:150 }}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:3, display:'flex', alignItems:'center', gap:6 }}>
                    {d.nomeFilial||d.remessa}
                    {d.cargaCertificada && <span style={{ fontSize:10, background:'var(--green-dim)', color:'var(--green)', padding:'1px 6px', borderRadius:20, fontWeight:700, display:'flex', alignItems:'center', gap:3 }}><ShieldCheck size={10} /> Certificada</span>}
                  </div>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3 }}><Clock size={10} />{d.horario}</span>
                    <span style={{ fontSize:11, color: d.supervisor==='Virginia'?'var(--blue)':'var(--orange)', fontWeight:600 }}>{d.supervisor}</span>
                    {d.conferente && <span style={{ fontSize:11, color:'var(--text-muted)' }}>👤 {d.conferente}</span>}
                    {d.resultado!=null && <span style={{ fontSize:11, fontWeight:700, color: d.resultado>=5?'var(--red)':d.resultado>=3?'var(--yellow)':'var(--green)' }}>Resultado: {d.resultado}</span>}
                  </div>
                </div>
                {d.status==='AGUARD_COORD' && d.tsAlerta && <Countdown tsAlerta={d.tsAlerta} onExpirar={() => atualizarDoca(d.doca, { status:'ESCALADO', tsEscalada:new Date() })} />}
                <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:inf.bg, color:inf.color, flexShrink:0, whiteSpace:'nowrap' }}>{inf.label}</span>
                {d.status==='PENDENTE'      && valLocal.conferente && <button onClick={() => handleIniciar(d)} style={{ background:'var(--yellow)', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', color:'#1a1a1a', fontWeight:700, fontSize:12, flexShrink:0 }}><Play size={12} style={{ display:'inline', marginRight:4 }} />Iniciar</button>}
                {d.status==='EM_ANDAMENTO'  && minha  && <button onClick={() => handleContinuar(d)} style={{ background:'var(--yellow-dim)', border:'1px solid var(--yellow)', borderRadius:8, padding:'8px 14px', cursor:'pointer', color:'var(--yellow)', fontWeight:700, fontSize:12, flexShrink:0 }}>Continuar →</button>}
                {d.status==='EM_ANDAMENTO'  && !minha && <span style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic' }}>Em validação</span>}
                {d.status==='CONCLUIDO'     && <CheckCircle size={18} color="var(--green)" />}
                {['ESCALADO','AGUARD_GERENTE'].includes(d.status) && <Lock size={16} color="var(--red)" />}
              </div>
            </div>
          )
        })}
      </div>

      {tela === 'confirmacao' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--bg-card)', borderRadius:16, padding:24, maxWidth:500, width:'100%', maxHeight:'80vh', overflowY:'auto' }}>
            <h3 style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>Confirmar e salvar</h3>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>{prontas.length} doca(s) de {sessao?.data} serão salvas no Google Sheets.</p>
            {prontas.map((d, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13, gap:8 }}>
                <span style={{ fontWeight:700, color:'var(--yellow)' }}>Doca {d.doca}</span>
                <span style={{ color:'var(--text-muted)', fontSize:12 }}>{d.conferente}</span>
                {d.cargaCertificada && <span style={{ fontSize:10, background:'var(--green-dim)', color:'var(--green)', padding:'1px 6px', borderRadius:20, fontWeight:700 }}>Cert.</span>}
                <span style={{ fontWeight:700, color:(d.resultado||0)>=5?'var(--red)':(d.resultado||0)>=3?'var(--yellow)':'var(--green)' }}>{d.resultado??0} pend.</span>
              </div>
            ))}
            {erro && <div style={{ background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:8, padding:'10px', marginTop:14, color:'var(--red)', fontSize:13 }}>⚠️ {erro}</div>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:20 }}>
              <button onClick={() => setTela('lista')} style={{ padding:'12px', borderRadius:10, border:'1px solid var(--border)', background:'none', cursor:'pointer', color:'var(--text-primary)', fontWeight:600 }}>Voltar</button>
              <button onClick={salvarNoSheets} disabled={salvando} style={{ padding:'12px', borderRadius:10, border:'none', background: salvando?'var(--border)':'var(--yellow)', color: salvando?'var(--text-muted)':'#1a1a1a', fontWeight:800, cursor: salvando?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Save size={16} />{salvando ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}