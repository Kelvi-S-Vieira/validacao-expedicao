import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Edit2, Check, X, Users } from 'lucide-react'

const STORAGE_KEY = 'gpp_conferentes'

const CONFERENTES_INICIAIS = [
  { id: 1, nome: 'Echiley',  turno: '2º Turno', ativo: true },
  { id: 2, nome: 'Juliana',  turno: '1º Turno', ativo: true },
  { id: 3, nome: 'Caue',     turno: '2º Turno', ativo: true },
  { id: 4, nome: 'Anderson', turno: '1º Turno', ativo: true },
  { id: 5, nome: 'Patricia', turno: '1º Turno', ativo: true },
  { id: 6, nome: 'Roberto',  turno: '2º Turno', ativo: true },
]

export function useConferentes() {
  const [conferentes, setConferentes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : CONFERENTES_INICIAIS
    } catch {
      return CONFERENTES_INICIAIS
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conferentes))
  }, [conferentes])

  return [conferentes, setConferentes]
}

const INPUT_STYLE = {
  padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-primary)', color: 'var(--text-primary)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

export default function Conferentes() {
  const [conferentes, setConferentes] = useConferentes()
  const [novoNome, setNovoNome]       = useState('')
  const [novoTurno, setNovoTurno]     = useState('1º Turno')
  const [editando, setEditando]       = useState(null)
  const [editNome, setEditNome]       = useState('')
  const [editTurno, setEditTurno]     = useState('')

  function adicionar() {
    if (!novoNome.trim()) return
    const novo = {
      id:    Date.now(),
      nome:  novoNome.trim(),
      turno: novoTurno,
      ativo: true,
    }
    setConferentes(prev => [...prev, novo])
    setNovoNome('')
  }

  function remover(id) {
    if (!confirm('Remover este conferente?')) return
    setConferentes(prev => prev.filter(c => c.id !== id))
  }

  function toggleAtivo(id) {
    setConferentes(prev => prev.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c))
  }

  function iniciarEdicao(c) {
    setEditando(c.id)
    setEditNome(c.nome)
    setEditTurno(c.turno)
  }

  function salvarEdicao(id) {
    if (!editNome.trim()) return
    setConferentes(prev => prev.map(c => c.id === id ? { ...c, nome: editNome.trim(), turno: editTurno } : c))
    setEditando(null)
  }

  const ativos   = conferentes.filter(c => c.ativo)
  const inativos = conferentes.filter(c => !c.ativo)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Conferentes</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Gerencie a lista de conferentes disponíveis para validação de docas.
        </p>
      </div>

      {/* Formulário de adição */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 24, border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Adicionar conferente
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome</label>
            <input
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionar()}
              placeholder="Nome do conferente..."
              style={{ ...INPUT_STYLE, width: '100%' }}
              onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Turno</label>
            <select value={novoTurno} onChange={e => setNovoTurno(e.target.value)}
              style={{ ...INPUT_STYLE, cursor: 'pointer' }}
              onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            >
              <option>1º Turno</option>
              <option>2º Turno</option>
              <option>Ambos</option>
            </select>
          </div>
          <button onClick={adicionar} disabled={!novoNome.trim()} style={{
            background: novoNome.trim() ? 'var(--yellow)' : 'var(--border)',
            border: 'none', borderRadius: 8, padding: '10px 20px',
            cursor: novoNome.trim() ? 'pointer' : 'not-allowed',
            color: novoNome.trim() ? '#1a1a1a' : 'var(--text-muted)',
            fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <UserPlus size={14} /> Adicionar
          </button>
        </div>
      </div>

      {/* Lista de ativos */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={14} color="var(--green)" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Ativos ({ativos.length})</span>
        </div>
        {ativos.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum conferente ativo.</div>
        ) : ativos.map(c => (
          <div key={c.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            {editando === c.id ? (
              <>
                <input value={editNome} onChange={e => setEditNome(e.target.value)}
                  style={{ ...INPUT_STYLE, flex: 1 }}
                  onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <select value={editTurno} onChange={e => setEditTurno(e.target.value)}
                  style={{ ...INPUT_STYLE }}
                  onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                >
                  <option>1º Turno</option>
                  <option>2º Turno</option>
                  <option>Ambos</option>
                </select>
                <button onClick={() => salvarEdicao(c.id)} style={{ background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: 'var(--green)' }}>
                  <Check size={14} />
                </button>
                <button onClick={() => setEditando(null)} style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: 'var(--red)' }}>
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: c.turno === '1º Turno' ? 'var(--blue)' : c.turno === '2º Turno' ? 'var(--orange)' : 'var(--text-muted)', marginTop: 2 }}>{c.turno}</div>
                </div>
                <button onClick={() => iniciarEdicao(c)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <Edit2 size={13} />
                </button>
                <button onClick={() => toggleAtivo(c.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>
                  Desativar
                </button>
                <button onClick={() => remover(c.id)} style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--red)' }}>
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Lista de inativos */}
      {inativos.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Inativos ({inativos.length})</span>
          </div>
          {inativos.map(c => (
            <div key={c.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.5 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, textDecoration: 'line-through' }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.turno}</div>
              </div>
              <button onClick={() => toggleAtivo(c.id)} style={{ background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: 'var(--green)', fontSize: 11, fontWeight: 600 }}>
                Reativar
              </button>
              <button onClick={() => remover(c.id)} style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--red)' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}