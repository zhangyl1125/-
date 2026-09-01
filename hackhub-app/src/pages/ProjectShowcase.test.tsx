import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { ProjectShowcase } from './ProjectShowcase'

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      role: 'participant',
      skills: [],
    },
  }),
}))

vi.mock('../hooks/useRealtime', () => ({
  useRealtime: () => ({ isConnected: true }),
}))

vi.mock('../services/hackathonService', () => ({
  HackathonService: {
    getHackathons: vi.fn().mockResolvedValue({ content: [] }),
  },
}))

vi.mock('../services/ideaService', () => ({
  IdeaService: {
    getIdeas: vi.fn(),
    voteIdea: vi.fn(),
    createIdea: vi.fn(),
    updateIdea: vi.fn(),
  },
}))

vi.mock('../services/teamService', () => ({
  TeamService: {
    getTeams: vi.fn(),
    getTeamMembers: vi.fn(),
    createTeam: vi.fn(),
  },
}))

vi.mock('../services/profileService', () => ({
  ProfileService: { getProfile: vi.fn() },
}))

vi.mock('../services/storageService', () => ({
  StorageService: {
    getPresignedUrl: vi.fn(),
    uploadFile: vi.fn(),
  },
}))

describe('ProjectShowcase', () => {
  it('removes the construction banner and exposes project upload actions', async () => {
    render(
      <MantineProvider>
        <ProjectShowcase />
      </MantineProvider>
    )

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    expect(screen.queryByText('Under Construction')).not.toBeInTheDocument()
    expect(screen.queryByText(/This page is currently under development/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Upload Project' })).toHaveLength(2)
  })
})
