import { BrowserRouter } from 'react-router-dom'
import AdminRoutes from './routes/AdminRoutes'
import { useSignalR } from './hooks/useSignalR'

function AppShell() {
  const { forcedLogoutNotice } = useSignalR()

  return (
    <>
      {forcedLogoutNotice ? (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 1000,
            minWidth: 280,
            maxWidth: 360,
            background: 'var(--a-warning-bg, #fff7ed)',
            color: 'var(--a-warning, #c2410c)',
            border: '1px solid var(--a-warning-border, #fdba74)',
            borderRadius: 16,
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            padding: '14px 16px',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, marginTop: 1 }}>
              warning
            </span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.7 }}>
                Phiên đăng nhập
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>
                {forcedLogoutNotice.message}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <AdminRoutes />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
export default App
