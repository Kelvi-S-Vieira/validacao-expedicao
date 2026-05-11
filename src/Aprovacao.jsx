import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Clock, User, ChevronDown, ChevronUp, Lock, ShieldCheck } from 'lucide-react'
import { useSessao } from './useSessao'

export default function Aprovacao({ usuario, dados, onAprovar, onRejeitar, perfil }) {
  const { sessao, docas, aprovarDoca, rejeitarDoca } = useSessao(usuario)
  const [expandido, setExpandido]   = useState(null)
  const [comentario, setComentario] = useState({})
  const [processando, setProcessando] = useState(null)

  // Docas aguardando aprovação do Firestore (tempo real)
  const docasFirestore = docas.filter(d => {
    if (perfil === 'COORDENADOR') return ['AGUARD_COORD', 'ESCALADO'].includes(d.status)
    if (perfil === 'GERENTE')     return ['AGUARD_GERENTE', 'ESCALADO', 'AGUARD_COORD'].includes(d.status)
    return false
  })

  // Docas do Sheets (dados prop) — fallback quando não há sessão ativa
  const docasSheets = (dados || []).filter(d => {
    if (d.aprovado || d.rejeitado) return false
    if (perfil === 'COORDENADOR') return d.alerta === 'COORDENADOR'
    if (perfil === 'GERENTE')     return d.alerta !== ''
    return false
  })

  // Usa Firestore se tiver sessão ativa, senão usa dados do Sheets
  const usandoFirestore  = sessao && docasFirestore.length >= 0
  const pendentes        = usandoFirestore ? docasFirestore : docasSheets
  const totalPendentes   = pendentes.length

  async function handleAprovar(item, idx) {
    setProcessando(`aprovar-${idx}`)
    try {
      if (usandoFirestore && item.doca) {
        // Aprovação via Firestore (sessão ativa)
        await aprovarDoca(item.doca, comentario[idx] || '')
      } else {
        // Aprovação via prop callback (dados do Sheets)
        await onAprovar?.(item, comentario[idx] || '')
      }
      setComentario(prev => ({ ...prev, [idx]: '' }))
      setExpandido(null)
    } catch (err) {
      alert('Erro ao aprovar: ' + err.message)
    }
    setProcessando(null)
  }

  async function handleRejeitar(item, idx) {
    setProcessando(`rejeitar-${idx}`)
    try {
      if (usandoFirestore && item.doca) {
        await rejeitarDoca(item.doca, comentario[idx] || '')
      } else {
        await onRejeitar?.(item, comentario[idx] || '')
      }
      setComentario(prev => ({ ...prev, [idx]: '' }))
      setExpandido(null)
    } catch (err) {
      alert('Erro ao rejeitar: ' + err.message)
    }
    setProcessando(null)
  }

  // ── SEM PENDÊNCIAS ────────────────────────────────────────
  if (totalPendentes === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <CheckCircle size={52} color="var(--green)" style={{ marginBottom: 16, opacity: 0.7 }} />
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        Tudo em dia!
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Nenhuma doca aguardando aprovação.
      </div>
      {sessao && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          Sessão ativa — {docas.length} doca(s) no total
        </div>
      )}
    </div>
  )

  // ── LISTA DE PENDÊNCIAS ───────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>
          {totalPendentes} aguardando
        </div>
        {sessao && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Sessão: {sessao.data} · {docas.length} docas
          </div>
        )}
        {usandoFirestore && (
          <div style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            Tempo real
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendentes.map((item, idx) => {
          const aberto    = expandido === idx
          const resultado = usandoFirestore ? (item.resultado ?? 0) : (item.resultado ?? item.total ?? 0)
          const corAlerta = item.status === 'AGUARD_GERENTE' || item.alerta === 'GERENTE' ? 'var(--red)' : 'var(--orange)'
          const labelStatus = item.status === 'AGUARD_GERENTE' ? 'Gerente' :
                              item.status === 'ESCALADO'       ? 'Escalado → Gerente' :
                              item.status === 'AGUARD_COORD'   ? 'Coordenador' :
                              item.alerta || 'Pendente'

          return (
            <div key={idx} style={{ background: 'var(--bg-card)', borderRadius: 14, border: `1px solid ${corAlerta}44`, overflow: 'hidden' }}>

              {/* CABEÇALHO */}
              <div onClick={() => setExpandido(aberto ? null : idx)}
                style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: corAlerta + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={20} color={corAlerta} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>Doca {item.doca}</span>
                      {item.cargaCertificada && (
                        <span style={{ fontSize: 10, background: 'var(--green-dim)', color: 'var(--green)', padding: '1px 6px', borderRadius: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <ShieldCheck size={9} /> Cert.
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {item.remessa || item.nomeFilial} ·
                      Resultado: <strong style={{ color: corAlerta }}>{resultado}</strong> pendência(s)
                      {item.conferente && <> · 👤 {item.conferente}</>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: corAlerta + '20', color: corAlerta, whiteSpace: 'nowrap' }}>
                    {labelStatus}
                  </span>
                  {aberto ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
                </div>
              </div>

              {/* DETALHES EXPANDIDOS */}
              {aberto && (
                <div style={{ borderTop: `1px solid ${corAlerta}33`, padding: '16px 18px' }}>

                  {/* Cards de pendências */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                    {[
                      { label: 'Pend. Expedição',  valor: item.pendExp    ?? '—', cor: (item.pendExp    ?? 0) > 0 ? 'var(--red)'    : 'var(--text-muted)' },
                      { label: 'Frente Doca',       valor: item.pendFrente ?? '—', cor: (item.pendFrente ?? 0) > 0 ? 'var(--green)'  : 'var(--text-muted)' },
                      { label: 'Dentro Doca',       valor: item.pendDentro ?? '—', cor: (item.pendDentro ?? 0) > 0 ? 'var(--green)'  : 'var(--text-muted)' },
                    ].map((c, j) => (
                      <div key={j} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: c.cor }}>{c.valor}</div>
                      </div>
                    ))}
                  </div>

                  {/* Resultado final */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Resultado final:</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: corAlerta }}>{resultado}</span>
                    {item.observacao && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>Obs: {item.observacao}</span>
                    )}
                  </div>

                  {/* Infos da doca */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {item.horario && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} />{item.horario}
                        </span>
                      )}
                      {item.supervisor && (
                        <span style={{ fontSize: 12, color: item.supervisor === 'Virginia' ? 'var(--blue)' : 'var(--orange)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={12} />{item.supervisor}
                        </span>
                      )}
                      {item.turno && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.turno}</span>
                      )}
                      {item.hrInicio && (
                        <span style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} />Iniciado: {item.hrInicio}
                        </span>
                      )}
                      {item.valDoca && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tempo validação: {item.valDoca}</span>
                      )}
                    </div>
                  </div>

                  {/* Comentário */}
                  <textarea
                    placeholder="Motivo / comentário (opcional)..."
                    value={comentario[idx] || ''}
                    onChange={e => setComentario(prev => ({ ...prev, [idx]: e.target.value }))}
                    style={{
                      width: '100%', borderRadius: 10, border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                      padding: '10px 14px', fontSize: 13, resize: 'none', height: 68,
                      marginBottom: 12, fontFamily: 'inherit', boxSizing: 'border-box',
                      outline: 'none', transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />

                  {/* Botões */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      onClick={() => handleRejeitar(item, idx)}
                      disabled={processando !== null}
                      style={{
                        padding: '13px', borderRadius: 10,
                        border: '1px solid var(--red)',
                        background: processando === `rejeitar-${idx}` ? 'var(--red-dim)' : 'transparent',
                        color: 'var(--red)', fontWeight: 700, fontSize: 14,
                        cursor: processando !== null ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: processando !== null && processando !== `rejeitar-${idx}` ? 0.5 : 1,
                      }}
                    >
                      <XCircle size={17} />
                      {processando === `rejeitar-${idx}` ? 'Rejeitando...' : 'Rejeitar'}
                    </button>
                    <button
                      onClick={() => handleAprovar(item, idx)}
                      disabled={processando !== null}
                      style={{
                        padding: '13px', borderRadius: 10, border: 'none',
                        background: processando === `aprovar-${idx}` ? '#16a34a99' : 'var(--green)',
                        color: '#fff', fontWeight: 700, fontSize: 14,
                        cursor: processando !== null ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: processando !== null && processando !== `aprovar-${idx}` ? 0.5 : 1,
                      }}
                    >
                      <CheckCircle size={17} />
                      {processando === `aprovar-${idx}` ? 'Aprovando...' : 'Aprovar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}