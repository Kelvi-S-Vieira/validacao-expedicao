import { useState } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Package, Clock, User, ChevronDown, ChevronUp } from 'lucide-react'

const CORES = {
  GERENTE: '#d93025',
  COORDENADOR: '#f9ab00',
}

export default function Aprovacao({ dados, onAprovar, onRejeitar, perfil }) {
  const [expandido, setExpandido] = useState(null)
  const [comentario, setComentario] = useState({})
  const [processando, setProcessando] = useState(null)

  const pendentes = dados.filter(d => {
    if (d.alerta === '') return false
    if (perfil === 'COORDENADOR') return d.alerta === 'COORDENADOR' && !d.aprovado
    if (perfil === 'GERENTE') return !d.aprovado
    return false
  })

  async function handleAprovar(row, i) {
    setProcessando(`aprovar-${i}`)
    await onAprovar(row, comentario[i] || '')
    setProcessando(null)
    setComentario(prev => ({ ...prev, [i]: '' }))
  }

  async function handleRejeitar(row, i) {
    setProcessando(`rejeitar-${i}`)
    await onRejeitar(row, comentario[i] || '')
    setProcessando(null)
    setComentario(prev => ({ ...prev, [i]: '' }))
  }

  if (pendentes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <CheckCircle size={56} color="#1e8e3e" style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 18, fontWeight: 600, color: '#e8eaed', marginBottom: 8 }}>
          Tudo em dia!
        </div>
        <div style={{ fontSize: 14, color: '#9aa0a6' }}>
          Nenhuma pendência aguardando aprovação.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, color: '#9aa0a6', marginBottom: 4 }}>
        {pendentes.length} pendência(s) aguardando sua aprovação
      </div>

      {pendentes.map((row, i) => {
        const aberto = expandido === i
        const cor = CORES[row.alerta] || '#4285f4'

        return (
          <div key={i} style={{
            background: '#1a1f2e',
            borderRadius: 16,
            border: `1px solid ${cor}55`,
            overflow: 'hidden',
            boxShadow: `0 2px 12px ${cor}22`
          }}>
            {/* CABEÇALHO DO CARD */}
            <div
              onClick={() => setExpandido(aberto ? null : i)}
              style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <AlertTriangle size={22} color={cor} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#e8eaed' }}>
                    Doca {row.doca}
                  </div>
                  <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 2 }}>
                    {row.remessa} — Total: <span style={{ color: cor, fontWeight: 700 }}>{row.total}</span> pendências
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: cor + '22', color: cor
                }}>
                  {row.alerta}
                </span>
                {aberto ? <ChevronUp size={16} color="#9aa0a6" /> : <ChevronDown size={16} color="#9aa0a6" />}
              </div>
            </div>

            {/* DETALHES EXPANDIDOS */}
            {aberto && (
              <div style={{ borderTop: `1px solid ${cor}33`, padding: '16px 20px' }}>

                {/* INFO GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Pend. Expedição',  valor: row.pendExp,    cor: row.pendExp    > 0 ? '#f9ab00' : '#9aa0a6' },
                    { label: 'Pend. Frente Doca', valor: row.pendFrente, cor: row.pendFrente > 0 ? '#f9ab00' : '#9aa0a6' },
                    { label: 'Pend. Dentro Doca', valor: row.pendDentro, cor: row.pendDentro > 0 ? '#f9ab00' : '#9aa0a6' },
                    { label: 'Total',              valor: row.total,      cor: cor },
                  ].map((item, j) => (
                    <div key={j} style={{ background: '#0f1117', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: item.cor }}>{item.valor}</div>
                    </div>
                  ))}
                </div>

                {/* DETALHES DA DOCA */}
                <div style={{ background: '#0f1117', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9aa0a6' }}>
                      <Clock size={13} />{row.horario}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9aa0a6' }}>
                      <User size={13} />{row.supervisor}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9aa0a6' }}>
                      <Package size={13} />Turno {row.turno}
                    </div>
                  </div>
                </div>

                {/* COMENTÁRIO */}
                <textarea
                  placeholder="Comentário (opcional)..."
                  value={comentario[i] || ''}
                  onChange={e => setComentario(prev => ({ ...prev, [i]: e.target.value }))}
                  style={{
                    width: '100%', borderRadius: 10, border: '1px solid #2d3142',
                    background: '#0f1117', color: '#e8eaed', padding: '10px 14px',
                    fontSize: 13, resize: 'none', height: 72, marginBottom: 12,
                    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none'
                  }}
                />

                {/* BOTÕES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    onClick={() => handleRejeitar(row, i)}
                    disabled={processando !== null}
                    style={{
                      padding: '14px', borderRadius: 12, border: '1px solid #d9302555',
                      background: processando === `rejeitar-${i}` ? '#d9302533' : '#0f1117',
                      color: '#d93025', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                  >
                    <XCircle size={18} />
                    {processando === `rejeitar-${i}` ? 'Rejeitando...' : 'Rejeitar'}
                  </button>
                  <button
                    onClick={() => handleAprovar(row, i)}
                    disabled={processando !== null}
                    style={{
                      padding: '14px', borderRadius: 12, border: 'none',
                      background: processando === `aprovar-${i}` ? '#1e8e3e99' : '#1e8e3e',
                      color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                  >
                    <CheckCircle size={18} />
                    {processando === `aprovar-${i}` ? 'Aprovando...' : 'Aprovar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}