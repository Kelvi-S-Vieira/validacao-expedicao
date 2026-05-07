import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from './firebase'
import { Eye, EyeOff, LogIn, Truck } from 'lucide-react'

const PERFIS = [
  { perfil: 'OPERADOR',    email: 'operador@gpp.com',    cor: 'var(--blue)',   bg: 'var(--blue-dim)' },
  { perfil: 'COORDENADOR', email: 'coordenador@gpp.com', cor: 'var(--orange)', bg: 'var(--orange-dim)' },
  { perfil: 'GERENTE',     email: 'gerente@gpp.com',     cor: 'var(--red)',    bg: 'var(--red-dim)' },
  { perfil: 'ANALISTA',    email: 'analista@gpp.com',    cor: 'var(--green)',  bg: 'var(--green-dim)' },
]

export default function Login({ onLogin }) {
  const [email, setEmail]             = useState('')
  const [senha, setSenha]             = useState('')
  const [erro, setErro]               = useState('')
  const [loading, setLoading]         = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha)
      const perfil = detectarPerfil(cred.user.email)
      onLogin({ email: cred.user.email, perfil, uid: cred.user.uid })
    } catch {
      setErro('E-mail ou senha incorretos.')
    }
    setLoading(false)
  }

  function detectarPerfil(email) {
    if (email.includes('gerente'))     return 'GERENTE'
    if (email.includes('coordenador')) return 'COORDENADOR'
    if (email.includes('analista'))    return 'ANALISTA'
    return 'OPERADOR'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* PAINEL ESQUERDO */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
        borderRight: '1px solid var(--border)',
      }}>
        {/* Decoração de fundo */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400, borderRadius: '50%',
          background: 'var(--yellow)', opacity: 0.03,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -50, left: -50,
          width: 300, height: 300, borderRadius: '50%',
          background: 'var(--yellow)', opacity: 0.02,
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48, position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--yellow)', borderRadius: 20,
            padding: '12px 24px', marginBottom: 24,
          }}>
            <span style={{
              fontSize: 22, fontWeight: 900, color: '#1a1a1a',
              letterSpacing: '-0.5px',
            }}>
              grupo<strong>pernambucanas</strong>
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, marginBottom: 12,
          }}>
            <Truck size={24} color="var(--yellow)" />
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              Validação de Expedição
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 280, lineHeight: 1.6 }}>
            Sistema de controle e monitoramento de docas em tempo real
          </p>
        </div>

        {/* Stats decorativas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 320 }}>
          {[
            { label: 'Docas monitoradas', valor: '24/7' },
            { label: 'Alertas em tempo real', valor: '< 1min' },
            { label: 'Relatórios automáticos', valor: 'PDF/XLS' },
            { label: 'Perfis de acesso', valor: '4 níveis' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--yellow)' }}>{item.valor}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PAINEL DIREITO — FORM */}
      <div style={{
        width: 480, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              Entrar na plataforma
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Use suas credenciais de acesso
            </p>
          </div>

          <form onSubmit={handleLogin}>
            {/* EMAIL */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* SENHA */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '14px 44px 14px 16px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 0,
                  }}
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* ERRO */}
            {erro && (
              <div style={{
                background: 'var(--red-dim)', border: '1px solid var(--red)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                color: 'var(--red)', fontSize: 13,
              }}>
                {erro}
              </div>
            )}

            {/* BOTÃO */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                background: loading ? 'var(--border)' : 'var(--yellow)',
                color: loading ? 'var(--text-muted)' : '#1a1a1a',
                fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <LogIn size={18} />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* PERFIS */}
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Acesso rápido por perfil
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PERFIS.map((p, i) => (
                <button key={i} onClick={() => setEmail(p.email)} style={{
                  background: 'var(--bg-card)', border: `1px solid var(--border)`,
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = p.cor; e.currentTarget.style.background = p.bg }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: p.cor, letterSpacing: '0.5px' }}>{p.perfil}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{p.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}