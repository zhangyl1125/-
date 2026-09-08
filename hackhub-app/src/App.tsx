import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppShell, LoadingOverlay } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useEffect } from 'react'
import { Header } from './components/Layout/Header'
import { Sidebar } from './components/Layout/Sidebar'
import { AwardManagement } from './pages/AwardManagement'
import CreateHackathon from './pages/CreateHackathon'
import { HackathonEdit } from './pages/HackathonEdit'
import { ProjectShowcase } from './pages/ProjectShowcase'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { AdminUsers } from './pages/AdminUsers'
import { JudgingPanel } from './pages/JudgingPanel'
import { Leaderboard } from './pages/Leaderboard'
import { AcceptInvitation } from './pages/AcceptInvitation'
import { useAuthStore } from './store/authStore'
import { RealtimeProvider } from './contexts/RealtimeContext'
import { DigitalPioneerOverview } from './pages/DigitalPioneerOverview'
import { LandingPage } from './pages/LandingPage'
import { loginDestination } from './lib/loginDestination'

function App() {
  const [opened, { toggle, close }] = useDisclosure()
  const location = useLocation()
  const { user, loading, initialized, initialize } = useAuthStore()

  // Initialize auth on app start
  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

  // Keep the public home page available even when a previous session is restored.
  if (location.pathname === '/') {
    return <LandingPage authenticated={Boolean(user)} />
  }

  // Keep the login form mounted while submitting so failed attempts retain their input.
  if (!initialized || (loading && location.pathname !== '/login')) {
    return <LoadingOverlay visible />
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/organization/setup" element={<Navigate to="/" replace />} />
        <Route path="/invite/:token" element={<AcceptInvitation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  const isParticipant = user.role === 'participant'

  return (
    <RealtimeProvider>
      <AppShell
        header={{ height: 70 }}
        navbar={{
          width: 300,
          breakpoint: '90em',
          collapsed: { mobile: !opened, desktop: true },
        }}
        padding="md"
      >
        <AppShell.Header className="dp-app-header">
          <Header opened={opened} toggle={toggle} />
        </AppShell.Header>

        <AppShell.Navbar p="md" className="dp-app-navbar">
          <Sidebar onNavigate={close} />
        </AppShell.Navbar>

        <AppShell.Main className="dp-app-main">
          <Routes>
            <Route path="/overview" element={<DigitalPioneerOverview />} />
            <Route path="/committee" element={<AwardManagement />} />
            <Route path="/awards" element={<AwardManagement />} />
            <Route path="/awards/:id" element={<AwardManagement />} />
            <Route path="/hackathons" element={isParticipant ? <Navigate to="/" replace /> : <AwardManagement />} />
            <Route path="/hackathons/create" element={isParticipant ? <Navigate to="/" replace /> : <CreateHackathon />} />
            <Route path="/hackathons/:id" element={isParticipant ? <Navigate to="/" replace /> : <AwardManagement />} />
            <Route path="/hackathons/:id/edit" element={isParticipant ? <Navigate to="/" replace /> : <HackathonEdit />} />
            <Route path="/hackathons/:id/teams" element={<Navigate to="/projects" replace />} />
            <Route path="/organizations/:orgId/hackathons/:id/teams" element={<Navigate to="/projects" replace />} />
            <Route path="/teams" element={<Navigate to="/projects" replace />} />
            <Route path="/teams/:id" element={<Navigate to="/projects" replace />} />
            <Route path="/ideas" element={<Navigate to="/projects" replace />} />
            <Route path="/hackathons/:id/ideas" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectShowcase />} />
            <Route path="/nominate" element={<ProjectShowcase nominationMode />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/organization/setup" element={<Navigate to="/" replace />} />
            <Route path="/organizations" element={<Navigate to="/" replace />} />
            <Route path="/organizations/new" element={<Navigate to="/" replace />} />
            <Route path="/organizations/:id" element={<Navigate to="/" replace />} />
            <Route path="/admin/users" element={isParticipant ? <Navigate to="/overview" replace /> : <AdminUsers />} />
            <Route path="/admin/organizations" element={<Navigate to="/" replace />} />
            <Route path="/hackathons/:hackathonId/judge" element={<JudgingPanel />} />
            <Route path="/hackathons/:hackathonId/leaderboard" element={<Leaderboard />} />
            <Route path="/invite/:token" element={<AcceptInvitation />} />
            <Route path="/login" element={<Navigate to={loginDestination(location.search)} replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell.Main>
      </AppShell>
    </RealtimeProvider>
  )
}

export default App
