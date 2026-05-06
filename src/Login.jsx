import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from './firebase'
import { Package, Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [erro, setErro]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha)
      const perfil = detectarPerfil(cred.user.email)
      onLogin({ email: cred.user.email, perfil, uid: cred.user.uid })
    } catch (err) {
      setErro('E-mail ou senha incorretos.')
    }
    setLoading(false)
  }

  function detectarPerfil(email) {
    if (email.includes('gerente'))      return 'GERENTE'
    if (email.includes('coordenador'))  return 'COORDENADOR'
    if (email.includes('analista'))     return 'ANALISTA'
    return 'OPERADOR'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: '#4285f422',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Package size={32} color="#4285f4" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Validação de Expedição</div>
          <div style={{ fontSize: 13, color: '#9aa0a6', marginTop: 4 }}>Sistema de Controle de Docas</div>
        </div>

        {/* FORM */}
        <div style={{ background: '#1a1f2e', borderRadius: 16, padding: 32, border: '1px solid #2d3142' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#e8eaed', marginBottom: 24 }}>Entrar na sua conta</div>

          <form onSubmit={handleLogin}>
            {/* EMAIL */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 8 }}>E-mail</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid #2d3142', background: '#0f1117',
                  color: '#e8eaed', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* SENHA */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 8 }}>Senha</div>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '12px 44px 12px 14px', borderRadius: 10,
                    border: '1px solid #2d3142', background: '#0f1117',
                    color: '#e8eaed', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9aa0a6', padding: 0
                  }}
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* ERRO */}
            {erro && (
              <div style={{
                background: '#d9302522', border: '1px solid #d93025', borderRadius: 8,
                padding: '10px 14px', marginBottom: 16, color: '#d93025', fontSize: 13
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
                background: loading ? '#2d3142' : '#4285f4',
                color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <LogIn size={18} />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* PERFIS */}
        <div style={{ marginTop: 24, background: '#1a1f2e33', borderRadius: 12, padding: 16, border: '1px solid #2d314255' }}>
          <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 10, textAlign: 'center' }}>Perfis disponíveis</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { perfil: 'OPERADOR',     email: 'operador@gpp.com',     cor: '#4285f4' },
              { perfil: 'COORDENADOR',  email: 'coordenador@gpp.com',  cor: '#f9ab00' },
              { perfil: 'GERENTE',      email: 'gerente@gpp.com',      cor: '#d93025' },
              { perfil: 'ANALISTA',     email: 'analista@gpp.com',     cor: '#1e8e3e' },
            ].map((p, i) => (
              <button key={i} onClick={() => setEmail(p.email)} style={{
                background: 'none', border: `1px solid ${p.cor}44`, borderRadius: 8,
                padding: '8px 12px', cursor: 'pointer', textAlign: 'left'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: p.cor }}>{p.perfil}</div>
                <div style={{ fontSize: 10, color: '#9aa0a6', marginTop: 2 }}>{p.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}