import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Cell, LabelList
} from 'recharts'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

// ─── DADOS 2025 ───────────────────────────────────────────
// pct = Total com pendência / Total de carros * 100
// semPend = coluna 0 (veículos sem nenhuma pendência)
const MENSAL_2025 = [
  { mes: 'jan', total: 812,  semPend: 178, comPend: 634,  mais5: 36,  pct: 78 },
  { mes: 'fev', total: 935,  semPend: 116, comPend: 819,  mais5: 162, pct: 88 },
  { mes: 'mar', total: 971,  semPend: 67,  comPend: 904,  mais5: 351, pct: 93 },
  { mes: 'abr', total: 1064, semPend: 18,  comPend: 1046, mais5: 732, pct: 98 },
  { mes: 'mai', total: 1077, semPend: 41,  comPend: 1036, mais5: 500, pct: 96 },
  { mes: 'jun', total: 836,  semPend: 55,  comPend: 781,  mais5: 233, pct: 93 },
  { mes: 'jul', total: 414,  semPend: 13,  comPend: 401,  mais5: 67,  pct: 97 },
  { mes: 'ago', total: 849,  semPend: 160, comPend: 689,  mais5: 52,  pct: 81 },
  { mes: 'set', total: 1102, semPend: 122, comPend: 980,  mais5: 80,  pct: 89 },
  { mes: 'out', total: 1197, semPend: 88,  comPend: 1109, mais5: 204, pct: 93 },
  { mes: 'nov', total: 1091, semPend: 122, comPend: 969,  mais5: 106, pct: 89 },
  { mes: 'dez', total: 853,  semPend: 92,  comPend: 761,  mais5: 57,  pct: 89 },
]

// ─── DADOS 2026 ───────────────────────────────────────────
const MENSAL_2026 = [
  { mes: 'jan', total: 630,  semPend: 145, comPend: 485, mais5: 56,  pct: 77 },
  { mes: 'fev', total: 689,  semPend: 114, comPend: 575, mais5: 68,  pct: 83 },
  { mes: 'mar', total: 1113, semPend: 119, comPend: 994, mais5: 244, pct: 89 },
  { mes: 'abr', total: 841,  semPend: 55,  comPend: 786, mais5: 220, pct: 93 },
]

// ─── DISTRIBUIÇÃO 2025 ───────────────────────────────────
const DIST_2025 = [
  { mes: 'jan', c0:178,c1:196,c2:168,c3:111,c4:50, c5:45, c6:33, c7:10,c8:3, c9:5, c10:5, c11:4, c12:4, c13:0, c14:0, mais15:0,   total:812  },
  { mes: 'fev', c0:116,c1:133,c2:163,c3:149,c4:95, c5:73, c6:53, c7:36,c8:22,c9:25,c10:13,c11:18,c12:6, c13:7, c14:4, mais15:22,  total:935  },
  { mes: 'mar', c0:67, c1:94, c2:94, c3:123,c4:102,c5:85, c6:81, c7:72,c8:39,c9:48,c10:31,c11:27,c12:18,c13:15,c14:9, mais15:66,  total:971  },
  { mes: 'abr', c0:18, c1:32, c2:49, c3:67, c4:69, c5:69, c6:86, c7:72,c8:84,c9:68,c10:66,c11:56,c12:49,c13:42,c14:35,mais15:202, total:1064 },
  { mes: 'mai', c0:41, c1:64, c2:95, c3:100,c4:114,c5:94, c6:76, c7:59,c8:62,c9:65,c10:58,c11:45,c12:30,c13:25,c14:30,mais15:119, total:1077 },
  { mes: 'jun', c0:55, c1:106,c2:112,c3:110,c4:95, c5:80, c6:67, c7:53,c8:41,c9:19,c10:22,c11:15,c12:11,c13:7, c14:11,mais15:32,  total:836  },
  { mes: 'jul', c0:13, c1:43, c2:48, c3:64, c4:53, c5:57, c6:32, c7:27,c8:22,c9:17,c10:9, c11:4, c12:9, c13:0, c14:2, mais15:14,  total:414  },
  { mes: 'ago', c0:160,c1:181,c2:161,c3:121,c4:88, c5:55, c6:36, c7:19,c8:13,c9:7, c10:3, c11:2, c12:0, c13:0, c14:2, mais15:1,   total:849  },
  { mes: 'set', c0:122,c1:187,c2:209,c3:179,c4:121,c5:97, c6:69, c7:38,c8:21,c9:20,c10:10,c11:12,c12:6, c13:4, c14:2, mais15:5,   total:1102 },
  { mes: 'out', c0:88, c1:144,c2:164,c3:192,c4:133,c5:146,c6:100,c7:63,c8:43,c9:24,c10:23,c11:18,c12:13,c13:11,c14:6, mais15:29,  total:1197 },
  { mes: 'nov', c0:122,c1:158,c2:223,c3:145,c4:122,c5:95, c6:61, c7:53,c8:33,c9:16,c10:14,c11:12,c12:6, c13:5, c14:5, mais15:21,  total:1091 },
  { mes: 'dez', c0:92, c1:184,c2:144,c3:136,c4:89, c5:72, c6:44, c7:36,c8:19,c9:10,c10:10,c11:5, c12:4, c13:2, c14:0, mais15:6,   total:853  },
]

// ─── DISTRIBUIÇÃO 2026 ───────────────────────────────────
const DIST_2026 = [
  { mes: 'jan', c0:145,c1:127,c2:122,c3:93, c4:54, c5:30, c6:22, c7:14,c8:12,c9:4, c10:2, c11:1, c12:2, c13:1, c14:0, mais15:1,  total:630  },
  { mes: 'fev', c0:114,c1:183,c2:135,c3:94, c4:54, c5:42, c6:22, c7:16,c8:11,c9:3, c10:4, c11:7, c12:1, c13:2, c14:0, mais15:1,  total:689  },
  { mes: 'mar', c0:119,c1:206,c2:186,c3:181,c4:112,c5:100,c6:56, c7:31,c8:29,c9:20,c10:13,c11:12,c12:13,c13:11,c14:5, mais15:19, total:1113 },
  { mes: 'abr', c0:55, c1:100,c2:109,c3:145,c4:98, c5:99, c6:72, c7:45,c8:30,c9:14,c10:13,c11:15,c12:14,c13:9, c14:9, mais15:14, total:841  },
]

const TOTAIS_2025 = DIST_2025.reduce((acc, row) => {
  ['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14','mais15','total'].forEach(k => {
    acc[k] = (acc[k] || 0) + (row[k] || 0)
  })
  return acc
}, {})

const TOTAIS_2026 = DIST_2026.reduce((acc, row) => {
  ['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14','mais15','total'].forEach(k => {
    acc[k] = (acc[k] || 0) + (row[k] || 0)
  })
  return acc
}, {})

const ULTIMOS_5_DIAS = [
  { dia: '31/01', total: 31,  menos5: 31, mais5: 0  },
  { dia: '31/03', total: 33,  menos5: 7,  mais5: 26 },
  { dia: '31/05', total: 50,  menos5: 16, mais5: 34 },
  { dia: '31/10', total: 45,  menos5: 40, mais5: 5  },
  { dia: '30/12', total: 40,  menos5: 38, mais5: 2  },
]

// % com pendência (cor por faixa)
const corPct = (pct) => pct >= 90 ? '#ef4444' : pct >= 80 ? '#f97316' : '#22c55e'

const LabelTopo = ({ x, y, width, value }) => {
  if (!value || value === 0) return null
  return <text x={x + width / 2} y={y - 4} fill="var(--text-muted)" textAnchor="middle" fontSize={10} fontWeight={600}>{value}</text>
}

const LabelLinha = ({ x, y, value }) => {
  if (!value) return null
  return <text x={x} y={y - 8} fill="var(--orange)" textAnchor="middle" fontSize={10} fontWeight={700}>{value}%</text>
}

const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const titulo = payload[0]?.payload?.mes || label
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{titulo}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span><strong>{p.value?.toLocaleString('pt-BR')}</strong>
        </div>
      ))}
    </div>
  )
}

function CardSecao({ titulo, badge, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {badge && <span style={{ background: badge === '2026' ? 'var(--blue-dim)' : 'var(--yellow-dim)', color: badge === '2026' ? 'var(--blue)' : 'var(--yellow)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 10 }}>{badge}</span>}
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{titulo}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

function TabelaDistribuicao({ dados, totais, ano }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        <span style={{ background: ano === '2026' ? 'var(--blue-dim)' : 'var(--yellow-dim)', color: ano === '2026' ? 'var(--blue)' : 'var(--yellow)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 10, marginRight: 8 }}>{ano}</span>
        Distribuição por faixa · deslize para ver todas as colunas →
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 700 }}>
        <thead>
          <tr style={{ background: '#1a1a2e' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#1a1a2e', zIndex: 1 }}>Mês</th>
            {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(n => (
              <th key={n} style={{ padding: '8px 7px', textAlign: 'center', color: n === 0 ? '#22c55e' : n <= 4 ? 'var(--text-secondary)' : n <= 9 ? '#f97316' : '#ef4444', fontWeight: 700, fontSize: 11, minWidth: 32 }}>{n}</th>
            ))}
            <th style={{ padding: '8px 7px', textAlign: 'center', color: '#7f1d1d', fontWeight: 700, fontSize: 11, background: '#7f1d1d22', minWidth: 44, whiteSpace: 'nowrap' }}>15+</th>
            <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--yellow)', fontWeight: 700, fontSize: 11, minWidth: 54 }}>Total</th>
            <th style={{ padding: '8px 8px', textAlign: 'center', color: '#f97316', fontWeight: 700, fontSize: 11, minWidth: 60, whiteSpace: 'nowrap' }}>C/ pend.</th>
            <th style={{ padding: '8px 8px', textAlign: 'center', color: '#f97316', fontWeight: 700, fontSize: 11, minWidth: 40 }}>%</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((row, i) => {
            const comPend = row.total - row.c0
            const pct = Math.round(comPend / row.total * 100)
            const corP = corPct(pct)
            return (
              <tr key={i} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                <td style={{ padding: '7px 12px', fontWeight: 700, color: ano === '2026' ? 'var(--blue)' : 'var(--yellow)', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)', zIndex: 1 }}>{row.mes}</td>
                {['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14'].map((k, j) => (
                  <td key={k} style={{ padding: '7px 7px', textAlign: 'center', color: row[k] > 0 ? (j === 0 ? '#22c55e' : j <= 4 ? 'var(--text-secondary)' : j <= 9 ? '#f97316' : '#ef4444') : 'var(--border)', fontWeight: row[k] >= 50 ? 700 : 400 }}>
                    {row[k] > 0 ? row[k] : ''}
                  </td>
                ))}
                <td style={{ padding: '7px 7px', textAlign: 'center', fontWeight: row.mais15 > 0 ? 700 : 400, color: row.mais15 > 0 ? '#dc2626' : 'var(--border)', background: row.mais15 > 0 ? '#7f1d1d15' : 'transparent' }}>
                  {row.mais15 > 0 ? row.mais15 : ''}
                </td>
                <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: ano === '2026' ? 'var(--blue)' : 'var(--yellow)' }}>{row.total}</td>
                <td style={{ padding: '7px 8px', textAlign: 'center', color: corP, fontWeight: 600 }}>{comPend}</td>
                <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 800 }}>
                  <span style={{ background: corP + '20', padding: '2px 6px', borderRadius: 20, color: corP }}>{pct}%</span>
                </td>
              </tr>
            )
          })}
          {/* Total geral */}
          <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-secondary)', fontWeight: 700 }}>
            <td style={{ padding: '8px 12px', fontWeight: 800, position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>Total</td>
            {['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14'].map(k => (
              <td key={k} style={{ padding: '8px 7px', textAlign: 'center', fontWeight: 700 }}>{totais[k] || ''}</td>
            ))}
            <td style={{ padding: '8px 7px', textAlign: 'center', fontWeight: 800, color: '#ef4444' }}>{totais.mais15}</td>
            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: ano === '2026' ? 'var(--blue)' : 'var(--yellow)' }}>{totais.total?.toLocaleString('pt-BR')}</td>
            <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700 }}>{(totais.total - totais.c0)?.toLocaleString('pt-BR')}</td>
            <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 800, color: '#f97316' }}>
              <span style={{ background: '#f9731620', padding: '2px 6px', borderRadius: 20 }}>
                {Math.round((totais.total - totais.c0) / totais.total * 100)}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function DashboardHistorico({ dadosRecentes = [] }) {
  const [viewDist, setViewDist] = useState('grafico')
  const [ano, setAno]           = useState('2025')

  // Totais 2025 corrigidos
  const total2025   = MENSAL_2025.reduce((s, m) => s + m.total, 0)   // 11.201
  const comPend2025 = MENSAL_2025.reduce((s, m) => s + m.comPend, 0)
  const mais5_2025  = MENSAL_2025.reduce((s, m) => s + m.mais5, 0)

  // Totais 2026
  const total2026   = MENSAL_2026.reduce((s, m) => s + m.total, 0)   // 3.273
  const comPend2026 = MENSAL_2026.reduce((s, m) => s + m.comPend, 0) // 2.840
  const mais5_2026  = MENSAL_2026.reduce((s, m) => s + m.mais5, 0)

  // Melhor mês = MENOR % com pendência
  const melhorMes2025 = MENSAL_2025.reduce((b, m) => m.pct < b.pct ? m : b)
  const melhorMes2026 = MENSAL_2026.reduce((b, m) => m.pct < b.pct ? m : b)

  // Dados recentes do Sheets para últimos 5 dias
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

  // Comparativo 2025 vs 2026 (meses em comum)
  const mesesComuns = ['jan','fev','mar','abr']
  const comparativo = mesesComuns.map(mes => {
    const m25 = MENSAL_2025.find(m => m.mes === mes)
    const m26 = MENSAL_2026.find(m => m.mes === mes)
    return {
      mes,
      pct25: m25?.pct || 0,
      pct26: m26?.pct || 0,
      total25: m25?.total || 0,
      total26: m26?.total || 0,
    }
  })

  const dadosAtual    = ano === '2025' ? DIST_2025 : DIST_2026
  const totaisAtual   = ano === '2025' ? TOTAIS_2025 : TOTAIS_2026
  const mensalAtual   = ano === '2025' ? MENSAL_2025 : MENSAL_2026
  const corAno        = ano === '2025' ? 'var(--yellow)' : 'var(--blue)'

  return (
    <div>
      {/* CARDS RESUMO — toggle 2025/2026 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['2025','2026'].map(a => (
          <button key={a} onClick={() => setAno(a)} style={{
            padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: ano === a ? (a === '2026' ? 'var(--blue)' : 'var(--yellow)') : 'var(--bg-card)',
            color: ano === a ? (a === '2026' ? '#fff' : '#1a1a1a') : 'var(--text-muted)',
            border: `1px solid ${ano === a ? (a === '2026' ? 'var(--blue)' : 'var(--yellow)') : 'var(--border)'}`,
          }}>{a}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {(ano === '2025' ? [
          { label: 'Total 2025',        valor: total2025.toLocaleString('pt-BR'),   cor: '#3b82f6', sub: 'veículos expedidos' },
          { label: 'Com pendências',    valor: comPend2025.toLocaleString('pt-BR'), cor: '#f97316', sub: `${Math.round(comPend2025/total2025*100)}% do total` },
          { label: 'Críticos (≥5)',     valor: mais5_2025.toLocaleString('pt-BR'),  cor: '#ef4444', sub: `${Math.round(mais5_2025/total2025*100)}% do total` },
          { label: `Melhor mês — ${melhorMes2025.mes.toUpperCase()}`, valor: `${melhorMes2025.pct}%`, cor: '#22c55e', sub: 'menor % com pendências' },
        ] : [
          { label: 'Total 2026',        valor: total2026.toLocaleString('pt-BR'),   cor: '#3b82f6', sub: `${MENSAL_2026.length} meses registrados` },
          { label: 'Com pendências',    valor: comPend2026.toLocaleString('pt-BR'), cor: '#f97316', sub: `${Math.round(comPend2026/total2026*100)}% do total` },
          { label: 'Críticos (≥5)',     valor: mais5_2026.toLocaleString('pt-BR'),  cor: '#ef4444', sub: `${Math.round(mais5_2026/total2026*100)}% do total` },
          { label: `Melhor mês — ${melhorMes2026.mes.toUpperCase()}`, valor: `${melhorMes2026.pct}%`, cor: '#22c55e', sub: 'menor % com pendências' },
        ]).map((c, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.cor}33`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.cor }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: c.cor, lineHeight: 1 }}>{c.valor}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* EVOLUÇÃO MENSAL */}
      <CardSecao titulo={`Evolução mensal ${ano} — veículos expedidos`} badge={ano}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={mensalAtual} barGap={2} margin={{ top: 20, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} width={35} />
            <Tooltip content={<TooltipCustom />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="semPend" name="Sem pendência" stackId="a" fill="#22c55e" maxBarSize={40} />
            <Bar dataKey="comPend" name="Com pendência" stackId="a" fill="#f97316" radius={[4,4,0,0]} maxBarSize={40}>
              <LabelList dataKey="total" position="top" content={LabelTopo} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardSecao>

      {/* % POR MÊS */}
      <CardSecao titulo={`% com pendência por mês — ${ano}`} badge={ano}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mensalAtual} barGap={4} margin={{ top: 22, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} width={35} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const d = mensalAtual.find(m => m.mes === (payload[0]?.payload?.mes || label))
              return (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{d?.mes}</div>
                  <div style={{ color: corPct(payload[0]?.value) }}>{payload[0]?.value}% com pendência</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Total: {d?.total} veículos</div>
                </div>
              )
            }} />
            <ReferenceLine y={10} stroke="var(--yellow)" strokeDasharray="4 4" label={{ value: 'meta 10%', position: 'insideTopRight', fontSize: 9, fill: 'var(--yellow)' }} />
            <Bar dataKey="pct" name="% pendência" maxBarSize={40} radius={[4,4,0,0]}>
              {mensalAtual.map((entry, i) => <Cell key={i} fill={corPct(entry.pct)} />)}
              <LabelList dataKey="pct" position="top" formatter={v => `${v}%`} style={{ fontSize: 9, fontWeight: 700, fill: 'var(--text-muted)' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-muted)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {[['#22c55e','≤ 79%'],['#f97316','80–89%'],['#ef4444','≥ 90%']].map(([cor, label]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, display: 'inline-block' }} />{label}
            </span>
          ))}
        </div>
      </CardSecao>

      {/* DISTRIBUIÇÃO POR FAIXA */}
      <CardSecao titulo={`Distribuição por faixa de pendências — ${ano}`} badge={ano}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { key: 'grafico',  label: 'Gráfico' },
            { key: 'tabela',   label: 'Tabela simples' },
            { key: 'dinamica', label: 'Tabela dinâmica' },
          ].map(v => (
            <button key={v.key} onClick={() => setViewDist(v.key)} style={{
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
              background: viewDist === v.key ? (ano === '2026' ? 'var(--blue)' : 'var(--yellow)') : 'var(--bg-secondary)',
              color: viewDist === v.key ? (ano === '2026' ? '#fff' : '#1a1a1a') : 'var(--text-muted)',
              fontWeight: viewDist === v.key ? 700 : 400,
            }}>{v.label}</button>
          ))}
        </div>

        {viewDist === 'grafico' && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dadosAtual} barGap={1} margin={{ top: 20, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} width={35} />
              <Tooltip content={<TooltipCustom />} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="c0"    name="0"    stackId="a" fill="#22c55e" maxBarSize={40} />
              <Bar dataKey="c1"    name="1"    stackId="a" fill="#86efac" maxBarSize={40} />
              <Bar dataKey="c2"    name="2"    stackId="a" fill="#fde68a" maxBarSize={40} />
              <Bar dataKey="c3"    name="3"    stackId="a" fill="#fed7aa" maxBarSize={40} />
              <Bar dataKey="c4"    name="4"    stackId="a" fill="#fdba74" maxBarSize={40} />
              <Bar dataKey="c5"    name="5"    stackId="a" fill="#f97316" maxBarSize={40} />
              <Bar dataKey="c6"    name="6"    stackId="a" fill="#fb923c" maxBarSize={40} />
              <Bar dataKey="c7"    name="7"    stackId="a" fill="#f87171" maxBarSize={40} />
              <Bar dataKey="c8"    name="8"    stackId="a" fill="#ef4444" maxBarSize={40} />
              <Bar dataKey="c9"    name="9"    stackId="a" fill="#dc2626" maxBarSize={40} />
              <Bar dataKey="c10"   name="10+"  stackId="a" fill="#b91c1c" maxBarSize={40} />
              <Bar dataKey="mais15" name="15+" stackId="a" fill="#7f1d1d" radius={[4,4,0,0]} maxBarSize={40}>
                <LabelList dataKey="total" position="top" content={LabelTopo} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {viewDist === 'tabela' && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Mês','0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15+','Total'].map(c => (
                    <th key={c} style={{ padding: '7px 8px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dadosAtual.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 700, color: corAno, whiteSpace: 'nowrap' }}>{row.mes}</td>
                    {['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14'].map(k => (
                      <td key={k} style={{ padding: '7px 8px', textAlign: 'center', color: row[k] > 0 ? 'var(--text-primary)' : 'var(--border)' }}>{row[k] || ''}</td>
                    ))}
                    <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: row.mais15 > 0 ? '#ef4444' : 'var(--border)' }}>{row.mais15 || ''}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: corAno }}>{row.total}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  <td style={{ padding: '8px', fontWeight: 800 }}>Total</td>
                  {['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14'].map(k => (
                    <td key={k} style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{totaisAtual[k] || ''}</td>
                  ))}
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>{totaisAtual.mais15}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: corAno }}>{totaisAtual.total?.toLocaleString('pt-BR')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {viewDist === 'dinamica' && <TabelaDistribuicao dados={dadosAtual} totais={totaisAtual} ano={ano} />}
      </CardSecao>

      {/* COMPARATIVO 2025 vs 2026 */}
      <CardSecao titulo="Comparativo % com pendência — 2025 vs 2026">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={comparativo} barGap={4} margin={{ top: 20, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} width={35} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const p25 = payload.find(p => p.dataKey === 'pct25')?.value
              const p26 = payload.find(p => p.dataKey === 'pct26')?.value
              const diff = p26 != null && p25 != null ? p26 - p25 : null
              return (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
                  {p25 != null && <div style={{ color: 'var(--yellow)' }}>2025: {p25}%</div>}
                  {p26 != null && <div style={{ color: 'var(--blue)' }}>2026: {p26}%</div>}
                  {diff != null && (
                    <div style={{ color: diff > 0 ? '#ef4444' : '#22c55e', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {diff > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {diff > 0 ? '+' : ''}{diff.toFixed(0)}pp em 2026
                    </div>
                  )}
                </div>
              )
            }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={10} stroke="var(--yellow)" strokeDasharray="4 4" />
            <Bar dataKey="pct25" name="2025" fill="var(--yellow)" maxBarSize={36} radius={[4,4,0,0]} opacity={0.8}>
              <LabelList dataKey="pct25" position="top" formatter={v => `${v}%`} style={{ fontSize: 10, fill: 'var(--yellow)' }} />
            </Bar>
            <Bar dataKey="pct26" name="2026" fill="var(--blue)" maxBarSize={36} radius={[4,4,0,0]}>
              <LabelList dataKey="pct26" position="top" formatter={v => `${v}%`} style={{ fontSize: 10, fill: 'var(--blue)' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {comparativo.map((m, i) => {
            const diff = m.pct26 - m.pct25
            const melhorou = diff < 0
            return (
              <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 12px', border: `1px solid ${melhorou ? 'var(--green-dim)' : '#ef444430'}`, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>{m.mes}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 800 }}>
                  <span style={{ color: 'var(--yellow)' }}>{m.pct25}%</span>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                  <span style={{ color: 'var(--blue)' }}>{m.pct26}%</span>
                </div>
                <div style={{ fontSize: 11, marginTop: 4, color: melhorou ? 'var(--green)' : 'var(--red)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  {melhorou ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                  {diff > 0 ? '+' : ''}{diff}pp
                </div>
              </div>
            )
          })}
        </div>
      </CardSecao>

      {/* ÚLTIMOS 5 DIAS */}
      <CardSecao titulo={dadosRecentes.length ? 'Últimos 5 dias — tempo real' : 'Últimos 5 dias — histórico'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
          {diasRecentes.map((d, i) => {
            const pct = d.total > 0 ? Math.round(d.mais5 / d.total * 100) : 0
            const cor = pct >= 40 ? 'var(--red)' : pct >= 20 ? 'var(--orange)' : 'var(--green)'
            return (
              <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 6px', textAlign: 'center', border: `1px solid ${cor}33` }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{d.dia}</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{d.total}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>veíc.</div>
                <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, background: 'var(--green-dim)', padding: '1px 5px', borderRadius: 8 }}>{d.menos5}</span>
                  <span style={{ fontSize: 10, color: cor, fontWeight: 700, background: cor + '20', padding: '1px 5px', borderRadius: 8 }}>{d.mais5}</span>
                </div>
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 6 }}>
                  <div style={{ height: '100%', background: cor, borderRadius: 2, width: `${pct}%` }} />
                </div>
                <div style={{ fontSize: 9, color: cor, marginTop: 2, fontWeight: 700 }}>{pct}%</div>
              </div>
            )
          })}
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={diasRecentes} barGap={6} margin={{ top: 18, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="dia" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} width={30} />
            <Tooltip content={<TooltipCustom />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="menos5" name="< 5 pend." fill="#22c55e" maxBarSize={48} stackId="a">
              <LabelList dataKey="menos5" position="inside" style={{ fontSize: 10, fontWeight: 700, fill: '#fff' }} />
            </Bar>
            <Bar dataKey="mais5" name="≥ 5 pend." fill="#ef4444" maxBarSize={48} stackId="a" radius={[4,4,0,0]}>
              <LabelList dataKey="total" position="top" content={LabelTopo} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardSecao>

      {/* TENDÊNCIA */}
      <CardSecao titulo={`Tendência ${ano} — % mensal com pendências`} badge={ano}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={mensalAtual} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} width={35} />
            <Tooltip content={<TooltipCustom />} />
            <ReferenceLine y={10} stroke="var(--yellow)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="pct" name="% pend." stroke={ano === '2026' ? 'var(--blue)' : '#f97316'} strokeWidth={2.5} dot={{ fill: ano === '2026' ? 'var(--blue)' : '#f97316', r: 3 }} activeDot={{ r: 5 }}>
              <LabelList dataKey="pct" content={LabelLinha} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--yellow)', marginTop: 4 }}>— meta de 10%</div>
      </CardSecao>
    </div>
  )
}