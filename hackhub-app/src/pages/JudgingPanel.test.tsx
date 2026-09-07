import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { JudgingPanel } from './JudgingPanel'

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
vi.mock('../contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }))

const mocks = vi.hoisted(() => ({
  user: { id: 'judge-1', role: 'participant' },
  deleteEvaluation: vi.fn(), getJudges: vi.fn(), getMyScores: vi.fn(), submitEvaluation: vi.fn(), notify: vi.fn(),
}))
vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user: mocks.user }) }))
vi.mock('@mantine/notifications', () => ({ notifications: { show: mocks.notify } }))
vi.mock('../services/judgingService', () => ({ JudgingService: mocks }))
vi.mock('../services/votingService', () => ({ VotingService: { getCriteria: async () => [
  { id: 'behavior', name: 'Behavior Demonstration', weight: 70 },
  { id: 'impact', name: 'Business Impact', weight: 30 },
] } }))
vi.mock('../services/ideaService', () => ({ IdeaService: { getIdeas: async () => ({ content: [
  { id: 'case-1', title: 'Customer value case', description: 'Measured impact', category: 'Customer Values', tags: [], status: 'submitted' },
], totalPages: 1 }) } }))

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<MantineProvider env="test"><QueryClientProvider client={client}><MemoryRouter initialEntries={['/hackathons/award-1/judge']}><Routes>
    <Route path="/hackathons/:hackathonId/judge" element={<JudgingPanel />} />
  </Routes></MemoryRouter></QueryClientProvider></MantineProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.user.role = 'participant'
  mocks.getJudges.mockResolvedValue([{ userId: 'judge-1' }])
  mocks.getMyScores.mockResolvedValue([])
  mocks.submitEvaluation.mockResolvedValue([])
})

it('requires explicit scores and submits the Excel example as one complete evaluation', async () => {
  const user = userEvent.setup()
  show()
  const submit = await screen.findByRole('button', { name: 'Submit rating' })
  expect(submit).toBeDisabled()
  await user.type(screen.getByRole('textbox', { name: /Behavior score/ }), '8')
  expect(submit).toBeDisabled()
  await user.type(screen.getByRole('textbox', { name: /Business Impact score/ }), '5')
  expect(screen.getByText('7.1', { exact: true })).toBeInTheDocument()
  expect(submit).toBeDisabled()
  await user.click(screen.getByRole('textbox', { name: /Recommendation/ }))
  await user.click(await screen.findByRole('option', { name: 'Recommend', exact: true }))
  await user.type(screen.getByRole('textbox', { name: 'Comments, if any' }), 'Verified outcome')
  await user.click(submit)
  await waitFor(() => expect(mocks.submitEvaluation).toHaveBeenCalledWith('award-1', {
    ideaId: 'case-1', scores: [{ criterionId: 'behavior', score: 8 }, { criterionId: 'impact', score: 5 }],
    comment: 'Recommendation: Recommend\n\nVerified outcome',
  }))
})

it('leaves partial historical evaluations incomplete and restores the saved value', async () => {
  mocks.getMyScores.mockResolvedValue([{ id: 'old-score', ideaId: 'case-1', judgeId: 'judge-1', criterionId: 'behavior', score: 8, comment: 'Recommendation: Recommend' }])
  show()
  expect(await screen.findByRole('textbox', { name: /Behavior score/ })).toHaveValue('8')
  expect(screen.getByRole('textbox', { name: /Business Impact score/ })).toHaveValue('')
  expect(screen.queryByText('Recorded')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Submit rating' })).toBeDisabled()
})

it('lets an unassigned manager review the form without submitting scores', async () => {
  mocks.user.role = 'admin'
  mocks.getJudges.mockResolvedValue([])
  show()
  expect(await screen.findByRole('textbox', { name: /Behavior score/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Submit rating' })).toBeDisabled()
  expect(mocks.getMyScores).not.toHaveBeenCalled()
})

it('deletes only the current judges complete evaluation and refreshes the form', async () => {
  mocks.getMyScores.mockResolvedValue([
    { id: 'b', ideaId: 'case-1', judgeId: 'judge-1', criterionId: 'behavior', score: 8, comment: 'Recommendation: Recommend' },
    { id: 'i', ideaId: 'case-1', judgeId: 'judge-1', criterionId: 'impact', score: 5, comment: 'Recommendation: Recommend' },
  ])
  mocks.deleteEvaluation.mockResolvedValue(undefined)
  const user = userEvent.setup()
  show()
  await user.click(await screen.findByRole('button', { name: 'Delete rating' }))
  mocks.getMyScores.mockResolvedValue([])
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }))
  expect(mocks.deleteEvaluation).toHaveBeenCalledWith('award-1', 'case-1')
  expect(await screen.findByRole('button', { name: 'Submit rating' })).toBeDisabled()
})
