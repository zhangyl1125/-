import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { LoadingOverlay } from '@mantine/core'
import { useEffect, type ReactNode } from 'react'
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
import { useAwardAccess } from './hooks/useAwardAccess'
import { loginDestination } from './lib/loginDestination'

function ReviewAccess({ children }: { children: ReactNode }) {
  const { canReview, canManage, campaignIds, loading } = useAwardAccess()
  const { hackathonId } = useParams()
  if (loading) return <LoadingOverlay visible />
  return (hackathonId ? canManage || campaignIds.includes(hackathonId) : canReview) ? children : <Navigate to="/projects" replace />
}

function App() {
  const location = useLocation()
  const { user, loading, initialized, initialize } = useAuthStore()

  // Initialize auth on app start
  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

  // Public website sections share the landing background and original page components.
  if (['/', '/overview', '/nominate', '/projects'].includes(location.pathname)) {
    return <LandingPage>
      {location.pathname === '/nominate' ? <ProjectShowcase nominationMode />
        : location.pathname === '/projects' ? <ProjectShowcase />
        : <DigitalPioneerOverview />}
    </LandingPage>
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
      <LandingPage>
          <Routes>
            <Route path="/overview" element={<DigitalPioneerOverview />} />
            <Route path="/committee" element={<ReviewAccess><AwardManagement /></ReviewAccess>} />
            <Route path="/awards" element={<ReviewAccess><AwardManagement /></ReviewAccess>} />
            <Route path="/awards/:id" element={<ReviewAccess><AwardManagement /></ReviewAccess>} />
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
            <Route path="/admin/nominees" element={user.role === 'admin' ? <ProjectShowcase managementMode /> : <Navigate to="/projects" replace />} />
            <Route path="/admin/organizations" element={<Navigate to="/" replace />} />
            <Route path="/hackathons/:hackathonId/judge" element={<ReviewAccess><JudgingPanel /></ReviewAccess>} />
            <Route path="/hackathons/:hackathonId/leaderboard" element={<ReviewAccess><Leaderboard /></ReviewAccess>} />
            <Route path="/invite/:token" element={<AcceptInvitation />} />
            <Route path="/login" element={<Navigate to={loginDestination(location.search)} replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </LandingPage>
    </RealtimeProvider>
  )
}

export default App
