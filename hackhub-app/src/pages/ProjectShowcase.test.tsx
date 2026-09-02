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
    getHackathons: vi.fn().mockResolvedValue({
      content: [{ id: 'hackathon-1', title: 'Spring 2026 Hackathon' }],
    }),
  },
}))

vi.mock('../services/ideaService', () => ({
  IdeaService: {
    getIdeas: vi.fn().mockResolvedValue({
      content: [{
        id: 'idea-1',
        title: 'Administrator Project',
        description: 'Uploaded by an administrator',
        teamId: 'team-1',
        category: 'AI',
        tags: ['Java'],
        attachments: [],
        projectAttachments: [],
        votes: 2,
        userHasVoted: false,
        status: 'submitted',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      }],
    }),
    voteIdea: vi.fn(),
    createIdea: vi.fn(),
    updateIdea: vi.fn(),
  },
}))

vi.mock('../services/teamService', () => ({
  TeamService: {
    getTeams: vi.fn().mockResolvedValue([{ id: 'team-1', name: 'Admin Team', hackathonId: 'hackathon-1' }]),
    getTeamMembers: vi.fn().mockResolvedValue([]),
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
  it('shows existing projects and exposes project upload to a participant', async () => {
    render(
      <MantineProvider>
        <ProjectShowcase />
      </MantineProvider>
    )

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    expect(screen.queryByText('Under Construction')).not.toBeInTheDocument()
    expect(screen.queryByText(/This page is currently under development/)).not.toBeInTheDocument()
    expect(screen.getByText('Administrator Project')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload Project' })).toBeInTheDocument()
  })
})
