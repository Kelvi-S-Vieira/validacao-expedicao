import { useState, useEffect } from 'react'
import { FileSpreadsheet, Play, CheckCircle, Clock, AlertTriangle, User, ChevronRight, Save, RotateCcw, Upload, Lock, Timer, Send } from 'lucide-react'
import * as XLSX from 'xlsx-js-style'

// ─── Colunas da aba "121" (base 0) ───────────────────────
const COL = {
  DOCA:        13,
  REMESSA:     14,
  DATA:        20,
  HORARIO:     24, // coluna 25 conforme solicitado
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
  if (val instanceof Date) return val.toLocaleDateString('pt-BR')
  return String(val)
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
  return `${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`
}

function segundosDesde(ts) {
  if (!ts) return Infinity
  return Math.floor((Date.now() - ts) / 1000)
}

// ─── Status das docas ─────────────────────────────────────
const ST = {
  PENDENTE:       'PENDENTE',
  EM_ANDAMENTO:   'EM_ANDAMENTO',
  AGUARD_COORD:   'AGUARD_COORD',
  ESCALADO:       'ESCALADO',
  AGUARD_GERENTE: 'AGUARD_GERENTE',
  CONCLUIDO:      'CONCLUIDO',
}

const INFO_ST = {
  PENDENTE:       { bg: 'var(--bg-secondary)',  color: 'var(--text-muted)',   label: 'Pendente' },
  EM_ANDAMENTO:   { bg: 'var(--yellow-dim)',    color: 'var(--yellow)',       label: 'Em andamento' },
  AGUARD_COORD:   { bg: 'var(--orange-dim)',    color: 'var(--orange)',       label: 'Aguard. coordenador' },
  ESCALADO:       { bg: 'var(--red-dim)',       color: '#f97316',             label: 'Escalado → gerente' },
  AGUARD_GERENTE: { bg: 'var(--red-dim)',       color: 'var(--red)',          label: 'Aguard. gerente' },
  CONCLUIDO:      { bg: 'var(--green-dim)',     color: 'var(--green)',        label: 'Concluído' },
}

const S = {
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
  },
}

function Campo({ label, valor, onChange, type = 'number', min = '0', readOnly, required, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}{required && <span style={{ color: 'var(--yellow)', marginLeft: 2 }}>*</span>}
      </label>
      <input type={type} value={valor} readOnly={readOnly} placeholder={placeholder}
        onChange={e => onChange && onChange(e.target.value)} min={min} required={required}
        style={{ ...S.input, background: readOnly ? 'var(--bg-secondary)' : 'var(--bg-primary)', cursor: readOnly ? 'default' : 'text' }}
        onFocus={e => !readOnly && (e.target.style.borderColor = 'var(--yellow)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )
}

// Countdown visual regressivo
function Countdown({ tsInicio, duracaoSeg, onExpirar }) {
  const [restante, setRestante] = useState(Math.max(0, duracaoSeg - segundosDesde(tsInicio)))

  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, duracaoSeg - segundosDesde(tsInicio))
      setRestante(r)
      if (r <= 0) { clearInterval(t); onExpirar && onExpirar() }
    }, 1000)
    return () => clearInterval(t)
  }, [tsInicio, duracaoSeg])

  const min = Math.floor(restante / 60)
  const seg = restante % 60
  const pct = Math.max(0, (restante / duracaoSeg) * 100)

  return (
    <div style={{ background: 'var(--orange-dim)', border: '1px solid var(--orange)', borderRadius: 10, padding: '8px 14px', minWidth: 200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600 }}>Escala gerente em</span>
        <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--orange)', fontFamily: 'monospace' }}>
          {String(min).padStart(2, '0')}:{String(seg).padStart(2, '0')}
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--orange-dim)', borderRadius: 2 }}>
        <div style={{ height: '100%', background: 'var(--orange)', borderRadius: 2, width: `${pct}%`, transition: 'width 1s linear' }} />
      </div>
    </div>
  )
}

export default function EntradaDados({ conferentes = [], onDadosSalvos }) {
  const [tela, setTela]             = useState('upload')
  const [docasBase, setDocasBase]   = useState([])
  const [validacoes, setValidacoes] = useState({})
  const [docaAtiva, setDocaAtiva]   = useState(null)
  const [erro, setErro]             = useState('')
  const [salvando, setSalvando]     = useState(false)
  const [dragOver, setDragOver]     = useState(false)

  // Carrega estado salvo na sessão
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('gpp_v2')
      if (saved) {
        const { docas, vals } = JSON.parse(saved)
        setDocasBase(docas); setValidacoes(vals); setTela('lista')
      }
    } catch {}
  }, [])

  // Monitor de escalada a cada 10s
  useEffect(() => {
    const t = setInterval(() => {
      setValidacoes(prev => {
        let mudou = false
        const novo = { ...prev }
        Object.entries(novo).forEach(([doca, v]) => {
          if (v.status === ST.AGUARD_COORD && segundosDesde(v.tsAlerta) >= 300) {
            novo[doca] = { ...v, status: ST.ESCALADO, tsEscalada: Date.now() }
            mudou = true
          }
        })
        if (mudou) salvar(docasBase, novo)
        return mudou ? novo : prev
      })
    }, 10000)
    return () => clearInterval(t)
  }, [docasBase])

  function salvar(docas, vals) {
    try { sessionStorage.setItem('gpp_v2', JSON.stringify({ docas, vals })) } catch {}
  }

  function atualizar(doca, campo, valor) {
    setValidacoes(prev => {
      const novo = { ...prev, [doca]: { ...prev[doca], [campo]: valor } }
      salvar(docasBase, novo)
      return novo
    })
  }

  function processarArquivo(file) {
    setErro('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'binary', cellDates: true })
        const nome = wb.SheetNames.find(n => n.trim() === '121')
        if (!nome) { setErro('Aba "121" não encontrada no arquivo.'); return }

        const ws   = wb.Sheets[nome]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false, dateNF: 'dd/mm/yyyy' })
        const data = rows.slice(2).filter(r => r?.[COL.DOCA] != null && String(r[COL.DOCA]).trim() !== '')

        const vistas = new Set()
        const docas  = []
        for (const r of data) {
          const doca = String(r[COL.DOCA]).trim()
          if (!vistas.has(doca)) {
            vistas.add(doca)
            const horario = formatarHorario(r[COL.HORARIO])
            docas.push({
              doca,
              remessa:    String(r[COL.REMESSA]    || '').trim(),
              data:       formatarData(r[COL.DATA]),
              horario,
              gpp:        String(r[COL.GPP]         || '').trim(),
              nomeFilial: String(r[COL.NOME_FILIAL]  || '').trim(),
              supervisor: detectarSupervisor(r[COL.HORARIO]),
              turno:      detectarSupervisor(r[COL.HORARIO]) === 'Virginia' ? '1º Turno' : '2º Turno',
            })
          }
        }

        if (docas.length === 0) { setErro('Nenhuma doca encontrada na aba "121".'); return }

        const vals = {}
        docas.forEach(d => {
          vals[d.doca] = {
            status: ST.PENDENTE,
            hrInicio: '', hrFim: '', hrValidado: '', hrLiberado: '',
            valDoca: '', conferente: '',
            pendExp: '', pendFrente: '', pendDentro: '',
            logExp: '0', logFrente: '0', logDentro: '0',
            observacao: '', tsAlerta: null, tsEscalada: null,
          }
        })

        setDocasBase(docas); setValidacoes(vals)
        salvar(docas, vals); setTela('lista')
      } catch (err) {
        console.error(err)
        setErro('Erro ao ler o arquivo. Verifique se é um .xlsm/.xlsx válido.')
      }
    }
    reader.readAsBinaryString(file)
  }

  function iniciarValidacao(doca) {
    const agora = horarioAtual()
    setValidacoes(prev => {
      const novo = { ...prev, [doca]: { ...prev[doca], status: ST.EM_ANDAMENTO, hrInicio: agora } }
      salvar(docasBase, novo); return novo
    })
    setDocaAtiva(doca); setTela('validar')
  }

  function solicitarAprovacao(doca) {
    const v      = validacoes[doca]
    const agora  = horarioAtual()
    const pExp   = Number(v.pendExp   || 0)
    const pFrente = Number(v.pendFrente || 0)
    const pDentro = Number(v.pendDentro || 0)
    const resultado = pExp - pFrente - pDentro

    const novoStatus = resultado >= 5 ? ST.AGUARD_GERENTE : ST.AGUARD_COORD
    const tempo = calcularTempo(v.hrInicio, agora)

    setValidacoes(prev => {
      const novo = {
        ...prev,
        [doca]: {
          ...prev[doca],
          status:     novoStatus,
          hrFim:      agora,
          hrValidado: agora,
          valDoca:    tempo,
          tsAlerta:   Date.now(),
        }
      }
      salvar(docasBase, novo); return novo
    })
    setDocaAtiva(null); setTela('lista')
  }

  function finalizarSemPendencias(doca) {
    const v     = validacoes[doca]
    const agora = horarioAtual()
    const tempo = calcularTempo(v.hrInicio, agora)
    setValidacoes(prev => {
      const novo = {
        ...prev,
        [doca]: {
          ...prev[doca],
          status:     ST.CONCLUIDO,
          hrFim:      agora,
          hrValidado: agora,
          valDoca:    tempo,
        }
      }
      salvar(docasBase, novo); return novo
    })
    setDocaAtiva(null); setTela('lista')
  }

  function escalarParaGerente(doca) {
    setValidacoes(prev => {
      const novo = { ...prev, [doca]: { ...prev[doca], status: ST.ESCALADO, tsEscalada: Date.now() } }
      salvar(docasBase, novo); return novo
    })
  }

  async function salvarNoSheets(docas) {
  setSalvando(true); setErro('')
  try {
    const hoje    = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const abaHoje = hoje.split('/').reverse().join('-')
    const WEBAPP_URL = import.meta.env.VITE_APPS_SCRIPT_URL

    const linhas = docas.map(d => {
      const v   = validacoes[d.doca]
      const pExp    = Number(v.pendExp    || 0)
      const pFrente = Number(v.pendFrente || 0)
      const pDentro = Number(v.pendDentro || 0)
      const resultado = pExp - pFrente - pDentro
      return [
        d.data || hoje, d.doca, d.remessa, d.horario,
        v.valDoca,
        pExp, pFrente, pDentro,
        Number(v.logExp) || 0, Number(v.logFrente) || 0, Number(v.logDentro) || 0,
        v.hrValidado, v.conferente, v.hrLiberado,
        d.supervisor, d.gpp, '', '', d.turno, v.observacao,
        resultado,
        v.hrLiberado ? 'SIM' : resultado <= 0 ? 'SIM' : 'NÃO',
        resultado <= 0 ? 'VALIDADO' : 'PENDENTE',
        '',
      ]
    })

    const res = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ abaHoje, linhas }),
    })

    const data = await res.json()
    if (!data.ok) throw new Error(data.erro || 'Erro ao salvar')

    sessionStorage.removeItem('gpp_v2')
    setTela('sucesso')
    if (onDadosSalvos) onDadosSalvos()
  } catch (e) {
    setErro(`Erro ao salvar: ${e.message}`)
  }
  setSalvando(false)
}

  function reiniciar() {
    sessionStorage.removeItem('gpp_v2')
    setDocasBase([]); setValidacoes({}); setDocaAtiva(null); setErro(''); setTela('upload')
  }

  // ─── UPLOAD ──────────────────────────────────────────────
  if (tela === 'upload') return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Entrada de Dados</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Faça upload do arquivo <strong style={{ color: 'var(--yellow)' }}>Composição de Horários de Expedição</strong>.
          O sistema lê a aba <strong style={{ color: 'var(--yellow)' }}>121</strong> e extrai as docas automaticamente.
        </p>
      </div>

      <div
        onDrop={e => { e.preventDefault(); setDragOver(false); processarArquivo(e.dataTransfer.files[0]) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fi').click()}
        style={{ border: `2px dashed ${dragOver ? 'var(--yellow)' : 'var(--border)'}`, borderRadius: 16, padding: '56px 32px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'var(--yellow-dim)' : 'var(--bg-card)', transition: 'all 0.2s' }}
      >
        <input id="fi" type="file" accept=".xlsm,.xlsx,.xls" onChange={e => processarArquivo(e.target.files[0])} style={{ display: 'none' }} />
        <FileSpreadsheet size={52} color={dragOver ? 'var(--yellow)' : 'var(--text-muted)'} style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: dragOver ? 'var(--yellow)' : 'var(--text-primary)' }}>
          Arraste o arquivo ou clique para selecionar
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aceita: .xlsm, .xlsx, .xls</div>
      </div>

      {erro && <div style={{ marginTop: 14, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 10, padding: '12px 16px', color: 'var(--red)', fontSize: 13 }}>⚠️ {erro}</div>}

      {/* Legenda de cálculo */}
      <div style={{ marginTop: 20, background: 'var(--bg-card)', borderRadius: 12, padding: 18, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Como funciona o cálculo</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>Resultado = </span>
            <strong style={{ color: 'var(--red)' }}>Pend. Expedição</strong>
            <span style={{ color: 'var(--text-muted)' }}> − </span>
            <strong style={{ color: 'var(--green)' }}>Frente Doca</strong>
            <span style={{ color: 'var(--text-muted)' }}> − </span>
            <strong style={{ color: 'var(--green)' }}>Dentro Doca</strong>
          </div>
          {[
            { cor: 'var(--green)',  ex: 'Ex: 5 − 3 − 1 = 1',  desc: 'Resultado < 3 → libera automaticamente' },
            { cor: 'var(--yellow)', ex: 'Ex: 5 − 1 − 0 = 4',  desc: 'Resultado 3–4 → solicita coordenador (5 min → gerente)' },
            { cor: 'var(--red)',    ex: 'Ex: 8 − 1 − 1 = 6',  desc: 'Resultado ≥ 5 → solicita gerente diretamente' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.cor, flexShrink: 0 }} />
              <code style={{ fontSize: 12, color: r.cor, background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4 }}>{r.ex}</code>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ─── LISTA ───────────────────────────────────────────────
  if (tela === 'lista') {
    const counts = {
      pendente:      docasBase.filter(d => validacoes[d.doca]?.status === ST.PENDENTE).length,
      emAndamento:   docasBase.filter(d => validacoes[d.doca]?.status === ST.EM_ANDAMENTO).length,
      aguardCoord:   docasBase.filter(d => validacoes[d.doca]?.status === ST.AGUARD_COORD).length,
      escalado:      docasBase.filter(d => [ST.ESCALADO, ST.AGUARD_GERENTE].includes(validacoes[d.doca]?.status)).length,
      concluido:     docasBase.filter(d => validacoes[d.doca]?.status === ST.CONCLUIDO).length,
    }
    const prontas = docasBase.filter(d => [ST.CONCLUIDO, ST.AGUARD_COORD, ST.ESCALADO, ST.AGUARD_GERENTE].includes(validacoes[d.doca]?.status))

    return (
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Validação de Docas</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{counts.concluido} de {docasBase.length} concluídas</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reiniciar} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>
              Novo arquivo
            </button>
            {prontas.length > 0 && (
              <button onClick={() => setTela('confirmacao')} style={{ background: 'var(--yellow)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#1a1a1a', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} /> Salvar ({prontas.length})
              </button>
            )}
          </div>
        </div>

        {/* Resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Pendentes',    val: counts.pendente,    cor: 'var(--text-muted)' },
            { label: 'Em andamento', val: counts.emAndamento, cor: 'var(--yellow)' },
            { label: 'Aguard. coord',val: counts.aguardCoord, cor: 'var(--orange)' },
            { label: 'Escaladas',    val: counts.escalado,    cor: 'var(--red)' },
            { label: 'Concluídas',   val: counts.concluido,   cor: 'var(--green)' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.cor }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docasBase.map(d => {
            const v   = validacoes[d.doca] || {}
            const st  = v.status || ST.PENDENTE
            const inf = INFO_ST[st]
            const pExp    = Number(v.pendExp    || 0)
            const pFrente = Number(v.pendFrente || 0)
            const pDentro = Number(v.pendDentro || 0)
            const resultado = pExp - pFrente - pDentro
            const borderCor = st === ST.AGUARD_GERENTE || st === ST.ESCALADO ? 'var(--red)'
              : st === ST.AGUARD_COORD ? 'var(--orange)'
              : st === ST.EM_ANDAMENTO ? 'var(--yellow)'
              : 'var(--border)'

            return (
              <div key={d.doca} style={{ background: 'var(--bg-card)', borderRadius: 12, border: `1px solid ${borderCor}` }}>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>

                  <div style={{ background: 'var(--yellow-dim)', borderRadius: 8, padding: '6px 14px', minWidth: 60, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 9, color: 'var(--yellow)', fontWeight: 700 }}>DOCA</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--yellow)', lineHeight: 1 }}>{d.doca}</div>
                  </div>

                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{d.nomeFilial || d.remessa}</div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{d.horario}</span>
                      <span style={{ fontSize: 11, color: d.supervisor === 'Virginia' ? 'var(--blue)' : 'var(--orange)', fontWeight: 600 }}>{d.supervisor} · {d.turno}</span>
                      {v.conferente && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>👤 {v.conferente}</span>}
                      {pExp > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: resultado >= 5 ? 'var(--red)' : resultado >= 3 ? 'var(--yellow)' : 'var(--green)' }}>
                          Resultado: {resultado} pend.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timer escalada */}
                  {st === ST.AGUARD_COORD && v.tsAlerta && (
                    <Countdown tsInicio={v.tsAlerta} duracaoSeg={300} onExpirar={() => escalarParaGerente(d.doca)} />
                  )}

                  <span style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: inf.bg, color: inf.color, flexShrink: 0 }}>
                    {inf.label}
                  </span>

                  {st === ST.PENDENTE && (
                    <button onClick={() => iniciarValidacao(d.doca)} style={{ background: 'var(--yellow)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#1a1a1a', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <Play size={12} /> Iniciar
                    </button>
                  )}
                  {st === ST.EM_ANDAMENTO && (
                    <button onClick={() => { setDocaAtiva(d.doca); setTela('validar') }} style={{ background: 'var(--yellow-dim)', border: '1px solid var(--yellow)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: 'var(--yellow)', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                      Continuar →
                    </button>
                  )}
                  {(st === ST.ESCALADO || st === ST.AGUARD_GERENTE) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12, fontWeight: 700 }}>
                      <Lock size={13} /> Aguarda gerente
                    </div>
                  )}
                  {st === ST.CONCLUIDO && <CheckCircle size={18} color="var(--green)" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── FORMULÁRIO DE VALIDAÇÃO ──────────────────────────────
  if (tela === 'validar' && docaAtiva) {
    const doca  = docasBase.find(d => d.doca === docaAtiva)
    const v     = validacoes[docaAtiva] || {}
    const confsAtivos = conferentes.filter(c => c.ativo)

    const pExp    = Number(v.pendExp    || 0)
    const pFrente = Number(v.pendFrente || 0)
    const pDentro = Number(v.pendDentro || 0)
    const resultado   = pExp - pFrente - pDentro
    const preenchido  = v.conferente && v.pendExp !== '' && v.pendFrente !== '' && v.pendDentro !== ''
    const podeLiberar = preenchido && resultado < 3
    const podeSolicitar = preenchido && resultado >= 3

    // Cores do resultado
    const corResultado = resultado >= 5 ? 'var(--red)' : resultado >= 3 ? 'var(--yellow)' : resultado >= 0 ? 'var(--green)' : 'var(--green)'

    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setDocaAtiva(null); setTela('lista') }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>
            ← Lista
          </button>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Doca {doca?.doca} — {doca?.nomeFilial}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Iniciado às {v.hrInicio}</p>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>

          {/* Dados automáticos */}
          <div style={{ background: 'var(--bg-secondary)', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Dados do arquivo (automático)</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Remessa',    val: doca?.remessa },
                { label: 'Horário',    val: doca?.horario },
                { label: 'Supervisor', val: doca?.supervisor, cor: doca?.supervisor === 'Virginia' ? 'var(--blue)' : 'var(--orange)' },
                { label: 'Turno',      val: doca?.turno },
                { label: 'GPP',        val: doca?.gpp },
                { label: 'Hr Inicio',  val: v.hrInicio, cor: 'var(--green)' },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: item.cor || 'var(--text-primary)' }}>{item.val || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 24 }}>

            {/* Conferente */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Conferente <span style={{ color: 'var(--yellow)' }}>*</span>
              </label>
              {confsAtivos.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--red)' }}>⚠️ Nenhum conferente cadastrado. Acesse a aba "Conferentes".</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {confsAtivos.map(c => (
                    <button key={c.id} onClick={() => atualizar(docaAtiva, 'conferente', c.nome)} style={{
                      padding: '8px 16px', borderRadius: 20,
                      border: `1px solid ${v.conferente === c.nome ? 'var(--yellow)' : 'var(--border)'}`,
                      background: v.conferente === c.nome ? 'var(--yellow)' : 'var(--bg-secondary)',
                      color: v.conferente === c.nome ? '#1a1a1a' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 13, fontWeight: v.conferente === c.nome ? 700 : 400,
                    }}>
                      {c.nome} <span style={{ fontSize: 10, opacity: 0.6 }}>{c.turno}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pendências */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pendências
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
              <div>
                <Campo label="Pend. Expedição (total)" valor={v.pendExp} onChange={val => atualizar(docaAtiva, 'pendExp', val)} required />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Total de pendências na doca</div>
              </div>
              <div>
                <Campo label="Pend. Frente Doca" valor={v.pendFrente} onChange={val => atualizar(docaAtiva, 'pendFrente', val)} required />
                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>Localizado na frente</div>
              </div>
              <div>
                <Campo label="Pend. Dentro Doca" valor={v.pendDentro} onChange={val => atualizar(docaAtiva, 'pendDentro', val)} required />
                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>Localizado dentro</div>
              </div>
            </div>

            {/* Resultado em tempo real */}
            {v.pendExp !== '' && v.pendFrente !== '' && v.pendDentro !== '' && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, border: `1px solid ${corResultado}44` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {pExp} − {pFrente} − {pDentro} =
                    </span>
                    <span style={{ fontSize: 28, fontWeight: 900, color: corResultado }}>{resultado}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>pendência(s) final</span>
                  </div>

                  {resultado < 3 && (
                    <span style={{ fontSize: 12, color: 'var(--green)', background: 'var(--green-dim)', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
                      ✅ Pode liberar
                    </span>
                  )}
                  {resultado >= 3 && resultado < 5 && (
                    <div style={{ background: 'var(--orange-dim)', border: '1px solid var(--orange)', borderRadius: 8, padding: '6px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 700 }}>⚠️ Requer aprovação do coordenador</div>
                      <div style={{ fontSize: 10, color: 'var(--orange)', opacity: 0.8, marginTop: 2 }}>Se não responder em 5 min → escala para gerente</div>
                    </div>
                  )}
                  {resultado >= 5 && (
                    <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '6px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>🚨 Requer aprovação do gerente</div>
                      <div style={{ fontSize: 10, color: 'var(--red)', opacity: 0.8, marginTop: 2 }}>Doca ficará bloqueada até aprovação</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Log localizado */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Log localizado
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
              <Campo label="Log Expedição"   valor={v.logExp}    onChange={val => atualizar(docaAtiva, 'logExp', val)} />
              <Campo label="Log Frente Doca" valor={v.logFrente} onChange={val => atualizar(docaAtiva, 'logFrente', val)} />
              <Campo label="Log Dentro Doca" valor={v.logDentro} onChange={val => atualizar(docaAtiva, 'logDentro', val)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <Campo label="Hr Liberado" valor={v.hrLiberado} onChange={val => atualizar(docaAtiva, 'hrLiberado', val)} type="text" placeholder="Ex: 22:05" />
              <Campo label="Observação"  valor={v.observacao} onChange={val => atualizar(docaAtiva, 'observacao', val)} type="text" placeholder="Opcional..." />
            </div>

            {/* Automáticos */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div><div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Hr Inicio</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{v.hrInicio}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Hr Validado</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ao finalizar</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Val. Doca</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Calculado ao finalizar</div></div>
            </div>

            {/* Botões */}
            <div style={{ display: 'grid', gridTemplateColumns: podeSolicitar ? '1fr 1fr' : '1fr', gap: 12 }}>
              {podeLiberar && (
                <button onClick={() => finalizarSemPendencias(docaAtiva)} style={{
                  padding: '14px', borderRadius: 10, border: 'none',
                  background: 'var(--green)', color: '#fff',
                  fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <CheckCircle size={18} /> Liberar doca
                </button>
              )}

              {podeSolicitar && (
                <button onClick={() => solicitarAprovacao(docaAtiva)} style={{
                  padding: '14px', borderRadius: 10, border: 'none',
                  background: resultado >= 5 ? 'var(--red)' : 'var(--orange)',
                  color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Send size={18} />
                  {resultado >= 5 ? 'Solicitar aprovação — Gerente' : 'Solicitar aprovação — Coordenador'}
                </button>
              )}

              {!preenchido && (
                <button disabled style={{
                  padding: '14px', borderRadius: 10, border: 'none',
                  background: 'var(--border)', color: 'var(--text-muted)',
                  fontWeight: 800, fontSize: 15, cursor: 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Timer size={18} /> Preencha todos os campos
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── CONFIRMAÇÃO ──────────────────────────────────────────
  if (tela === 'confirmacao') {
    const paraEnviar = docasBase.filter(d => [ST.CONCLUIDO, ST.AGUARD_COORD, ST.ESCALADO, ST.AGUARD_GERENTE].includes(validacoes[d.doca]?.status))

    return (
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Confirmar e Salvar</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{paraEnviar.length} doca(s) para salvar no Google Sheets.</p>
          </div>
          <button onClick={() => setTela('lista')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={12} /> Voltar
          </button>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Doca', 'Remessa', 'Supervisor', 'Conferente', 'Pend.Exp', 'Frente', 'Dentro', 'Resultado', 'Hr Inicio', 'Hr Valid.', 'Val. Doca', 'Hr Lib.', 'Status'].map(c => (
                    <th key={c} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paraEnviar.map((d, i) => {
                  const v   = validacoes[d.doca] || {}
                  const inf = INFO_ST[v.status || ST.PENDENTE]
                  const pExp    = Number(v.pendExp    || 0)
                  const pFrente = Number(v.pendFrente || 0)
                  const pDentro = Number(v.pendDentro || 0)
                  const resultado = pExp - pFrente - pDentro
                  return (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--yellow)' }}>{d.doca}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{d.remessa}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: d.supervisor === 'Virginia' ? 'var(--blue)' : 'var(--orange)', fontWeight: 600 }}>{d.supervisor}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{v.conferente}</td>
                      <td style={{ padding: '10px 12px', color: pExp > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{pExp}</td>
                      <td style={{ padding: '10px 12px', color: pFrente > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{pFrente}</td>
                      <td style={{ padding: '10px 12px', color: pDentro > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{pDentro}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: resultado >= 5 ? 'var(--red)' : resultado >= 3 ? 'var(--yellow)' : 'var(--green)' }}>{resultado}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{v.hrInicio}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--green)', fontWeight: 600 }}>{v.hrFim}</td>
                      <td style={{ padding: '10px 12px' }}>{v.valDoca}</td>
                      <td style={{ padding: '10px 12px', color: v.hrLiberado ? 'var(--green)' : 'var(--text-muted)' }}>{v.hrLiberado || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: inf.bg, color: inf.color }}>{inf.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {erro && <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, color: 'var(--red)', fontSize: 13 }}>⚠️ {erro}</div>}

        <button onClick={() => salvarNoSheets(paraEnviar)} disabled={salvando} style={{
          width: '100%', padding: '14px', borderRadius: 10, border: 'none',
          background: salvando ? 'var(--border)' : 'var(--yellow)',
          color: salvando ? 'var(--text-muted)' : '#1a1a1a',
          fontWeight: 800, fontSize: 15, cursor: salvando ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <Save size={18} />{salvando ? 'Salvando...' : `Salvar ${paraEnviar.length} doca(s) no Google Sheets`}
        </button>
      </div>
    )
  }

  // ─── SUCESSO ──────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 480, margin: '64px auto', textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, background: 'var(--green-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <CheckCircle size={40} color="var(--green)" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Dados salvos com sucesso!</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
        Docas registradas no Google Sheets.<br />Alertas disparados conforme as regras de aprovação.
      </p>
      <button onClick={reiniciar} style={{ background: 'var(--yellow)', border: 'none', borderRadius: 10, padding: '14px 32px', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: '#1a1a1a', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Upload size={16} /> Novo upload
      </button>
    </div>
  )
}