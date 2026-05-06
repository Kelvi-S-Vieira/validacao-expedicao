import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import Login from './Login'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { AlertTriangle, CheckCircle, Clock, Package, TrendingUp, Calendar, Bell, RefreshCw, User } from 'lucide-react'
import './App.css'
import Aprovacao from './Aprovacao'
import Relatorio from './Relatorio'

const API_KEY        = import.meta.env.VITE_GOOGLE_API_KEY
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID

const CORES = {
  GERENTE:     '#d93025',
  COORDENADOR: '#f9ab00',
  OK:          '#1e8e3e',
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
  const alerta     = linha['Alerta Enviado']
    ? (linha['Alerta Enviado'].includes('GERENTE') ? 'GERENTE' : 'COORDENADOR')
    : ''
  const partes        = dataAba.split('-')
  const dataFormatada = partes.length === 3 ? `${partes[0]}/${partes[1]}` : dataAba
  return {
    data:       dataFormatada,
    doca:       linha['Doca']       || '',
    remessa:    linha['Remessa']    || '',
    horario:    linha['Horario']    || '',
    pendExp,
    pendFrente,
    pendDentro,
    total:      soma,
    validado:   linha['VALIDADO']   || '',
    liberado:   linha['LIBERADO']   || '',
    supervisor: linha['Supervisor'] || '',
    turno:      linha['Turno']      || '',
    alerta,
    aprovado:   false,
  }
}

function detectarPerfil(email) {
  if (email.includes('gerente'))     return 'GERENTE'
  if (email.includes('coordenador')) return 'COORDENADOR'
  if (email.includes('analista'))    return 'ANALISTA'
  return 'OPERADOR'
}

export default function App() {
  const [usuario, setUsuario]                         = useState(null)
  const [verificando, setVerificando]                 = useState(true)
  const [dados, setDados]                             = useState([])
  const [carregando, setCarregando]                   = useState(true)
  const [erro, setErro]                               = useState(null)
  const [diaSelecionado, setDiaSelecionado]           = useState('todos')
  const [abaSelecionada, setAbaSelecionada]           = useState('dashboard')
  const [ultimaAtualizacao, setUltimaAtualizacao]     = useState(null)
  const [perfil, setPerfil]                           = useState('COORDENADOR')

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) {
        setUsuario({ email: user.email, perfil: detectarPerfil(user.email), uid: user.uid })
      } else {
        setUsuario(null)
      }
      setVerificando(false)
    })
    return () => unsub()
  }, [])

  async function carregarDados() {
    setCarregando(true)
    setErro(null)
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
    } catch (e) {
      setErro('Erro ao carregar dados do Google Sheets.')
      console.error(e)
    }
    setCarregando(false)
  }

  useEffect(() => {
    if (!usuario) return
    carregarDados()
    const intervalo = setInterval(carregarDados, 5 * 60 * 1000)
    return () => clearInterval(intervalo)
  }, [usuario])

  const dias           = ['todos', ...new Set(dados.map(d => d.data))]
  const dadosFiltrados = diaSelecionado === 'todos' ? dados : dados.filter(d => d.data === diaSelecionado)
  const totalDocas     = dadosFiltrados.length
  const totalLiberadas = dadosFiltrados.filter(d => d.liberado === 'SIM').length
  const totalAlertas   = dadosFiltrados.filter(d => d.alerta !== '').length
  const totalCriticos  = dadosFiltrados.filter(d => d.alerta === 'GERENTE').length

  const dadosGrafico = dias.filter(d => d !== 'todos').map(dia => ({
    dia,
    Liberadas: dados.filter(d => d.data === dia && d.liberado === 'SIM').length,
    Pendentes: dados.filter(d => d.data === dia && d.liberado !== 'SIM').length,
  }))

  const dadosPizza = [
    { name: 'Liberadas', value: totalLiberadas,              cor: '#1e8e3e' },
    { name: 'Pendentes', value: totalDocas - totalLiberadas, cor: '#d93025' },
  ]

  function handleAprovar(row, comentario) {
    setDados(prev => prev.map(d =>
      d.doca === row.doca && d.data === row.data
        ? { ...d, aprovado: true, comentarioAprovacao: comentario }
        : d
    ))
    alert(`✅ Doca ${row.doca} aprovada!${comentario ? '\nComentário: ' + comentario : ''}`)
  }

  function handleRejeitar(row, comentario) {
    setDados(prev => prev.map(d =>
      d.doca === row.doca && d.data === row.data
        ? { ...d, aprovado: false, rejeitado: true, comentarioAprovacao: comentario }
        : d
    ))
    alert(`❌ Doca ${row.doca} rejeitada!${comentario ? '\nComentário: ' + comentario : ''}`)
  }

  const LABELS = {
    dashboard: 'Dashboard',
    tabela:    'Tabela de Docas',
    alertas:   'Alertas',
    aprovacao: 'Aprovação',
    relatorio: 'Relatório',
  }

  const COR_PERFIL = {
    GERENTE:     '#d93025',
    COORDENADOR: '#f9ab00',
    ANALISTA:    '#1e8e3e',
    OPERADOR:    '#4285f4',
  }

  // Tela de loading inicial
  if (verificando) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6', fontFamily: 'Inter, sans-serif' }}>
      Carregando...
    </div>
  )

  // Tela de login
  if (!usuario) return <Login onLogin={setUsuario} />

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e8eaed', fontFamily: 'Inter, sans-serif' }}>

      {/* HEADER */}
      <div style={{ background: '#1a1f2e', borderBottom: '1px solid #2d3142', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Package size={28} color="#4285f4" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Validação de Expedição</div>
            <div style={{ fontSize: 12, color: '#9aa0a6' }}>Sistema de Controle de Docas</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {ultimaAtualizacao && <span style={{ fontSize: 12, color: '#9aa0a6' }}>Atualizado às {ultimaAtualizacao}</span>}
          <button onClick={carregarDados} disabled={carregando} style={{ background: 'none', border: '1px solid #2d3142', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#9aa0a6', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} style={{ animation: carregando ? 'spin 1s linear infinite' : 'none' }} />
            <span style={{ fontSize: 12 }}>Atualizar</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} color={totalAlertas > 0 ? '#f9ab00' : '#9aa0a6'} />
            <span style={{ fontSize: 13, color: '#9aa0a6' }}>{totalAlertas} alerta(s)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid #2d3142', paddingLeft: 16 }}>
            <span style={{ fontSize: 12, color: '#9aa0a6' }}>{usuario.email}</span>
            <span style={{
              padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: COR_PERFIL[usuario.perfil] + '22',
              color: COR_PERFIL[usuario.perfil]
            }}>{usuario.perfil}</span>
            <button onClick={() => signOut(auth)} style={{
              background: 'none', border: '1px solid #2d3142', borderRadius: 8,
              padding: '5px 10px', cursor: 'pointer', color: '#9aa0a6', fontSize: 12
            }}>Sair</button>
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO */}
      <div style={{ background: '#1a1f2e', padding: '0 32px', display: 'flex', gap: 4, borderBottom: '1px solid #2d3142' }}>
        {['dashboard', 'tabela', 'alertas', 'aprovacao', 'relatorio'].map(aba => (
          <button key={aba} onClick={() => setAbaSelecionada(aba)} style={{
            padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
            color: abaSelecionada === aba ? '#4285f4' : '#9aa0a6',
            borderBottom: abaSelecionada === aba ? '2px solid #4285f4' : '2px solid transparent',
            fontWeight: abaSelecionada === aba ? 600 : 400, fontSize: 14,
          }}>
            {LABELS[aba]}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px 32px' }}>

        {erro && (
          <div style={{ background: '#d9302533', border: '1px solid #d93025', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#d93025' }}>
            {erro}
          </div>
        )}

        {carregando && (
          <div style={{ textAlign: 'center', padding: 48, color: '#9aa0a6' }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <div>Carregando dados do Google Sheets...</div>
          </div>
        )}

        {!carregando && !erro && (
          <>
            {/* FILTRO DE DIA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Calendar size={16} color="#9aa0a6" />
              <span style={{ fontSize: 13, color: '#9aa0a6' }}>Filtrar por dia:</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {dias.map(dia => (
                  <button key={dia} onClick={() => setDiaSelecionado(dia)} style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
                    background: diaSelecionado === dia ? '#4285f4' : '#2d3142',
                    color: diaSelecionado === dia ? '#fff' : '#9aa0a6',
                    fontWeight: diaSelecionado === dia ? 600 : 400
                  }}>
                    {dia === 'todos' ? 'Todos' : dia}
                  </button>
                ))}
              </div>
            </div>

            {/* ABA DASHBOARD */}
            {abaSelecionada === 'dashboard' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: 'Total de Docas',     valor: totalDocas,     icon: <Package size={20} />,       cor: '#4285f4' },
                    { label: 'Docas Liberadas',    valor: totalLiberadas, icon: <CheckCircle size={20} />,   cor: '#1e8e3e' },
                    { label: 'Alertas Ativos',     valor: totalAlertas,   icon: <AlertTriangle size={20} />, cor: '#f9ab00' },
                    { label: 'Críticos (Gerente)', valor: totalCriticos,  icon: <TrendingUp size={20} />,    cor: '#d93025' },
                  ].map((card, i) => (
                    <div key={i} style={{ background: '#1a1f2e', borderRadius: 12, padding: '20px 24px', border: `1px solid ${card.cor}33` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 8 }}>{card.label}</div>
                          <div style={{ fontSize: 32, fontWeight: 700, color: card.cor }}>{card.valor}</div>
                        </div>
                        <div style={{ color: card.cor, opacity: 0.8 }}>{card.icon}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                  <div style={{ background: '#1a1f2e', borderRadius: 12, padding: 24, border: '1px solid #2d3142' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Docas por Dia</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3142" />
                        <XAxis dataKey="dia" stroke="#9aa0a6" fontSize={12} />
                        <YAxis stroke="#9aa0a6" fontSize={12} />
                        <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3142', borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="Liberadas" fill="#1e8e3e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Pendentes" fill="#d93025" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ background: '#1a1f2e', borderRadius: 12, padding: 24, border: '1px solid #2d3142' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Status Geral</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {dadosPizza.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3142', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* ABA TABELA */}
            {abaSelecionada === 'tabela' && (
              <div style={{ background: '#1a1f2e', borderRadius: 12, border: '1px solid #2d3142', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#2d3142' }}>
                      {['Data', 'Doca', 'Remessa', 'Horário', 'Pend. Exp.', 'Pend. Frente', 'Pend. Dentro', 'Total', 'Supervisor', 'Turno', 'Liberado', 'Alerta'].map(col => (
                        <th key={col} style={{ padding: '12px 16px', textAlign: 'left', color: '#9aa0a6', fontWeight: 600 }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #2d3142', background: i % 2 === 0 ? '#1a1f2e' : '#1e2433' }}>
                        <td style={{ padding: '12px 16px' }}>{row.data}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.doca}</td>
                        <td style={{ padding: '12px 16px' }}>{row.remessa}</td>
                        <td style={{ padding: '12px 16px' }}><Clock size={12} style={{ marginRight: 4 }} />{row.horario}</td>
                        <td style={{ padding: '12px 16px', color: row.pendExp    > 0 ? '#f9ab00' : '#9aa0a6' }}>{row.pendExp}</td>
                        <td style={{ padding: '12px 16px', color: row.pendFrente > 0 ? '#f9ab00' : '#9aa0a6' }}>{row.pendFrente}</td>
                        <td style={{ padding: '12px 16px', color: row.pendDentro > 0 ? '#f9ab00' : '#9aa0a6' }}>{row.pendDentro}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: row.total >= 5 ? '#d93025' : row.total >= 3 ? '#f9ab00' : '#1e8e3e' }}>{row.total}</td>
                        <td style={{ padding: '12px 16px' }}>{row.supervisor}</td>
                        <td style={{ padding: '12px 16px' }}>{row.turno}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: row.liberado === 'SIM' ? '#1e8e3e33' : '#d9302533', color: row.liberado === 'SIM' ? '#1e8e3e' : '#d93025' }}>
                            {row.liberado || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {row.alerta && (
                            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: CORES[row.alerta] + '33', color: CORES[row.alerta] }}>
                              {row.alerta}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ABA ALERTAS */}
            {abaSelecionada === 'alertas' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dadosFiltrados.filter(d => d.alerta !== '').map((row, i) => (
                  <div key={i} style={{ background: '#1a1f2e', borderRadius: 12, padding: 20, border: `1px solid ${CORES[row.alerta]}44`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <AlertTriangle size={24} color={CORES[row.alerta]} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>Doca {row.doca} — {row.remessa}</div>
                        <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 4 }}>
                          Pend. Exp: {row.pendExp} | Frente: {row.pendFrente} | Dentro: {row.pendDentro} | Total: {row.total}
                        </div>
                      </div>
                    </div>
                    <span style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: CORES[row.alerta] + '33', color: CORES[row.alerta] }}>
                      {row.alerta}
                    </span>
                  </div>
                ))}
                {dadosFiltrados.filter(d => d.alerta !== '').length === 0 && (
                  <div style={{ textAlign: 'center', padding: 48, color: '#9aa0a6' }}>
                    <CheckCircle size={48} color="#1e8e3e" style={{ marginBottom: 12 }} />
                    <div>Nenhum alerta ativo para o período selecionado</div>
                  </div>
                )}
              </div>
            )}

            {/* ABA APROVAÇÃO */}
            {abaSelecionada === 'aprovacao' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <User size={16} color="#9aa0a6" />
                  <span style={{ fontSize: 13, color: '#9aa0a6' }}>Visualizando como:</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['COORDENADOR', 'GERENTE'].map(p => (
                      <button key={p} onClick={() => setPerfil(p)} style={{
                        padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
                        background: perfil === p ? (p === 'GERENTE' ? '#d93025' : '#f9ab00') : '#2d3142',
                        color: perfil === p ? '#fff' : '#9aa0a6',
                        fontWeight: perfil === p ? 700 : 400
                      }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <Aprovacao
                  dados={dadosFiltrados}
                  perfil={perfil}
                  onAprovar={handleAprovar}
                  onRejeitar={handleRejeitar}
                />
              </div>
            )}

            {/* ABA RELATÓRIO */}
            {abaSelecionada === 'relatorio' && (
              <Relatorio dados={dadosFiltrados} />
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}