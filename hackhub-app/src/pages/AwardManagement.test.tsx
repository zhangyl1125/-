import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AwardManagement } from './AwardManagement'

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })

const { user } = vi.hoisted(() => ({ user: { id: 'judge-1', role: 'participant' as 'participant' | 'admin' } }))
vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user }) }))
vi.mock('../services/hackathonService', () => ({ HackathonService: { getHackathons: vi.fn().mockResolvedValue({ content: [
  { id: 'award-1', title: 'Assigned award', startDate: '2026-10-19', endDate: '2026-11-30', status: 'running' },
  { id: 'award-2', title: 'Other award', startDate: '2026-10-19', endDate: '2026-11-30', status: 'running' },
] }) } }))
vi.mock('../services/judgingService', () => ({ JudgingService: { getJudges: vi.fn(async (id: string) => id === 'award-1' ? [{ id: 'assignment-1', userId: 'judge-1', name: 'Assigned Judge' }] : []) } }))
vi.mock('../lib/apiClient', () => ({ api: { get: vi.fn().mockResolvedValue({ content: [] }) } }))
vi.mock('../components/VotingCriteriaManager', () => ({ VotingCriteriaManager: () => <div>Official evaluation criteria</div> }))

const show = (path: string) => render(<MantineProvider env="test"><MemoryRouter initialEntries={[path]}><Routes><Route path="/awards" element={<AwardManagement />} /><Route path="/awards/:id" element={<AwardManagement />} /></Routes></MemoryRouter></MantineProvider>)

describe('AwardManagement', () => {
  it('shows committee associates only their assigned campaigns and no admin voting settings', async () => {
    show('/awards')
    expect(await screen.findByText('Assigned award')).toBeInTheDocument()
    expect(screen.queryByText('Other award')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Committee scoring' })).toHaveAttribute('href', '/hackathons/award-1/judge')
    expect(screen.queryByText(/Associate voting: 4 votes/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create award campaign' })).not.toBeInTheDocument()
  })

  it('keeps committee assignment, rankings and department rules accessible to administrators', async () => {
    user.role = 'admin'
    try {
      show('/awards/award-1')
      expect(await screen.findByRole('heading', { name: 'Committee members' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Scores & rankings' })).toHaveAttribute('href', '/hackathons/award-1/leaderboard')
      expect(screen.getByText(/BD\/DPA-SRE3 → BD\/DPA/)).toBeInTheDocument()
      expect(screen.queryByText(/Maximum Team Size/)).not.toBeInTheDocument()
    } finally { user.role = 'participant' }
  })
})
