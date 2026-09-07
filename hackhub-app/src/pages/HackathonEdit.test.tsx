import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HackathonEdit } from './HackathonEdit'

const { user, emptyCampaigns, getCampaign } = vi.hoisted(() => ({
  user: { id: 'admin-1', role: 'admin' },
  emptyCampaigns: [],
  getCampaign: vi.fn().mockResolvedValue({ id: 'award-1', title: '2026 Digital Pioneer Award', description: 'Annual award', startDate: '2026-10-19T00:00:00Z', endDate: '2026-11-30T00:00:00Z', maxTeamSize: 1, allowedParticipants: 500, status: 'draft', tags: [], prizes: [], createdBy: 'admin-1' }),
}))
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user }) }))
vi.mock('../store/hackathonStore', () => ({ useHackathonStore: () => ({ hackathons: emptyCampaigns, updateHackathon: vi.fn() }) }))
vi.mock('../services/hackathonService', () => ({ HackathonService: { getHackathon: getCampaign } }))

describe('Campaign edit direct entry', () => {
  it('loads an award from the API when the shared campaign store is empty', async () => {
    render(<MantineProvider env="test"><MemoryRouter initialEntries={['/hackathons/award-1/edit']}><Routes><Route path="/hackathons/:id/edit" element={<HackathonEdit />} /></Routes></MemoryRouter></MantineProvider>)
    expect(await screen.findByDisplayValue('2026 Digital Pioneer Award')).toBeInTheDocument()
    expect(getCampaign).toHaveBeenCalledWith('award-1')
  })
})
