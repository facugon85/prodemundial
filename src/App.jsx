import { AppProvider, useApp } from './context/AppContext.jsx'
import LoginScreen from './components/auth/LoginScreen.jsx'
import AppShell from './components/layout/AppShell.jsx'
import OnboardingWizard from './components/onboarding/OnboardingWizard.jsx'
import Notif from './components/common/Notif.jsx'

function Inner() {
  const { user, authLoading, page } = useApp()
  if (authLoading) return <AuthLoader />
  if (!user) return <LoginScreen />
  if (!user.isAdmin && (!user.onboardingCompleted || page === 'onboarding')) return <OnboardingWizard />
  return <AppShell />
}

function AuthLoader() {
  return (
    <div className="auth-loader">
      <div className="auth-loader-ball" />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Notif />
      <Inner />
    </AppProvider>
  )
}
