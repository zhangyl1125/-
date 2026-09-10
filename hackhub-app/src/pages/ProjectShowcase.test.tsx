import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { ProjectShowcase } from './ProjectShowcase'

const { createIdea, createTeam, getOrCreateNominationTeam, getComments, addComment, getIdeas, getHackathons, updateIdea, uploadFile, voteIdea, clearMyVotes, clearTrackVotes, deleteIdea, deleteIdeas, currentUser, listNominees } = vi.hoisted(() => ({
  deleteIdea: vi.fn().mockResolvedValue(undefined),
  deleteIdeas: vi.fn().mockResolvedValue(undefined),
  currentUser: { id: 'user-1', email: 'user@example.com', name: 'User', role: 'participant' as 'participant' | 'manager' | 'admin', skills: [] },
  listNominees: vi.fn().mockResolvedValue({ content: [{ id: 'nominee-2', name: 'Named Associate', email: 'associate@example.com' }] }),
  getHackathons: vi.fn().mockResolvedValue({ content: [{ id: 'hackathon-1', title: 'Spring 2026 Hackathon', status: 'running' }] }),
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
  clearTrackVotes: vi.fn().mockResolvedValue(undefined),
  clearMyVotes: vi.fn().mockResolvedValue(undefined),
  voteIdea: vi.fn().mockResolvedValue({ voted: true, voteCount: 3 }),
}))

Element.prototype.scrollIntoView = vi.fn()

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user: currentUser }) }))
vi.mock('../contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }))
vi.mock('../lib/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/apiClient')>()
  return { ...actual, api: { ...actual.api, get: listNominees } }
})

vi.mock('../services/hackathonService', () => ({
  HackathonService: {
    getHackathons,
  },
}))

vi.mock('../services/ideaService', () => ({
  IdeaService: {
    getIdeas,
    voteIdea,
    clearMyVotes,
    clearTrackVotes,
    createIdea,
    getComments,
    addComment,
    updateIdea,
    deleteIdea,
    deleteIdeas,
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

vi.mock('../services/storageService', async (importOriginal) => ({
  ...await importOriginal<typeof import('../services/storageService')>(),
  StorageService: {
    getPresignedUrl: vi.fn(),
    uploadFile,
  },
}))

vi.mock('../services/judgingService', () => ({
  JudgingService: { getJudges: vi.fn().mockResolvedValue([]) },
}))

async function confirmSavedVote() {
  const dialog = await screen.findByRole('dialog', { name: 'Vote saved' })
  expect(within(dialog).getByRole('status')).toHaveTextContent('Your vote has been saved')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))
  await waitFor(() => expect(dialog).not.toBeInTheDocument())
  await waitFor(() => expect(screen.getByRole('button', { name: 'Voted, 3 votes' })).toHaveFocus())
}

describe('ProjectShowcase', () => {
  afterEach(() => { currentUser.role = 'participant' })
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
    expect(screen.queryByRole('button', { name: 'New nomination' })).not.toBeInTheDocument()
    expect(screen.queryByText(/votes available/)).not.toBeInTheDocument()
    expect(screen.getAllByText('Customer Values').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Innovation Breakthrough').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collaboration to Win').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /All nominees\s*1/ })).toBeInTheDocument()
    expect(screen.queryByText('Spring 2026 Hackathon')).not.toBeInTheDocument()
    expect(screen.queryByText('Winners Only')).not.toBeInTheDocument()
  })

  it('shows nomination details without loading or offering comments', async () => {
    const user = userEvent.setup()
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase />
        </MemoryRouter>
      </MantineProvider>
    )

    await screen.findByText('Customer Portal Renewal')
    await user.click(screen.getByRole('button', { name: 'View details' }))
    expect(await screen.findByRole('heading', { name: 'Nominee' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tags' })).toBeInTheDocument()
    expect(screen.queryByText('The customer impact is well documented.')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Add a comment' })).not.toBeInTheDocument()
    expect(getComments).not.toHaveBeenCalled()
  })

  it('requires a track choice before revealing the nomination form', async () => {
    const user = userEvent.setup()
    render(
      <MantineProvider env="test">
        <MemoryRouter>
          <ProjectShowcase nominationMode />
        </MemoryRouter>
      </MantineProvider>
    )

    expect(await screen.findByText('Choose a track to begin')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Award Category/ })).not.toBeInTheDocument()

    const valueTrack = screen.getByRole('radio', { name: /Customer Values/ })
    expect(valueTrack).toHaveAttribute('aria-checked', 'false')
    await user.click(valueTrack)

    expect(valueTrack).toHaveAttribute('aria-checked', 'true')
    expect(await screen.findByRole('textbox', { name: /Award Category/ })).toHaveValue('Customer Values')
    expect(screen.queryByRole('textbox', { name: /Contribution title/ })).not.toBeInTheDocument()
    expect(document.getElementById('nomination-track-description')).toHaveTextContent('Deliver end-to-end solutions and create tangible values for customers/users.')
    await user.type(screen.getByRole('textbox', { name: /Executive Summary/ }), 'Keep this contribution when switching categories.')
    await user.click(screen.getByRole('textbox', { name: 'Award Category' }))
    await user.click(await screen.findByRole('option', { name: 'Collaboration to Win' }))
    expect(screen.getByRole('radio', { name: /Collaboration to Win/ })).toHaveAttribute('aria-checked', 'true')
    expect(document.getElementById('nomination-track-description')).toHaveTextContent('Took ownership of shared goals, proactively support upstream and downstream tasks while completing their own work.')
    expect(screen.getByRole('textbox', { name: /Executive Summary/ })).toHaveValue('Keep this contribution when switching categories.')
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
    await confirmSavedVote()

    expect(voteIdea).toHaveBeenCalledWith('idea-1')
    const votedButton = await screen.findByRole('button', { name: 'Voted, 3 votes' })
    expect(votedButton.closest('.dp-project-card')).toHaveAttribute('data-voted', 'true')
    expect(screen.getByText('Voted', { selector: '.dp-vote-stamp span' })).toBeInTheDocument()
  })

  it('requires acknowledgement after saving a vote', async () => {
    const actor = userEvent.setup()
    voteIdea.mockClear()
    render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase /></MemoryRouter></MantineProvider>)
    await actor.click(await screen.findByRole('button', { name: 'Vote, 2 votes' }))
    const feedback = await screen.findByRole('dialog', { name: 'Vote saved' })
    expect(voteIdea).toHaveBeenCalledTimes(1)
    await actor.keyboard('{Escape}')
    await actor.click(document.querySelector('.mantine-Modal-overlay') as HTMLElement)
    expect(feedback).toBeInTheDocument()
    await confirmSavedVote()
    expect(voteIdea).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['Each participant can cast at most 4 votes per award category.', 'Previous votes count too'],
    ['At most 2 votes may be cast for projects from your department (BD/DPA).', 'At most 2 votes'],
    ['At most 2 votes per award category may go outside your department.', 'At most 2 votes'],
    ['Unable to connect. Please try again.', 'Unable to connect'],
  ])('keeps nomination details open when voting fails: %s', async (message, expected) => {
    const actor = userEvent.setup()
    render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase /></MemoryRouter></MantineProvider>)
    await actor.click(await screen.findByRole('button', { name: 'View details' }))
    const details = screen.getByRole('dialog', { name: 'Customer Portal Renewal' })
    voteIdea.mockRejectedValueOnce(new Error(message))
    await actor.click(within(details).getByRole('button', { name: 'Vote (2)' }))
    const feedback = await screen.findByRole('dialog', { name: 'Vote not saved' })
    expect(within(feedback).getByRole('alert')).toHaveTextContent(expected)
    await actor.keyboard('{Escape}')
    expect(feedback).toBeInTheDocument()
    await actor.click(within(feedback).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(feedback).not.toBeInTheDocument())
    expect(details).toBeInTheDocument()
    expect(within(details).getByRole('button', { name: 'Vote (2)' })).toBeEnabled()
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
    await userEvent.click(screen.getByRole('button', { name: 'My votes (1)' }))
    expect(within(await screen.findByRole('dialog')).getByText('Customer Portal Renewal')).toBeInTheDocument()
  })

  it('keeps votes visible across filters and removes them from the cart and card together', async () => {
    const user = userEvent.setup()
    render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase /></MemoryRouter></MantineProvider>)
    await user.click(await screen.findByRole('button', { name: 'Vote, 2 votes' }))
    await confirmSavedVote()
    await user.type(screen.getByPlaceholderText('Search nominees'), 'No matching nominee')
    expect(screen.queryByText('Customer Portal Renewal')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'My votes (1)' }))
    const cart = screen.getByRole('dialog')
    expect(within(cart).getByText('Customer Portal Renewal')).toBeInTheDocument()
    voteIdea.mockResolvedValueOnce({ voted: false, voteCount: 2 })
    await user.click(within(cart).getByRole('button', { name: 'Remove vote for Customer Portal Renewal' }))
    expect(await within(cart).findByText('No votes yet')).toBeInTheDocument()
    await user.click(within(cart).getByRole('button', { name: 'Close my votes' }))
    await user.clear(screen.getByPlaceholderText('Search nominees'))
    expect(await screen.findByRole('button', { name: 'Vote, 2 votes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'My votes (0)' })).toBeInTheDocument()
  })

  it('keeps the cart open while voting on the candidate list', async () => {
    const user = userEvent.setup()
    render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase /></MemoryRouter></MantineProvider>)
    await screen.findByRole('button', { name: 'Vote, 2 votes' })
    await user.click(screen.getByRole('button', { name: 'My votes (0)' }))
    const cart = screen.getByRole('dialog')
    expect(cart).toHaveAttribute('aria-modal', 'false')
    await user.click(screen.getByRole('button', { name: 'Vote, 2 votes' }))
    await confirmSavedVote()
    expect(await within(cart).findByText('Customer Portal Renewal')).toBeInTheDocument()
    voteIdea.mockResolvedValueOnce({ voted: false, voteCount: 2 })
    await user.click(screen.getByRole('button', { name: 'Voted, 3 votes' }))
    expect(await within(cart).findByText('No votes yet')).toBeInTheDocument()
    expect(cart).toBeInTheDocument()
  })

  it('clears the whole cart, retains it on failure, and lets the user vote again', async () => {
    const user = userEvent.setup()
    render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase /></MemoryRouter></MantineProvider>)
    await user.click(await screen.findByRole('button', { name: 'Vote, 2 votes' }))
    await confirmSavedVote()
    await user.click(screen.getByRole('button', { name: 'My votes (1)' }))
    const cart = screen.getByRole('dialog')
    clearMyVotes.mockRejectedValueOnce(new Error('Unable to clear votes. Please try again.'))
    await user.click(within(cart).getByRole('button', { name: 'Clear all' }))
    expect(await within(cart).findByRole('alert')).toHaveTextContent('Unable to clear votes')
    expect(within(cart).getByText('Customer Portal Renewal')).toBeInTheDocument()
    await user.click(within(cart).getByRole('button', { name: 'Clear all' }))
    expect(await within(cart).findByText('No votes yet')).toBeInTheDocument()
    expect(within(cart).getByRole('button', { name: 'Clear all' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Vote, 2 votes' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Vote, 2 votes' }))
    await confirmSavedVote()
    expect(await within(cart).findByText('Customer Portal Renewal')).toBeInTheDocument()
  })

  it('reconciles saved votes and opens the cart with recovery instructions on a vote limit response', async () => {
    const actor = userEvent.setup()
    render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase /></MemoryRouter></MantineProvider>)
    await screen.findByRole('button', { name: 'Vote, 2 votes' })
    getIdeas.mockResolvedValueOnce({ content: [{
      id: 'idea-1', title: 'Customer Portal Renewal', description: 'Previously saved nomination',
      createdBy: 'user-1', category: 'Customer Values', tags: [], attachments: [], projectAttachments: [],
      votes: 3, userHasVoted: true, status: 'submitted', createdAt: '', updatedAt: '',
    }] })
    voteIdea.mockRejectedValueOnce(new Error('Each participant can cast at most 4 votes per award category.'))
    await actor.click(screen.getByRole('button', { name: 'Vote, 2 votes' }))
    const feedback = await screen.findByRole('dialog', { name: 'Vote not saved' })
    expect(within(feedback).getByRole('alert')).toHaveTextContent('Previous votes count too')
    await actor.click(within(feedback).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(feedback).not.toBeInTheDocument())
    const cart = screen.getByRole('dialog', { name: 'My votes (1)' })
    expect(within(cart).getByRole('alert')).toHaveStyle({ background: 'transparent' })
    expect(await within(cart).findByRole('alert')).toHaveTextContent('Previous votes count too')
    expect(await screen.findByRole('button', { name: 'Voted, 3 votes' })).toBeInTheDocument()
    expect(within(cart).getByText(/Customer Values · 1\/4/)).toBeInTheDocument()
    expect(within(cart).getByRole('button', { name: /Clear .* Customer Values votes/ })).toBeEnabled()
  })

  it('clears only the selected award category and allows another vote', async () => {
    const actor = userEvent.setup()
    render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase /></MemoryRouter></MantineProvider>)
    await actor.click(await screen.findByRole('button', { name: 'Vote, 2 votes' }))
    await confirmSavedVote()
    await actor.click(screen.getByRole('button', { name: 'My votes (1)' }))
    const cart = screen.getByRole('dialog')
    await actor.click(within(cart).getByRole('button', { name: /Clear .* Innovation Breakthrough votes/ }))
    expect(clearTrackVotes).toHaveBeenCalledWith('hackathon-1', 'Innovation Breakthrough')
    expect(await within(cart).findByText('No votes yet')).toBeInTheDocument()
    await actor.click(screen.getByRole('button', { name: 'Vote, 2 votes' }))
    await confirmSavedVote()
    expect(await within(cart).findByText('Customer Portal Renewal')).toBeInTheDocument()
  })

  it('retains a vote and displays the rule when removal is rejected', async () => {
    const user = userEvent.setup()
    render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase /></MemoryRouter></MantineProvider>)
    await user.click(await screen.findByRole('button', { name: 'Vote, 2 votes' }))
    await confirmSavedVote()
    await user.click(screen.getByRole('button', { name: 'My votes (1)' }))
    const cart = screen.getByRole('dialog')
    voteIdea.mockRejectedValueOnce(new Error('Remove a same-department vote first.'))
    await user.click(within(cart).getByRole('button', { name: 'Remove vote for Customer Portal Renewal' }))
    const feedback = await screen.findByRole('dialog', { name: 'Vote not saved' })
    expect(within(feedback).getByRole('alert')).toHaveTextContent('Remove a same-department vote first.')
    await user.click(within(feedback).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(feedback).not.toBeInTheDocument())
    expect(await within(cart).findByRole('alert')).toHaveTextContent('Remove a same-department vote first.')
    expect(within(cart).getByText('Customer Portal Renewal')).toBeInTheDocument()
    expect(within(cart).getByRole('heading', { name: 'My votes (1)' })).toBeInTheDocument()
  })

  it('splits legacy combined tags into separate badges and filter options', async () => {
    getIdeas.mockResolvedValueOnce({ content: [{
      id: 'idea-1', title: 'Legacy tags', description: 'Combined tags', teamId: 'team-1',
      createdBy: 'user-1', category: 'AI', tags: ['IoT、Digital Twin，Cloud、IoT、'],
      attachments: [], projectAttachments: [], votes: 0, userHasVoted: false,
      status: 'submitted', createdAt: '', updatedAt: '',
    }] })
    render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase /></MemoryRouter></MantineProvider>)
    await screen.findByText('Legacy tags')
    const tags = document.querySelector('.dp-nomination-tags') as HTMLElement
    expect(within(tags).getByText('IoT')).toBeInTheDocument()
    expect(within(tags).getByText('Digital Twin')).toBeInTheDocument()
    expect(within(tags).getByText('Cloud')).toBeInTheDocument()
    await userEvent.click(screen.getByPlaceholderText('Filter by tag'))
    expect(screen.getByRole('option', { name: 'Cloud' })).toBeInTheDocument()
  })

  it('previews only the summary and keeps all answers in the detail dialog', async () => {
    getIdeas.mockResolvedValueOnce({ content: [{
      id: 'idea-1', title: 'Nominee Name', teamId: 'team-1', createdBy: 'user-1',
      description: 'Executive Summary\nSummary first paragraph.\n\nSummary second paragraph.\n\nDetails of Your Core Achievement in 2026 and Business Impact (including financial figures)\nSaved RMB 200,000.\n\nHow You Demonstrate Bosch China Culture (Especially in Your Applied Category)\nWorked across departments.',
      category: 'AI', tags: ['Impact'], attachments: [], projectAttachments: [],
      votes: 0, userHasVoted: false, status: 'submitted', createdAt: '', updatedAt: '',
    }] })
    render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase /></MemoryRouter></MantineProvider>)
    await screen.findByText('Nominee Name')
    const card = document.querySelector('.dp-project-card') as HTMLElement
    expect(within(card).getByText(/Summary first paragraph/)).toHaveTextContent('Summary second paragraph.')
    expect(within(card).queryByText(/Saved RMB/)).not.toBeInTheDocument()
    expect(within(card).queryByText(/Worked across departments/)).not.toBeInTheDocument()
    expect(within(card).queryByText('Department')).not.toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'View details' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'Executive Summary (The Elevator Pitch)' })).toBeInTheDocument()
    expect(dialog.getByRole('heading', { name: /Details of Your Core Achievement/ })).toBeInTheDocument()
    expect(dialog.getByRole('heading', { name: /How you demonstrate BD China culture/ })).toBeInTheDocument()
    for (const answer of ['Summary first paragraph.', 'Summary second paragraph.', 'Saved RMB 200,000.', 'Worked across departments.']) {
      expect(dialog.getByText(answer)).toBeInTheDocument()
    }
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

    expect(await screen.findByRole('heading', { name: 'Choose an award category' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Nominate a Digital Pioneer/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Executive Summary/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Innovation Breakthrough/ }))
    expect(screen.getByRole('textbox', { name: /Executive Summary \(The Elevator Pitch\)/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Details of Your Core Achievement in 2026 and Business Impact/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /How you demonstrate BD China culture/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Tags you want to add/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Award Category/ })).toHaveValue('Innovation Breakthrough')
    expect(screen.getByRole('button', { name: 'Submit nomination' })).toBeDisabled()
    expect(screen.queryByText('Team')).not.toBeInTheDocument()
    expect(screen.queryByText('Customer Portal Renewal')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Award event' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Position/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Nominating HoD/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Supporting evidence URL/ })).not.toBeInTheDocument()
  })

  it('lets an administrator choose the actual associate for manager nomination', async () => {
    currentUser.role = 'admin'
    try {
      const user = userEvent.setup()
      render(<MantineProvider env="test"><MemoryRouter><ProjectShowcase nominationMode /></MemoryRouter></MantineProvider>)
      await user.click(await screen.findByRole('radio', { name: /Customer Values/ }))
      const nominee = await screen.findByRole('textbox', { name: /Outlook Name/ })
      await user.clear(nominee)
      await user.type(nominee, 'Named')
      await user.click(await screen.findByRole('option', { name: 'Named Associate (associate@example.com)' }))
      expect(nominee).toHaveValue('Named Associate (associate@example.com)')
      expect(screen.getByRole('textbox', { name: /Award Category/ })).toHaveValue('Customer Values')
    } finally {
      currentUser.role = 'participant'
    }
  })

  it('submits an individual nomination in a draft award without creating a team' , async () => {
    currentUser.role = 'admin'
    getHackathons.mockResolvedValueOnce({ content: [{ id: 'hackathon-1', title: '2026 Award', status: 'draft' }] })
    const user = userEvent.setup()
    render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectShowcase nominationMode />
        </MemoryRouter>
      </MantineProvider>
    )

    await user.click(await screen.findByRole('radio', { name: /Customer Values/ }))
    await user.type(screen.getByRole('textbox', { name: /Executive Summary/ }), 'A better customer experience in four clear sentences.')
    await user.type(screen.getByRole('textbox', { name: /Details of Your Core Achievement in 2026 and Business Impact/ }), 'Reduced service time by 30% and saved RMB 200,000.')
    await user.type(screen.getByRole('textbox', { name: /How you demonstrate BD China culture/ }), 'Listened to users and delivered an end-to-end solution.')
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')
    expect(fileInput).not.toBeNull()
    const oversized = new File(['image'], 'large.png', { type: 'image/png' })
    Object.defineProperty(oversized, 'size', { value: 50 * 1024 * 1024 + 1 })
    await user.upload(fileInput!, oversized)
    expect(screen.getByText('Photo exceeds 50 MB. Please choose a smaller photo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit nomination' })).toBeDisabled()
    expect(uploadFile).not.toHaveBeenCalled()
    await user.upload(fileInput!, new File(['image'], 'project.png', { type: 'image/png' }))
    expect(screen.queryByText('Photo exceeds 50 MB. Please choose a smaller photo.')).not.toBeInTheDocument()
    const tagsInput = screen.getByRole('textbox', { name: /Tags you want to add/ })
    await user.type(tagsInput, 'Customer、Innovation，Collaboration, Impact、Digital、Sixth、')
    expect(screen.getByRole('button', { name: 'Submit nomination' })).toBeDisabled()
    expect(createIdea).not.toHaveBeenCalled()
    await user.clear(tagsInput)
    await user.type(tagsInput, 'Customer，Innovation、Collaboration, Impact、Digital、Customer、')
    expect(screen.getByRole('button', { name: 'Submit nomination' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Submit nomination' }))

    await waitFor(() => expect(createIdea).toHaveBeenCalled())
    expect(getOrCreateNominationTeam).not.toHaveBeenCalled()
    expect(createTeam).not.toHaveBeenCalled()
    expect(createIdea.mock.calls[0][0]).not.toHaveProperty('teamId')
    expect(uploadFile).toHaveBeenCalledWith(expect.any(File), 'project-attachments', 'nominations/hackathon-1/user-1')
    expect(createIdea).toHaveBeenCalledWith(expect.objectContaining({
      hackathonId: 'hackathon-1',
      category: 'Customer Values',
      tags: ['Customer', 'Innovation', 'Collaboration', 'Impact', 'Digital'],
      title: 'User',
    }))
    expect(createIdea).toHaveBeenCalledWith(expect.objectContaining({
      status: 'submitted',
      projectAttachments: expect.arrayContaining([expect.objectContaining({ type: 'nomination', nomineeUserId: 'user-1', name: 'User' })]),
    }))
    expect(createIdea).toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining('Details of Your Core Achievement in 2026 and Business Impact (including financial figures)'),
    }))
    expect(createIdea).toHaveBeenCalledTimes(1)
    expect(updateIdea).not.toHaveBeenCalled()
    expect(uploadFile.mock.invocationCallOrder[0]).toBeLessThan(createIdea.mock.invocationCallOrder[0])
  })
})


describe('Nominee deletion', () => {
  afterEach(() => { currentUser.role = 'participant'; vi.clearAllMocks() })

  function renderManagement() {
    return render(<MantineProvider><MemoryRouter><ProjectShowcase managementMode /></MemoryRouter></MantineProvider>)
  }

  it.each(['participant', 'manager'] as const)('does not expose deletion to %s', async (role) => {
    currentUser.role = role
    renderManagement()
    await screen.findByText('Customer Portal Renewal')
    expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('requires confirmation, allows cancellation, then removes a committed deletion and updates counts', async () => {
    currentUser.role = 'admin'
    renderManagement()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Customer Portal Renewal' }))
    let dialog = await screen.findByRole('dialog', { name: 'Confirm nomination deletion' })
    expect(deleteIdea).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Customer Portal Renewal')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete Customer Portal Renewal' }))
    dialog = await screen.findByRole('dialog', { name: 'Confirm nomination deletion' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(screen.queryByText('Customer Portal Renewal')).not.toBeInTheDocument())
    expect(deleteIdea).toHaveBeenCalledExactlyOnceWith('idea-1')
    expect(screen.getByRole('button', { name: /All nominees\s*0/ })).toBeInTheDocument()
  })

  it.each(['selected', 'all'])('deletes %s nominations in one batch after confirmation', async (mode) => {
    currentUser.role = 'admin'
    const original = await getIdeas()
    getIdeas.mockResolvedValueOnce({ content: [original.content[0], { ...original.content[0], id: 'idea-2', title: 'Second nomination' }] })
    renderManagement()
    await screen.findByText('Second nomination')
    if (mode === 'selected') await userEvent.click(screen.getByRole('checkbox', { name: 'Select all results (2)' }))
    await userEvent.click(screen.getByRole('button', { name: mode === 'selected' ? 'Delete selected (2)' : 'Delete all (2)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Confirm nomination deletion' })
    expect(deleteIdeas).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(screen.queryByText('Second nomination')).not.toBeInTheDocument())
    expect(deleteIdeas).toHaveBeenCalledExactlyOnceWith(['idea-1', 'idea-2'])
    expect(screen.getByRole('button', { name: 'Delete all (0)' })).toBeDisabled()
  })

  it('preserves nominations and selection on failure and allows retry', async () => {
    currentUser.role = 'admin'
    deleteIdea.mockRejectedValueOnce(new Error('Deletion failed'))
    renderManagement()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select Customer Portal Renewal' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected (1)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Confirm nomination deletion' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm delete' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Deletion failed')
    expect(screen.getByRole('checkbox', { name: 'Select Customer Portal Renewal' })).toBeChecked()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(screen.queryByText('Customer Portal Renewal')).not.toBeInTheDocument())
    expect(deleteIdea).toHaveBeenCalledTimes(2)
  })
})
