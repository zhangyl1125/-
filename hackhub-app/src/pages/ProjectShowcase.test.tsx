import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { ProjectShowcase } from './ProjectShowcase'

const { createIdea, createTeam, getOrCreateNominationTeam, getComments, addComment, getIdeas, updateIdea, uploadFile, voteIdea, currentUser, listNominees } = vi.hoisted(() => ({
  currentUser: { id: 'user-1', email: 'user@example.com', name: 'User', role: 'participant' as 'participant' | 'manager' | 'admin', skills: [] },
  listNominees: vi.fn().mockResolvedValue({ content: [{ id: 'nominee-2', name: 'Named Associate', email: 'associate@example.com' }] }),
  createIdea: vi.fn().mockResolvedValue({ id: 'new-idea' }),
  getOrCreateNominationTeam: vi.fn().mockResolvedValue({ id: 'personal-team', name: 'User nomination' }),
  getComments: vi.fn().mockResolvedValue([{ id: 'comment-1', ideaId: 'idea-1', userId: 'reviewer', content: 'The customer impact is well documented.', createdAt: '2026-09-01T00:00:00Z' }]),
  addComment: vi.fn().mockResolvedValue(undefined),
  createTeam: vi.fn().mockResolvedValue({ id: 'personal-team', name: 'User nomination' }),
  getIdeas: vi.fn().mockResolvedValue({
    content: [{
      id: 'idea-1',
      title: 'Customer Portal Renewal',
      description: 'Uploaded by an administrator',
      teamId: 'team-1',
      createdBy: 'user-1',
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
  updateIdea: vi.fn().mockResolvedValue({ id: 'new-idea' }),
  uploadFile: vi.fn().mockResolvedValue({ url: '/image.jpg', key: 'projects/personal-team/image.jpg' }),
  voteIdea: vi.fn().mockResolvedValue({ voted: true, voteCount: 3 }),
}))

Element.prototype.scrollIntoView = vi.fn()

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user: currentUser }) }))
vi.mock('../lib/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/apiClient')>()
  return { ...actual, api: { ...actual.api, get: listNominees } }
})

vi.mock('../services/hackathonService', () => ({
  HackathonService: {
    getHackathons: vi.fn().mockResolvedValue({
      content: [{ id: 'hackathon-1', title: 'Spring 2026 Hackathon', status: 'running' }],
    }),
  },
}))

vi.mock('../services/ideaService', () => ({
  IdeaService: {
    getIdeas,
    voteIdea,
    createIdea,
    getComments,
    addComment,
    updateIdea,
  },
}))

vi.mock('../services/teamService', () => ({
  TeamService: {
    getTeams: vi.fn().mockResolvedValue([{ id: 'team-1', name: 'Admin Team', hackathonId: 'hackathon-1' }]),
    getTeamMembers: vi.fn().mockResolvedValue([]),
    createTeam,
    getOrCreateNominationTeam,
  },
}))

vi.mock('../services/profileService', () => ({
  ProfileService: { getProfile: vi.fn().mockResolvedValue({ name: 'Reviewer' }) },
}))

vi.mock('../services/storageService', () => ({
  StorageService: {
    getPresignedUrl: vi.fn(),
    uploadFile,
  },
}))

vi.mock('../services/judgingService', () => ({
  JudgingService: { getJudges: vi.fn().mockResolvedValue([]) },
}))

describe('ProjectShowcase', () => {
  it('shows nominees without exposing internal event concepts', async () => {
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase />
        </MemoryRouter>
      </MantineProvider>
    )

    expect(await screen.findByText('Customer Portal Renewal')).toBeInTheDocument()
    expect(screen.queryByText('Under Construction')).not.toBeInTheDocument()
    expect(screen.queryByText(/This page is currently under development/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New nomination' })).toBeInTheDocument()
    expect(screen.queryByText(/votes available/)).not.toBeInTheDocument()
    expect(screen.getAllByText('Customer Values').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Innovation Breakthrough').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collaboration to Win').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /All nominees\s*1/ })).toBeInTheDocument()
    expect(screen.queryByText('Spring 2026 Hackathon')).not.toBeInTheDocument()
    expect(screen.queryByText('Winners Only')).not.toBeInTheDocument()
  })

  it('shows the corresponding comments in nomination details', async () => {
    const user = userEvent.setup()
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase />
        </MemoryRouter>
      </MantineProvider>
    )

    await screen.findByText('Customer Portal Renewal')
    await user.click(screen.getByRole('button', { name: 'Details & comments' }))
    expect(await screen.findByRole('heading', { name: 'Nominee' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tags' })).toBeInTheDocument()
    expect(await screen.findByText('The customer impact is well documented.')).toBeInTheDocument()
    expect(getComments).toHaveBeenCalledWith('idea-1')
  })

  it('requires a track choice before revealing the nomination form', async () => {
    const user = userEvent.setup()
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase nominationMode />
        </MemoryRouter>
      </MantineProvider>
    )

    expect(await screen.findByText('Choose a track to begin')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Contribution title/ })).not.toBeInTheDocument()

    const valueTrack = screen.getByRole('radio', { name: /VALUE.*Customer Values/ })
    expect(valueTrack).toHaveAttribute('aria-checked', 'false')
    await user.click(valueTrack)

    expect(valueTrack).toHaveAttribute('aria-checked', 'true')
    expect(await screen.findByRole('textbox', { name: /Contribution title/ })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Application category/ })).not.toBeInTheDocument()
  })

  it('shows a clear filled vote state directly on the project card', async () => {
    const user = userEvent.setup()
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase />
        </MemoryRouter>
      </MantineProvider>
    )

    const voteButton = await screen.findByRole('button', { name: 'Vote, 2 votes' })
    await user.click(voteButton)

    expect(voteIdea).toHaveBeenCalledWith('idea-1')
    const votedButton = await screen.findByRole('button', { name: 'Voted, 3 votes' })
    expect(votedButton.closest('.dp-project-card')).toHaveAttribute('data-voted', 'true')
    expect(screen.getByText('Voted', { selector: '.dp-vote-stamp span' })).toBeInTheDocument()
  })

  it('restores the filled card state for a vote returned by the API', async () => {
    getIdeas.mockResolvedValueOnce({
      content: [{
        id: 'idea-1',
        title: 'Customer Portal Renewal',
        description: 'Uploaded by an administrator',
        teamId: 'team-1',
        createdBy: 'user-1',
        category: 'AI',
        tags: ['Java'],
        attachments: [],
        projectAttachments: [],
        votes: 3,
        userHasVoted: true,
        status: 'submitted',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      }],
    })

    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase />
        </MemoryRouter>
      </MantineProvider>
    )

    const votedButton = await screen.findByRole('button', { name: 'Voted, 3 votes' })
    expect(votedButton.closest('.dp-project-card')).toHaveAttribute('data-voted', 'true')
    expect(screen.getByText('Voted', { selector: '.dp-vote-stamp span' })).toBeInTheDocument()
  })

  it('presents nomination as an individual three-track flow without team controls', async () => {
    const user = userEvent.setup()
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase nominationMode />
        </MemoryRouter>
      </MantineProvider>
    )

    expect(await screen.findByRole('heading', { name: /Nominate a Digital Pioneer/ })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Executive summary/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /SHIFT.*Innovation Breakthrough/ }))
    expect(screen.getByRole('textbox', { name: /Executive summary/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Core achievement/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /High-Performance Culture/ })).toBeInTheDocument()
    expect(screen.queryByText('Team')).not.toBeInTheDocument()
    expect(screen.queryByText('Customer Portal Renewal')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Award event' })).not.toBeInTheDocument()
  })

  it('lets an administrator choose the actual associate for manager nomination', async () => {
    currentUser.role = 'admin'
    try {
      const user = userEvent.setup()
      render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase nominationMode /></MemoryRouter></MantineProvider>)
      await user.click(await screen.findByRole('radio', { name: /VALUE.*Customer Values/ }))
      const nominee = await screen.findByRole('textbox', { name: /Nominee name/ })
      await user.clear(nominee)
      await user.type(nominee, 'Named')
      await user.click(await screen.findByRole('option', { name: 'Named Associate (associate@example.com)' }))
      expect(nominee).toHaveValue('Named Associate (associate@example.com)')
      expect(screen.getByRole('textbox', { name: /Position/ })).toBeInTheDocument()
    } finally {
      currentUser.role = 'participant'
    }
  })

  it('atomically submits the complete nomination after its photo upload' , async () => {
    const user = userEvent.setup()
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase nominationMode />
        </MemoryRouter>
      </MantineProvider>
    )

    await user.click(await screen.findByRole('radio', { name: /VALUE.*Customer Values/ }))
    await user.type(await screen.findByRole('textbox', { name: /Contribution title/ }), 'Customer Portal')
    await user.type(screen.getByRole('textbox', { name: /Executive summary/ }), 'A better customer experience in four clear sentences.')
    await user.type(screen.getByRole('textbox', { name: /Core achievement/ }), 'Reduced service time by 30% and saved RMB 200,000.')
    await user.type(screen.getByRole('textbox', { name: /High-Performance Culture/ }), 'Listened to users and delivered an end-to-end solution.')
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')
    expect(fileInput).not.toBeNull()
    await user.upload(fileInput!, new File(['image'], 'project.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Submit nomination' }))

    await waitFor(() => expect(getOrCreateNominationTeam).toHaveBeenCalledWith(expect.objectContaining({
      name: 'User nomination',
      hackathonId: 'hackathon-1',
    }), 'user-1'))
    expect(createIdea).toHaveBeenCalledWith(expect.objectContaining({
      teamId: 'personal-team',
      category: 'Customer Values',
    }))
    expect(createIdea).toHaveBeenCalledWith(expect.objectContaining({
      status: 'submitted',
      projectAttachments: expect.arrayContaining([expect.objectContaining({ type: 'nomination', nomineeUserId: 'user-1', name: 'User' })]),
    }))
    expect(createIdea).toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining('Core Achievement & Business Impact'),
    }))
    expect(createIdea).toHaveBeenCalledTimes(1)
    expect(updateIdea).not.toHaveBeenCalled()
    expect(uploadFile.mock.invocationCallOrder[0]).toBeLessThan(createIdea.mock.invocationCallOrder[0])
  })
})
