import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Cell, LabelList
} from 'recharts'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

// ─── DADOS HISTÓRICOS FIXOS 2025 ─────────────────────────
const MENSAL_2025 = [
  { mes: 'jan', total: 815,  semPend: 238,  comPend: 577,  mais5: 36,  pct: 22 },
  { mes: 'fev', total: 935,  semPend: 116,  comPend: 819,  mais5: 162, pct: 12 },
  { mes: 'mar', total: 971,  semPend: 67,   comPend: 904,  mais5: 351, pct: 7  },
  { mes: 'abr', total: 1064, semPend: 18,   comPend: 1046, mais5: 732, pct: 2  },
  { mes: 'mai', total: 1077, semPend: 41,   comPend: 1036, mais5: 500, pct: 4  },
  { mes: 'jun', total: 836,  semPend: 55,   comPend: 781,  mais5: 233, pct: 7  },
  { mes: 'jul', total: 414,  semPend: 13,   comPend: 401,  mais5: 67,  pct: 3  },
  { mes: 'ago', total: 849,  semPend: 160,  comPend: 689,  mais5: 52,  pct: 19 },
  { mes: 'set', total: 1102, semPend: 122,  comPend: 980,  mais5: 80,  pct: 11 },
  { mes: 'out', total: 1197, semPend: 88,   comPend: 1109, mais5: 204, pct: 7  },
  { mes: 'nov', total: 1091, semPend: 122,  comPend: 969,  mais5: 106, pct: 11 },
  { mes: 'dez', total: 853,  semPend: 92,   comPend: 761,  mais5: 57,  pct: 11 },
]

// Distribuição completa por faixa (idêntica à Planilha2)
const DIST_2025 = [
  { mes: 'jan', c0:178, c1:196, c2:168, c3:111, c4:50,  c5:45,  c6:33,  c7:10, c8:3,  c9:5,  c10:5, c11:4, c12:4, c13:0, c14:0, mais15:0,   total:812  },
  { mes: 'fev', c0:116, c1:133, c2:163, c3:149, c4:95,  c5:73,  c6:53,  c7:36, c8:22, c9:25, c10:13,c11:18,c12:6, c13:7, c14:4, mais15:22,  total:935  },
  { mes: 'mar', c0:67,  c1:94,  c2:94,  c3:123, c4:102, c5:85,  c6:81,  c7:72, c8:39, c9:48, c10:31,c11:27,c12:18,c13:15,c14:9, mais15:66,  total:971  },
  { mes: 'abr', c0:18,  c1:32,  c2:49,  c3:67,  c4:69,  c5:69,  c6:86,  c7:72, c8:84, c9:68, c10:66,c11:56,c12:49,c13:42,c14:35,mais15:202, total:1064 },
  { mes: 'mai', c0:41,  c1:64,  c2:95,  c3:100, c4:114, c5:94,  c6:76,  c7:59, c8:62, c9:65, c10:58,c11:45,c12:30,c13:25,c14:30,mais15:119, total:1077 },
  { mes: 'jun', c0:55,  c1:106, c2:112, c3:110, c4:95,  c5:80,  c6:67,  c7:53, c8:41, c9:19, c10:22,c11:15,c12:11,c13:7, c14:11,mais15:32,  total:836  },
  { mes: 'jul', c0:13,  c1:43,  c2:48,  c3:64,  c4:53,  c5:57,  c6:32,  c7:27, c8:22, c9:17, c10:9, c11:4, c12:9, c13:0, c14:2, mais15:14,  total:414  },
  { mes: 'ago', c0:160, c1:181, c2:161, c3:121, c4:88,  c5:55,  c6:36,  c7:19, c8:13, c9:7,  c10:3, c11:2, c12:0, c13:0, c14:2, mais15:1,   total:849  },
  { mes: 'set', c0:122, c1:187, c2:209, c3:179, c4:121, c5:97,  c6:69,  c7:38, c8:21, c9:20, c10:10,c11:12,c12:6, c13:4, c14:2, mais15:5,   total:1102 },
  { mes: 'out', c0:88,  c1:144, c2:164, c3:192, c4:133, c5:146, c6:100, c7:63, c8:43, c9:24, c10:23,c11:18,c12:13,c13:11,c14:6, mais15:29,  total:1197 },
  { mes: 'nov', c0:122, c1:158, c2:223, c3:145, c4:122, c5:95,  c6:61,  c7:53, c8:33, c9:16, c10:14,c11:12,c12:6, c13:5, c14:5, mais15:21,  total:1091 },
  { mes: 'dez', c0:92,  c1:184, c2:144, c3:136, c4:89,  c5:72,  c6:44,  c7:36, c8:19, c9:10, c10:10,c11:5, c12:4, c13:2, c14:0, mais15:6,   total:853  },
]

const ULTIMOS_5_DIAS = [
  { dia: '31/01', total: 31,  menos5: 31, mais5: 0  },
  { dia: '31/03', total: 33,  menos5: 7,  mais5: 28 },
  { dia: '31/05', total: 50,  menos5: 16, mais5: 28 },
  { dia: '31/10', total: 45,  menos5: 40, mais5: 5  },
  { dia: '30/12', total: 40,  menos5: 38, mais5: 3  },
]

// Total geral por coluna
const TOTAIS = DIST_2025.reduce((acc, row) => {
  ['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14','mais15','total'].forEach(k => {
    acc[k] = (acc[k] || 0) + (row[k] || 0)
  })
  return acc
}, {})

// Label customizado para gráfico de barras simples
const LabelTopo = ({ x, y, width, value }) => {
  if (!value || value === 0) return null
  return (
    <text x={x + width / 2} y={y - 4} fill="var(--text-muted)" textAnchor="middle" fontSize={10} fontWeight={600}>
      {value}
    </text>
  )
}

// Label para linha
const LabelLinha = ({ x, y, value }) => {
  if (!value) return null
  return (
    <text x={x} y={y - 8} fill="var(--orange)" textAnchor="middle" fontSize={10} fontWeight={700}>
      {value}%
    </text>
  )
}

const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span><strong>{p.value?.toLocaleString('pt-BR')}</strong>
        </div>
      ))}
    </div>
  )
}

function CardSecao({ titulo, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{titulo}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

const corPct = (pct) => pct >= 15 ? '#ef4444' : pct >= 8 ? '#f97316' : '#22c55e'

export default function DashboardHistorico({ dadosRecentes = [] }) {
  const [viewDist, setViewDist] = useState('grafico') // grafico | tabela | dinamica

  const total2025   = MENSAL_2025.reduce((s, m) => s + m.total, 0)
  const comPend2025 = MENSAL_2025.reduce((s, m) => s + m.comPend, 0)
  const mais5_2025  = MENSAL_2025.reduce((s, m) => s + m.mais5, 0)
  const melhorMes   = MENSAL_2025.reduce((b, m) => m.pct < b.pct ? m : b)

  const diasRecentes = (() => {
    if (!dadosRecentes.length) return ULTIMOS_5_DIAS
    const porDia = {}
    dadosRecentes.forEach(row => {
      if (!porDia[row.data]) porDia[row.data] = { dia: row.data, total: 0, menos5: 0, mais5: 0 }
      const resultado = (row.pendExp || 0) - (row.pendFrente || 0) - (row.pendDentro || 0)
      porDia[row.data].total++
      if (resultado >= 5) porDia[row.data].mais5++
      else porDia[row.data].menos5++
    })
    return Object.values(porDia).sort((a, b) => a.dia.localeCompare(b.dia)).slice(-5)
  })()

  return (
    <div>
      {/* CARDS RESUMO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total expedido 2025',  valor: total2025.toLocaleString('pt-BR'),   cor: '#3b82f6', sub: 'veículos no ano' },
          { label: 'Com pendências',        valor: comPend2025.toLocaleString('pt-BR'), cor: '#f97316', sub: `${Math.round(comPend2025/total2025*100)}% do total` },
          { label: 'Críticos (≥5 result.)', valor: mais5_2025.toLocaleString('pt-BR'),  cor: '#ef4444', sub: `${Math.round(mais5_2025/total2025*100)}% do total` },
          { label: 'Melhor mês 2025',       valor: melhorMes.mes.toUpperCase(),         cor: '#22c55e', sub: `${melhorMes.pct}% com pendências` },
        ].map((c, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', border: `1px solid ${c.cor}33`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.cor, borderRadius: '12px 12px 0 0' }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.cor, lineHeight: 1 }}>{c.valor}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* GRÁFICO EVOLUÇÃO MENSAL — com labels no topo */}
      <CardSecao titulo="Evolução mensal 2025 — total de veículos expedidos">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={MENSAL_2025} barGap={2} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<TooltipCustom />} />
            <Legend iconType="circle" iconSize={8} />
            <Bar dataKey="semPend" name="Sem pendência" stackId="a" fill="#22c55e" maxBarSize={40} />
            <Bar dataKey="comPend" name="Com pendência" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40}>
              <LabelList dataKey="total" position="top" content={LabelTopo} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardSecao>

      {/* GRÁFICO % — com labels nos pontos */}
      <CardSecao titulo="% veículos com pendência por mês — 2025">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MENSAL_2025} barGap={4} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 30]} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const d = MENSAL_2025.find(m => m.mes === label)
              return (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                  <div style={{ color: corPct(payload[0]?.value) }}>{payload[0]?.value}% com pendência</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Total: {d?.total} veículos</div>
                </div>
              )
            }} />
            <ReferenceLine y={10} stroke="var(--yellow)" strokeDasharray="4 4" label={{ value: 'meta 10%', position: 'insideTopRight', fontSize: 10, fill: 'var(--yellow)' }} />
            <Bar dataKey="pct" name="% com pend." maxBarSize={40} radius={[4, 4, 0, 0]}>
              {MENSAL_2025.map((entry, i) => (
                <Cell key={i} fill={corPct(entry.pct)} />
              ))}
              <LabelList dataKey="pct" position="top" formatter={v => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text-muted)', justifyContent: 'flex-end' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> ≤ 7%</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} /> 8–14%</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> ≥ 15%</span>
        </div>
      </CardSecao>

      {/* DISTRIBUIÇÃO POR FAIXA — 3 modos */}
      <CardSecao titulo="Distribuição por faixa de pendências — 2025">
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[
            { key: 'grafico',  label: 'Gráfico' },
            { key: 'tabela',   label: 'Tabela simples' },
            { key: 'dinamica', label: 'Tabela dinâmica' },
          ].map(v => (
            <button key={v.key} onClick={() => setViewDist(v.key)} style={{
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
              background: viewDist === v.key ? 'var(--yellow)' : 'var(--bg-secondary)',
              color: viewDist === v.key ? '#1a1a1a' : 'var(--text-muted)',
              fontWeight: viewDist === v.key ? 700 : 400,
            }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* GRÁFICO EMPILHADO */}
        {viewDist === 'grafico' && (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={DIST_2025} barGap={2} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<TooltipCustom />} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="c0"     name="0"     stackId="a" fill="#22c55e" maxBarSize={40} />
              <Bar dataKey="c1"     name="1"     stackId="a" fill="#86efac" maxBarSize={40} />
              <Bar dataKey="c2"     name="2"     stackId="a" fill="#fde68a" maxBarSize={40} />
              <Bar dataKey="c3"     name="3"     stackId="a" fill="#fed7aa" maxBarSize={40} />
              <Bar dataKey="c4"     name="4"     stackId="a" fill="#fdba74" maxBarSize={40} />
              <Bar dataKey="c5"     name="5"     stackId="a" fill="#f97316" maxBarSize={40} />
              <Bar dataKey="c6"     name="6"     stackId="a" fill="#fb923c" maxBarSize={40} />
              <Bar dataKey="c7"     name="7"     stackId="a" fill="#f87171" maxBarSize={40} />
              <Bar dataKey="c8"     name="8"     stackId="a" fill="#ef4444" maxBarSize={40} />
              <Bar dataKey="c9"     name="9"     stackId="a" fill="#dc2626" maxBarSize={40} />
              <Bar dataKey="c10"    name="10"    stackId="a" fill="#b91c1c" maxBarSize={40} />
              <Bar dataKey="mais15" name="15+"   stackId="a" fill="#7f1d1d" radius={[4, 4, 0, 0]} maxBarSize={40}>
                <LabelList dataKey="total" position="top" content={LabelTopo} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* TABELA SIMPLES */}
        {viewDist === 'tabela' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Mês', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15+', 'Total'].map(c => (
                    <th key={c} style={{ padding: '8px 10px', textAlign: c === 'Mês' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DIST_2025.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '7px 10px', fontWeight: 700, color: 'var(--yellow)' }}>{row.mes}</td>
                    {['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14'].map(k => (
                      <td key={k} style={{ padding: '7px 10px', textAlign: 'center', color: row[k] > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: row[k] >= 50 ? 700 : 400 }}>
                        {row[k] || '—'}
                      </td>
                    ))}
                    <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: row.mais15 > 0 ? '#ef4444' : 'var(--text-muted)' }}>{row.mais15 || '—'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--yellow)' }}>{row.total}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 800 }}>Total</td>
                  {['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14'].map(k => (
                    <td key={k} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{TOTAIS[k]?.toLocaleString('pt-BR')}</td>
                  ))}
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>{TOTAIS.mais15?.toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: 'var(--yellow)' }}>{TOTAIS.total?.toLocaleString('pt-BR')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* TABELA DINÂMICA — idêntica à Planilha2 */}
        {viewDist === 'dinamica' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 10 }}>2025</span>
              Visão dinâmica — distribuição por faixa de pendências (0 a 14 e Mais de 15)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1a1a2e' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: 11, borderRight: '1px solid var(--border)' }}>Mês</th>
                  {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(n => (
                    <th key={n} style={{ padding: '10px 8px', textAlign: 'center', color: n === 0 ? '#22c55e' : n <= 4 ? 'var(--text-secondary)' : n <= 9 ? '#f97316' : '#ef4444', fontWeight: 700, fontSize: 11, minWidth: 36 }}>{n}</th>
                  ))}
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: '#7f1d1d', fontWeight: 700, fontSize: 11, background: '#7f1d1d22', minWidth: 60 }}>Mais de 15</th>
                  <th style={{ padding: '10px 10px', textAlign: 'center', color: 'var(--yellow)', fontWeight: 700, fontSize: 11, borderLeft: '1px solid var(--border)', minWidth: 70 }}>Total</th>
                  <th style={{ padding: '10px 10px', textAlign: 'center', color: '#22c55e', fontWeight: 700, fontSize: 11, minWidth: 90 }}>Com pend.</th>
                  <th style={{ padding: '10px 10px', textAlign: 'center', color: '#f97316', fontWeight: 700, fontSize: 11, minWidth: 50 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {DIST_2025.map((row, i) => {
                  const comPend = row.total - row.c0
                  const pct     = Math.round(comPend / row.total * 100)
                  const corPctRow = pct >= 15 ? '#ef4444' : pct >= 8 ? '#f97316' : '#22c55e'
                  return (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)'}
                    >
                      <td style={{ padding: '8px 14px', fontWeight: 700, color: 'var(--yellow)', borderRight: '1px solid var(--border)' }}>{row.mes}</td>
                      {['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14'].map((k, j) => (
                        <td key={k} style={{
                          padding: '8px 8px', textAlign: 'center', fontSize: 12,
                          color: row[k] > 0 ? (j === 0 ? '#22c55e' : j <= 4 ? 'var(--text-secondary)' : j <= 9 ? '#f97316' : '#ef4444') : 'var(--border)',
                          fontWeight: row[k] >= 50 ? 700 : 400,
                          background: row[k] >= 100 ? '#f9731615' : row[k] >= 50 ? '#f9731608' : 'transparent',
                        }}>
                          {row[k] > 0 ? row[k] : ''}
                        </td>
                      ))}
                      <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: row.mais15 > 0 ? 700 : 400, color: row.mais15 > 100 ? '#ef4444' : row.mais15 > 0 ? '#dc2626' : 'var(--border)', background: row.mais15 > 0 ? '#7f1d1d15' : 'transparent' }}>
                        {row.mais15 > 0 ? row.mais15 : ''}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--yellow)', borderLeft: '1px solid var(--border)' }}>{row.total}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: corPctRow, fontWeight: 600 }}>{comPend}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: corPctRow }}>
                        <span style={{ background: corPctRow + '20', padding: '2px 8px', borderRadius: 20 }}>{pct}%</span>
                      </td>
                    </tr>
                  )
                })}
                {/* Total geral */}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--text-primary)', borderRight: '1px solid var(--border)' }}>Total Geral</td>
                  {['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14'].map(k => (
                    <td key={k} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {TOTAIS[k]?.toLocaleString('pt-BR') || ''}
                    </td>
                  ))}
                  <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, color: '#ef4444', background: '#7f1d1d15' }}>
                    {TOTAIS.mais15?.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 800, color: 'var(--yellow)', borderLeft: '1px solid var(--border)' }}>
                    {TOTAIS.total?.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700 }}>
                    {(TOTAIS.total - TOTAIS.c0)?.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 800, color: '#f97316' }}>
                    <span style={{ background: '#f9731620', padding: '2px 8px', borderRadius: 20 }}>
                      {Math.round((TOTAIS.total - TOTAIS.c0) / TOTAIS.total * 100)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardSecao>

      {/* ÚLTIMOS 5 DIAS — com labels */}
      <CardSecao titulo={dadosRecentes.length ? 'Últimos 5 dias — dados em tempo real' : 'Últimos 5 dias operacionais — 2025 (histórico)'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          {diasRecentes.map((d, i) => {
            const pctCrit = d.total > 0 ? Math.round(d.mais5 / d.total * 100) : 0
            const cor = pctCrit >= 40 ? 'var(--red)' : pctCrit >= 20 ? 'var(--orange)' : 'var(--green)'
            return (
              <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px', textAlign: 'center', border: `1px solid ${cor}33` }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{d.dia}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>{d.total}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, marginBottom: 8 }}>veículos</div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, background: 'var(--green-dim)', padding: '2px 6px', borderRadius: 10 }}>
                    {d.menos5} &lt;5
                  </span>
                  <span style={{ fontSize: 11, color: cor, fontWeight: 700, background: cor + '20', padding: '2px 6px', borderRadius: 10 }}>
                    {d.mais5} ≥5
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{ height: '100%', background: cor, borderRadius: 2, width: `${pctCrit}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: cor, marginTop: 3, fontWeight: 700 }}>{pctCrit}% críticos</div>
                </div>
              </div>
            )
          })}
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={diasRecentes} barGap={6} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="dia" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<TooltipCustom />} />
            <Legend iconType="circle" iconSize={8} />
            <Bar dataKey="menos5" name="< 5 pend." fill="#22c55e" maxBarSize={50} stackId="a">
              <LabelList dataKey="menos5" position="inside" style={{ fontSize: 10, fontWeight: 700, fill: '#fff' }} />
            </Bar>
            <Bar dataKey="mais5" name="≥ 5 pend." fill="#ef4444" maxBarSize={50} stackId="a" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="total" position="top" content={LabelTopo} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardSecao>

      {/* TENDÊNCIA EM LINHA — com labels nos pontos */}
      <CardSecao titulo="Tendência de pendências — 2025 (% mensal)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={MENSAL_2025} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 25]} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const prev = MENSAL_2025[MENSAL_2025.findIndex(m => m.mes === label) - 1]
              const curr = payload[0]?.value
              const diff = prev ? curr - prev.pct : null
              return (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                  <div style={{ color: corPct(curr) }}>{curr}% com pendência</div>
                  {diff !== null && (
                    <div style={{ color: diff > 0 ? '#ef4444' : '#22c55e', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {diff > 0 ? <TrendingUp size={12} /> : diff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}pp vs anterior
                    </div>
                  )}
                </div>
              )
            }} />
            <ReferenceLine y={10} stroke="var(--yellow)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="pct" name="% com pend." stroke="#f97316" strokeWidth={2.5}
              dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6 }}>
              <LabelList dataKey="pct" content={LabelLinha} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--yellow)', marginTop: 4 }}>
          — linha amarela = meta de 10%
        </div>
      </CardSecao>
    </div>
  )
}