import { useState, useMemo } from 'react'
import { FileText, Download, Filter, CheckCircle, AlertTriangle, TrendingDown, BarChart2 } from 'lucide-react'
import * as XLSX from 'xlsx-js-style'

export default function Relatorio({ dados = [] }) {
  const [filtroTurno,     setFiltroTurno]     = useState('todos')
  const [filtroResultado, setFiltroResultado] = useState('todos')
  const [filtroAlerta,    setFiltroAlerta]    = useState('todos')
  const [exportando,      setExportando]      = useState(false)

  // ── FILTROS ───────────────────────────────────────────────
  const dadosFiltrados = useMemo(() => dados.filter(row => {
    const resultado = row.resultado ?? row.total ?? 0

    if (filtroTurno !== 'todos' && row.turno !== filtroTurno) return false

    if (filtroResultado === 'sem')  return resultado <= 0
    if (filtroResultado === 'com')  return resultado > 0
    if (filtroResultado === 'crit') return resultado >= 5

    if (filtroAlerta !== 'todos' && row.alerta !== filtroAlerta) return false

    return true
  }), [dados, filtroTurno, filtroResultado, filtroAlerta])

  // ── MÉTRICAS ──────────────────────────────────────────────
  const total        = dadosFiltrados.length
  const semPend      = dadosFiltrados.filter(d => (d.resultado ?? d.total ?? 0) <= 0).length
  const comPend      = dadosFiltrados.filter(d => (d.resultado ?? d.total ?? 0) > 0).length
  const criticos     = dadosFiltrados.filter(d => (d.resultado ?? d.total ?? 0) >= 5).length
  const pctSemPend   = total > 0 ? Math.round(semPend / total * 100) : 0

  // Por turno
  const turno1 = dadosFiltrados.filter(d => d.turno === '1º Turno').length
  const turno2 = dadosFiltrados.filter(d => d.turno === '2º Turno').length

  // ── EXPORTAR EXCEL ────────────────────────────────────────
  async function exportarExcel() {
    setExportando(true)
    try {
      const wb = XLSX.utils.book_new()

      // ── ABA 1: DADOS DETALHADOS ──
      const cabecalho = [
        'Data', 'Doca', 'Remessa', 'Horário', 'Supervisor', 'Turno',
        'Conferente', 'Pend. Expedição', 'Frente Doca', 'Dentro Doca',
        'Resultado', 'Hr Inicio', 'Hr Validado', 'Val. Doca',
        'Hr Liberado', 'Liberado', 'Alerta', 'Observação'
      ]

      const linhas = dadosFiltrados.map(row => [
        row.data        || '',
        row.doca        || '',
        row.remessa     || '',
        row.horario     || '',
        row.supervisor  || '',
        row.turno       || '',
        row.conferente  || '',
        row.pendExp     ?? 0,
        row.pendFrente  ?? 0,
        row.pendDentro  ?? 0,
        row.resultado   ?? row.total ?? 0,
        row.hrInicio    || '',
        row.hrValidado  || '',
        row.valDoca     || '',
        row.hrLiberado  || '',
        row.liberado    || '',
        row.alerta      || '',
        row.observacao  || '',
      ])

      const wsData = [cabecalho, ...linhas]
      const ws1    = XLSX.utils.aoa_to_sheet(wsData)

      // Estilo do cabeçalho
      const corHeader = { fgColor: { rgb: 'F5E642' } }
      const fontHeader = { bold: true, color: { rgb: '1A1A1A' }, name: 'Arial', sz: 11 }
      cabecalho.forEach((_, i) => {
        const cell = ws1[XLSX.utils.encode_cell({ r: 0, c: i })]
        if (cell) {
          cell.s = {
            fill: corHeader,
            font: fontHeader,
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              bottom: { style: 'thin', color: { rgb: '1A1A1A' } },
            }
          }
        }
      })

      // Estilo das linhas de dados
      linhas.forEach((linha, rowIdx) => {
        const resultado = linha[10]
        linha.forEach((_, colIdx) => {
          const cell = ws1[XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx })]
          if (!cell) return
          const bgColor = rowIdx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'
          cell.s = {
            fill: { fgColor: { rgb: bgColor } },
            font: { name: 'Arial', sz: 10 },
            alignment: { vertical: 'center', horizontal: colIdx >= 7 && colIdx <= 10 ? 'center' : 'left' },
          }
          // Cor na coluna Resultado
          if (colIdx === 10) {
            cell.s.font = {
              name: 'Arial', sz: 10, bold: true,
              color: { rgb: resultado >= 5 ? 'EF4444' : resultado >= 3 ? 'F97316' : resultado > 0 ? 'F59E0B' : '22C55E' }
            }
          }
          // Cor na coluna Alerta
          if (colIdx === 16 && linha[16]) {
            cell.s.font = {
              name: 'Arial', sz: 10, bold: true,
              color: { rgb: linha[16] === 'GERENTE' ? 'EF4444' : 'F97316' }
            }
          }
        })
      })

      // Larguras das colunas
      ws1['!cols'] = [
        {wch:10}, {wch:8},  {wch:14}, {wch:10}, {wch:12}, {wch:10},
        {wch:14}, {wch:14}, {wch:12}, {wch:12}, {wch:10}, {wch:10},
        {wch:12}, {wch:10}, {wch:12}, {wch:10}, {wch:12}, {wch:20},
      ]
      ws1['!rows'] = [{ hpt: 20 }] // altura do cabeçalho

      XLSX.utils.book_append_sheet(wb, ws1, 'Dados Detalhados')

      // ── ABA 2: RESUMO ──
      const hoje      = new Date().toLocaleDateString('pt-BR')
      const resumo = [
        ['RELATÓRIO DE EXPEDIÇÃO — GRUPO PERNAMBUCANAS', '', '', ''],
        [`Gerado em: ${hoje}`, '', '', ''],
        ['', '', '', ''],
        ['RESUMO GERAL', '', '', ''],
        ['Total de docas',         total,    '',    ''],
        ['Sem pendências',         semPend,  `${pctSemPend}%`,  ''],
        ['Com pendências',         comPend,  `${100 - pctSemPend}%`, ''],
        ['Críticos (resultado ≥5)', criticos, `${total > 0 ? Math.round(criticos/total*100) : 0}%`, ''],
        ['', '', '', ''],
        ['POR TURNO', '', '', ''],
        ['1º Turno (Virginia)',  turno1, total > 0 ? `${Math.round(turno1/total*100)}%` : '0%', ''],
        ['2º Turno (Magdiel)',   turno2, total > 0 ? `${Math.round(turno2/total*100)}%` : '0%', ''],
        ['', '', '', ''],
        ['FILTROS APLICADOS', '', '', ''],
        ['Turno',     filtroTurno     === 'todos' ? 'Todos' : filtroTurno,     '', ''],
        ['Resultado', filtroResultado === 'todos' ? 'Todos' : filtroResultado === 'sem' ? 'Sem pendência' : filtroResultado === 'com' ? 'Com pendência' : 'Críticos (≥5)', '', ''],
        ['Alerta',    filtroAlerta    === 'todos' ? 'Todos' : filtroAlerta,    '', ''],
      ]

      const ws2 = XLSX.utils.aoa_to_sheet(resumo)

      // Título principal
      const tituloCell = ws2['A1']
      if (tituloCell) {
        tituloCell.s = {
          font: { bold: true, sz: 14, name: 'Arial', color: { rgb: '1A1A1A' } },
          fill: { fgColor: { rgb: 'F5E642' } },
          alignment: { horizontal: 'left', vertical: 'center' },
        }
      }

      // Seções em negrito
      ;[3, 9, 13].forEach(rowIdx => {
        const cell = ws2[XLSX.utils.encode_cell({ r: rowIdx, c: 0 })]
        if (cell) cell.s = { font: { bold: true, sz: 11, name: 'Arial', color: { rgb: '1A1A1A' } }, fill: { fgColor: { rgb: 'E5E5E5' } } }
      })

      ws2['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 10 }]
      ws2['!rows'] = [{ hpt: 24 }]

      XLSX.utils.book_append_sheet(wb, ws2, 'Resumo')

      // Nome do arquivo
      const dataHoje  = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
      const filtroStr = filtroTurno !== 'todos' ? `_${filtroTurno.replace('º ', '')}` : ''
      const nomeArq   = `relatorio_expedicao${filtroStr}_${dataHoje}.xlsx`

      XLSX.writeFile(wb, nomeArq)
    } catch (err) {
      console.error('Erro ao exportar:', err)
      alert('Erro ao gerar Excel: ' + err.message)
    }
    setExportando(false)
  }

  // ── ESTILOS COMPARTILHADOS ────────────────────────────────
  const S = {
    select: {
      padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
      background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13,
      outline: 'none', cursor: 'pointer', minWidth: 140,
    },
    label: {
      fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
      display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Relatório de Expedição</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Filtre os dados e exporte em Excel com formatação profissional.
        </p>
      </div>

      {/* FILTROS */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={12} /> Filtros
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, alignItems: 'end' }}>

          {/* Turno */}
          <div>
            <label style={S.label}>Turno</label>
            <select value={filtroTurno} onChange={e => setFiltroTurno(e.target.value)} style={S.select}
              onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            >
              <option value="todos">Todos os turnos</option>
              <option value="1º Turno">1º Turno (Virginia)</option>
              <option value="2º Turno">2º Turno (Magdiel)</option>
            </select>
          </div>

          {/* Resultado */}
          <div>
            <label style={S.label}>Resultado</label>
            <select value={filtroResultado} onChange={e => setFiltroResultado(e.target.value)} style={S.select}
              onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            >
              <option value="todos">Todos</option>
              <option value="sem">Sem pendência (= 0)</option>
              <option value="com">Com pendência (&gt; 0)</option>
              <option value="crit">Críticos (≥ 5)</option>
            </select>
          </div>

          {/* Alerta */}
          <div>
            <label style={S.label}>Alerta</label>
            <select value={filtroAlerta} onChange={e => setFiltroAlerta(e.target.value)} style={S.select}
              onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            >
              <option value="todos">Todos</option>
              <option value="">Sem alerta</option>
              <option value="COORDENADOR">Coordenador</option>
              <option value="GERENTE">Gerente</option>
            </select>
          </div>

          {/* Botão exportar */}
          <div>
            <label style={{ ...S.label, opacity: 0 }}>Export</label>
            <button onClick={exportarExcel} disabled={exportando || total === 0} style={{
              width: '100%', background: exportando || total === 0 ? 'var(--border)' : 'var(--yellow)',
              border: 'none', borderRadius: 8, padding: '9px 16px',
              cursor: exportando || total === 0 ? 'not-allowed' : 'pointer',
              color: exportando || total === 0 ? 'var(--text-muted)' : '#1a1a1a',
              fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Download size={14} />
              {exportando ? 'Gerando...' : 'Exportar Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* CARDS DE MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total filtrado',     valor: total,    cor: '#3b82f6', icon: <FileText size={16} />,       sub: 'docas no período' },
          { label: 'Sem pendências',     valor: `${semPend} (${pctSemPend}%)`, cor: '#22c55e', icon: <CheckCircle size={16} />, sub: 'liberadas ok' },
          { label: 'Com pendências',     valor: comPend,  cor: '#f97316', icon: <AlertTriangle size={16} />,  sub: `${100 - pctSemPend}% do total` },
          { label: 'Críticos (≥ 5)',     valor: criticos, cor: '#ef4444', icon: <TrendingDown size={16} />,   sub: 'foram para gerente' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.cor}33`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.cor }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: c.cor, lineHeight: 1 }}>{c.valor}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.sub}</div>
              </div>
              <div style={{ color: c.cor, opacity: 0.5 }}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* RESUMO POR TURNO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { turno: '1º Turno', supervisor: 'Virginia', qtd: turno1, cor: 'var(--blue)' },
          { turno: '2º Turno', supervisor: 'Magdiel',  qtd: turno2, cor: 'var(--orange)' },
        ].map((t, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)', borderLeft: `4px solid ${t.cor}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.cor, marginBottom: 4 }}>{t.turno} — {t.supervisor}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{t.qtd}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {total > 0 ? Math.round(t.qtd / total * 100) : 0}% do total filtrado
            </div>
          </div>
        ))}
      </div>

      {/* TABELA DE DADOS */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {total} registro(s)
          </span>
          {total === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ajuste os filtros acima</span>
          )}
        </div>

        {total === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Nenhum dado encontrado</div>
            <div style={{ fontSize: 13 }}>Tente outros filtros</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Data','Doca','Remessa','Supervisor','Turno','P.Exp','Frente','Dentro','Result.','Val.Doca','Liberado','Alerta'].map(col => (
                    <th key={col} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((row, i) => {
                  const resultado = row.resultado ?? row.total ?? 0
                  return (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 11 }}>{row.data}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--yellow)' }}>{row.doca}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{row.remessa}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: row.supervisor === 'Virginia' ? 'var(--blue)' : 'var(--orange)', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.supervisor}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>{row.turno}</td>
                      <td style={{ padding: '10px 12px', color: (row.pendExp ?? 0) > 0 ? 'var(--red)' : 'var(--text-muted)', fontWeight: 700 }}>{row.pendExp ?? 0}</td>
                      <td style={{ padding: '10px 12px', color: (row.pendFrente ?? 0) > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{row.pendFrente ?? 0}</td>
                      <td style={{ padding: '10px 12px', color: (row.pendDentro ?? 0) > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{row.pendDentro ?? 0}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: resultado >= 5 ? 'var(--red)' : resultado >= 3 ? 'var(--yellow)' : resultado > 0 ? 'var(--orange)' : 'var(--green)' }}>{resultado}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{row.valDoca || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: row.liberado === 'SIM' ? 'var(--green-dim)' : 'var(--red-dim)', color: row.liberado === 'SIM' ? 'var(--green)' : 'var(--red)' }}>
                          {row.liberado || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {row.alerta && (
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: row.alerta === 'GERENTE' ? 'var(--red-dim)' : 'var(--orange-dim)', color: row.alerta === 'GERENTE' ? 'var(--red)' : 'var(--orange)' }}>
                            {row.alerta}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}