import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { ProjectShowcase } from './ProjectShowcase'

const { addComment } = vi.hoisted(() => ({ addComment: vi.fn() }))

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
    getComments: vi.fn().mockResolvedValue([{
      id: 'comment-1',
      ideaId: 'idea-1',
      userId: 'commenter-1',
      content: 'Helpful review',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    }]),
    addComment,
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
  ProfileService: { getProfile: vi.fn().mockResolvedValue({ name: 'Reviewer' }) },
}))

vi.mock('../services/storageService', () => ({
  StorageService: {
    getPresignedUrl: vi.fn(),
    uploadFile: vi.fn(),
  },
}))

vi.mock('../services/judgingService', () => ({
  JudgingService: { getJudges: vi.fn().mockResolvedValue([]) },
}))

describe('ProjectShowcase', () => {
  it('shows existing projects and exposes project upload to a participant', async () => {
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase />
        </MemoryRouter>
      </MantineProvider>
    )

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    expect(screen.queryByText('Under Construction')).not.toBeInTheDocument()
    expect(screen.queryByText(/This page is currently under development/)).not.toBeInTheDocument()
    expect(screen.getByText('Administrator Project')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload Project' })).toBeInTheDocument()
    expect(screen.getAllByText('AI & Intelligence').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Digital Transformation').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Green & Sustainability').length).toBeGreaterThan(0)
    expect(screen.getByText('1 project')).toBeInTheDocument()
  })

  it('loads and posts comments from project details', async () => {
    const user = userEvent.setup()
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase />
        </MemoryRouter>
      </MantineProvider>
    )

    await user.click(await screen.findByText('Administrator Project'))
    expect(await screen.findByText('Helpful review')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Add a Comment'), 'Looks great')
    await user.click(screen.getByRole('button', { name: 'Post Comment' }))
    await waitFor(() => expect(addComment).toHaveBeenCalledWith('idea-1', 'Looks great'))
  })

  it('opens uploads with the selected track prefilled', async () => {
    const user = userEvent.setup()
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase />
        </MemoryRouter>
      </MantineProvider>
    )

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    await user.click(screen.getAllByRole('button', { name: 'Upload Work' })[1])

    await waitFor(() => expect(
      screen.getAllByDisplayValue('Digital Transformation')
        .some((element) => element.getAttribute('type') !== 'hidden')
    ).toBe(true))
  })
})
