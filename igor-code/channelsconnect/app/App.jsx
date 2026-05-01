import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { AuthProvider, AuthGate } from "@/lib/authContext"

function App() {
  return (
    <AuthProvider>
      {/* AuthGate blocks the entire app with "Establishing Secure Session…"
          until the state machine reaches SYSTEM_READY or UNAUTHENTICATED.
          This eliminates all race conditions — no page ever renders mid-auth. */}
      <AuthGate>
        <Pages />
      </AuthGate>
      <Toaster />
      <SonnerToaster position="top-right" richColors />
    </AuthProvider>
  )
}

export default App
