import { useState } from 'react'
import { FileText, Download, Calendar, Filter } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx-js-style'

export default function Relatorio({ dados }) {
  const [formato, setFormato]         = useState('pdf')
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim]   = useState('')
  const [gerando, setGerando]         = useState(false)

  const dias = [...new Set(dados.map(d => d.data))].sort()

  const dadosFiltrados = dados.filter(d => {
    if (!periodoInicio && !periodoFim) return true
    const [dia, mes] = d.data.split('/')
    const dataRow = `${mes}/${dia}`
    if (periodoInicio && d.data < periodoInicio) return false
    if (periodoFim   && d.data > periodoFim)     return false
    return true
  })

  async function gerarPDF() {
    setGerando(true)
    const doc = new jsPDF({ orientation: 'landscape' })

    // Header
    doc.setFillColor(26, 31, 46)
    doc.rect(0, 0, 297, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Relatório de Validação de Expedição', 14, 12)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22)
    doc.text(`Total de registros: ${dadosFiltrados.length}`, 200, 22)

    // Resumo
    const totalDocas     = dadosFiltrados.length
    const totalLiberadas = dadosFiltrados.filter(d => d.liberado === 'SIM').length
    const totalAlertas   = dadosFiltrados.filter(d => d.alerta !== '').length
    const totalCriticos  = dadosFiltrados.filter(d => d.alerta === 'GERENTE').length

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumo Consolidado', 14, 40)

    autoTable(doc, {
      startY: 44,
      head: [['Total Docas', 'Liberadas', 'Alertas', 'Críticos (Gerente)', '% Liberadas']],
      body: [[
        totalDocas,
        totalLiberadas,
        totalAlertas,
        totalCriticos,
        totalDocas > 0 ? `${Math.round(totalLiberadas / totalDocas * 100)}%` : '0%'
      ]],
      headStyles:  { fillColor: [26, 31, 46], textColor: 255, fontStyle: 'bold' },
      bodyStyles:  { halign: 'center' },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40, textColor: [30, 142, 62] },
        2: { cellWidth: 40, textColor: [249, 171, 0] },
        3: { cellWidth: 50, textColor: [217, 48, 37] },
        4: { cellWidth: 40 },
      },
      margin: { left: 14 },
    })

    // Tabela principal
    doc.setFont('helvetica', 'bold')
    doc.text('Detalhamento por Doca', 14, doc.lastAutoTable.finalY + 12)

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Data', 'Doca', 'Remessa', 'Horário', 'P.Exp', 'P.Frente', 'P.Dentro', 'Total', 'Supervisor', 'Turno', 'Liberado', 'Alerta']],
      body: dadosFiltrados.map(row => [
        row.data,
        row.doca,
        row.remessa,
        row.horario,
        row.pendExp,
        row.pendFrente,
        row.pendDentro,
        row.total,
        row.supervisor,
        row.turno,
        row.liberado || 'N/A',
        row.alerta || '-',
      ]),
      headStyles: { fillColor: [26, 31, 46], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 242, 245] },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const col = data.column.index
          const val = data.cell.raw
          if (col === 10) {
            data.cell.styles.textColor = val === 'SIM' ? [30, 142, 62] : [217, 48, 37]
            data.cell.styles.fontStyle = 'bold'
          }
          if (col === 11 && val === 'GERENTE') {
            data.cell.styles.textColor = [217, 48, 37]
            data.cell.styles.fontStyle = 'bold'
          }
          if (col === 11 && val === 'COORDENADOR') {
            data.cell.styles.textColor = [249, 171, 0]
            data.cell.styles.fontStyle = 'bold'
          }
          if (col === 7) {
            const n = Number(val)
            data.cell.styles.textColor = n >= 5 ? [217, 48, 37] : n >= 3 ? [249, 171, 0] : [30, 142, 62]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
      margin: { left: 14, right: 14 },
    })

    doc.save(`relatorio-expedicao-${new Date().toISOString().slice(0,10)}.pdf`)
    setGerando(false)
  }

  async function gerarExcel() {
    setGerando(true)

    const wb = XLSX.utils.book_new()

    // Aba consolidado
    const cabecalho = ['Data', 'Doca', 'Remessa', 'Horário', 'Pend. Exp.', 'Pend. Frente', 'Pend. Dentro', 'Total', 'Supervisor', 'Turno', 'Liberado', 'Alerta']
    const linhas = dadosFiltrados.map(row => [
      row.data, row.doca, row.remessa, row.horario,
      row.pendExp, row.pendFrente, row.pendDentro, row.total,
      row.supervisor, row.turno, row.liberado || 'N/A', row.alerta || '-'
    ])

    const wsData = [cabecalho, ...linhas]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Estilo do cabeçalho
    const headerStyle = {
      fill: { fgColor: { rgb: '1A1F2E' } },
      font: { color: { rgb: 'FFFFFF' }, bold: true },
      alignment: { horizontal: 'center' }
    }
    cabecalho.forEach((_, i) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: i })
      if (ws[cell]) ws[cell].s = headerStyle
    })

    // Largura das colunas
    ws['!cols'] = [
      { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 13 }, { wch: 8 },
      { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 14 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado')

    // Aba por dia
    const diasUnicos = [...new Set(dadosFiltrados.map(d => d.data))]
    diasUnicos.forEach(dia => {
      const linhasDia = dadosFiltrados.filter(d => d.data === dia).map(row => [
        row.doca, row.remessa, row.horario,
        row.pendExp, row.pendFrente, row.pendDentro, row.total,
        row.supervisor, row.turno, row.liberado || 'N/A', row.alerta || '-'
      ])
      const cabDia = ['Doca', 'Remessa', 'Horário', 'Pend. Exp.', 'Pend. Frente', 'Pend. Dentro', 'Total', 'Supervisor', 'Turno', 'Liberado', 'Alerta']
      const wsDia = XLSX.utils.aoa_to_sheet([cabDia, ...linhasDia])
      cabDia.forEach((_, i) => {
        const cell = XLSX.utils.encode_cell({ r: 0, c: i })
        if (wsDia[cell]) wsDia[cell].s = headerStyle
      })
      wsDia['!cols'] = ws['!cols'].slice(1)
      XLSX.utils.book_append_sheet(wb, wsDia, dia.replace('/', '-'))
    })

    // Aba resumo
    const resumo = [
      ['Resumo Executivo', ''],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      ['', ''],
      ['Métrica', 'Valor'],
      ['Total de Docas', dadosFiltrados.length],
      ['Docas Liberadas', dadosFiltrados.filter(d => d.liberado === 'SIM').length],
      ['Alertas Ativos', dadosFiltrados.filter(d => d.alerta !== '').length],
      ['Críticos (Gerente)', dadosFiltrados.filter(d => d.alerta === 'GERENTE').length],
      ['% Liberadas', dadosFiltrados.length > 0
        ? `${Math.round(dadosFiltrados.filter(d => d.liberado === 'SIM').length / dadosFiltrados.length * 100)}%`
        : '0%'],
    ]
    const wsResumo = XLSX.utils.aoa_to_sheet(resumo)
    wsResumo['!cols'] = [{ wch: 22 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

    XLSX.writeFile(wb, `relatorio-expedicao-${new Date().toISOString().slice(0,10)}.xlsx`)
    setGerando(false)
  }

  return (
    <div>
      {/* CONFIGURAÇÕES */}
      <div style={{ background: '#1a1f2e', borderRadius: 12, padding: 24, border: '1px solid #2d3142', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} color="#4285f4" /> Configurações do Relatório
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 8 }}>Formato</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['pdf', 'excel'].map(f => (
                <button key={f} onClick={() => setFormato(f)} style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                  background: formato === f ? '#4285f4' : '#2d3142',
                  color: formato === f ? '#fff' : '#9aa0a6',
                  fontWeight: formato === f ? 700 : 400, textTransform: 'uppercase'
                }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 8 }}>
              <Calendar size={12} style={{ marginRight: 4 }} />Período início
            </div>
            <select value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} style={{
              background: '#2d3142', border: '1px solid #3d4252', borderRadius: 8,
              color: '#e8eaed', padding: '8px 12px', fontSize: 13, width: '100%'
            }}>
              <option value="">Todos</option>
              {dias.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 8 }}>
              <Calendar size={12} style={{ marginRight: 4 }} />Período fim
            </div>
            <select value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} style={{
              background: '#2d3142', border: '1px solid #3d4252', borderRadius: 8,
              color: '#e8eaed', padding: '8px 12px', fontSize: 13, width: '100%'
            }}>
              <option value="">Todos</option>
              {dias.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* PREVIEW */}
        <div style={{ background: '#0f1117', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 32 }}>
          {[
            { label: 'Registros',  valor: dadosFiltrados.length,                                          cor: '#4285f4' },
            { label: 'Liberadas',  valor: dadosFiltrados.filter(d => d.liberado === 'SIM').length,         cor: '#1e8e3e' },
            { label: 'Alertas',    valor: dadosFiltrados.filter(d => d.alerta !== '').length,              cor: '#f9ab00' },
            { label: 'Críticos',   valor: dadosFiltrados.filter(d => d.alerta === 'GERENTE').length,       cor: '#d93025' },
            { label: '% Liberado', valor: dadosFiltrados.length > 0
                ? `${Math.round(dadosFiltrados.filter(d => d.liberado === 'SIM').length / dadosFiltrados.length * 100)}%`
                : '0%',                                                                                    cor: '#1e8e3e' },
          ].map((item, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, color: '#9aa0a6' }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.cor }}>{item.valor}</div>
            </div>
          ))}
        </div>

        {/* BOTÃO GERAR */}
        <button
          onClick={formato === 'pdf' ? gerarPDF : gerarExcel}
          disabled={gerando || dadosFiltrados.length === 0}
          style={{
            width: '100%', padding: '14px', borderRadius: 10, border: 'none',
            background: gerando ? '#2d3142' : '#4285f4',
            color: '#fff', fontWeight: 700, fontSize: 15, cursor: gerando ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
          }}
        >
          {gerando
            ? <><FileText size={18} /> Gerando...</>
            : <><Download size={18} /> Gerar Relatório {formato.toUpperCase()}</>
          }
        </button>
      </div>

      {/* PRÉVIA DA TABELA */}
      <div style={{ background: '#1a1f2e', borderRadius: 12, border: '1px solid #2d3142', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3142', fontSize: 13, fontWeight: 600, color: '#9aa0a6' }}>
          Prévia — {dadosFiltrados.length} registro(s)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#2d3142' }}>
                {['Data', 'Doca', 'Remessa', 'P.Exp', 'P.Frente', 'P.Dentro', 'Total', 'Supervisor', 'Turno', 'Liberado', 'Alerta'].map(col => (
                  <th key={col} style={{ padding: '10px 14px', textAlign: 'left', color: '#9aa0a6', fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid #2d3142', background: i % 2 === 0 ? '#1a1f2e' : '#1e2433' }}>
                  <td style={{ padding: '10px 14px' }}>{row.data}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.doca}</td>
                  <td style={{ padding: '10px 14px' }}>{row.remessa}</td>
                  <td style={{ padding: '10px 14px', color: row.pendExp    > 0 ? '#f9ab00' : '#9aa0a6' }}>{row.pendExp}</td>
                  <td style={{ padding: '10px 14px', color: row.pendFrente > 0 ? '#f9ab00' : '#9aa0a6' }}>{row.pendFrente}</td>
                  <td style={{ padding: '10px 14px', color: row.pendDentro > 0 ? '#f9ab00' : '#9aa0a6' }}>{row.pendDentro}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: row.total >= 5 ? '#d93025' : row.total >= 3 ? '#f9ab00' : '#1e8e3e' }}>{row.total}</td>
                  <td style={{ padding: '10px 14px' }}>{row.supervisor}</td>
                  <td style={{ padding: '10px 14px' }}>{row.turno}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: row.liberado === 'SIM' ? '#1e8e3e33' : '#d9302533',
                      color: row.liberado === 'SIM' ? '#1e8e3e' : '#d93025' }}>
                      {row.liberado || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {row.alerta && (
                      <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: (row.alerta === 'GERENTE' ? '#d93025' : '#f9ab00') + '33',
                        color: row.alerta === 'GERENTE' ? '#d93025' : '#f9ab00' }}>
                        {row.alerta}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}