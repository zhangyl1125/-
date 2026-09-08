import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ProjectShowcase } from './ProjectShowcase'

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
Element.prototype.scrollIntoView = vi.fn()

vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user: null }) }))
const { getNominations } = vi.hoisted(() => ({ getNominations: vi.fn().mockResolvedValue({ content: [{
  id: 'nominee-1', title: 'Public nomination', description: 'Published achievement', nominee_name: 'Associate',
  nominee_org_code: 'BD/DPA-SRE3', hackathon_id: 'award-1', category: 'Customer Values', technologies: [],
  images: [], votes: 2, status: 'submitted', created_at: '', submission_date: '',
}] }) }))
vi.mock('../services/publicAwardService', () => ({ PublicAwardService: {
  getAwards: vi.fn().mockResolvedValue({ content: [{ id: 'award-1', title: '2026 Award', status: 'running' }] }),
  getNominations,
} }))
function LoginTarget() { return <p>Login destination: {useLocation().search}</p> }
function page(nominationMode = false) {
  return render(<MantineProvider><MemoryRouter initialEntries={['/projects']}><Routes>
    <Route path="/projects" element={<ProjectShowcase nominationMode={nominationMode} />} />
    <Route path="/login" element={<LoginTarget />} />
  </Routes></MemoryRouter></MantineProvider>)
}
describe('Public award browsing', () => {
  it('lets guests browse details and requires login only after clicking vote', async () => {
    page()
    expect(await screen.findByText('Public nomination')).toBeInTheDocument()
    expect(screen.queryByText(/Login destination/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Details & comments' }))
    expect(await screen.findByRole('heading', { name: 'Nominee' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Committee scoring' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset my track votes' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vote (2)' }))
    expect(await screen.findByText(/Login destination/)).toHaveTextContent('redirect=%2Fprojects%3Fnominee%3Dnominee-1')
  })
  it('shows the original nomination fields without asking guests to log in', async () => {
    page(true)
    fireEvent.click(await screen.findByRole('radio', { name: /VALUE.*Customer Values/ }))
    expect(await screen.findByRole('textbox', { name: /Executive summary/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit nomination' })).toBeDisabled()
    expect(screen.queryByText(/Login destination/)).not.toBeInTheDocument()
  })
})
