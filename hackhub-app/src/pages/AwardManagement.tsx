import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Alert, Badge, Button, Card, Container, Group, Modal, TextInput, Select, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '../store/authStore'
import { HackathonService, type Hackathon } from '../services/hackathonService'
import { JudgingService, type HackathonJudge } from '../services/judgingService'
import { OrganizationService } from '../services/organizationService'
import { getAllPages } from '../services/pagination'
import { api } from '../lib/apiClient'
import { DIGITAL_PIONEER_RUBRIC } from '../config/digitalPioneer'
import { VotingCriteriaManager } from '../components/VotingCriteriaManager'
import { useLanguage } from '../contexts/LanguageContext'
import { translateUiText } from '../contexts/uiTranslations'
import './DigitalPioneer.css'

export function AwardManagement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Hackathon | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const { user } = useAuthStore()
  const { language } = useLanguage()
  const [campaigns, setCampaigns] = useState<Hackathon[]>([])
  const [judges, setJudges] = useState<HackathonJudge[]>([])
  const [members, setMembers] = useState<Array<{ value: string; label: string }>>([])
  const [invitee, setInvitee] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isAdmin = user?.role === 'admin'
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const visibleCampaigns = campaigns.filter((item) => `${item.title} ${item.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  const campaign = campaigns.find((item) => item.id === id)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const campaigns = await getAllPages((page) => HackathonService.getHackathons(page, 100))
        const assignments = await Promise.all(campaigns.map(async (item) => ({
          campaign: item,
          judges: await JudgingService.getJudges(item.id),
        })))
        if (!active) return
        setCampaigns(assignments.filter((item) => canManage || item.judges.some((judge) => judge.userId === user?.id)).map((item) => item.campaign))
        setJudges(assignments.find((item) => item.campaign.id === id)?.judges ?? [])
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load award campaigns.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [id, user?.id, canManage])

  useEffect(() => {
    if (!canManage || !id) return
    let active = true
    const loadMembers = async () => {
      try {
        const options = user?.role === 'admin'
          ? (await getAllPages((page) => api.get<{ content: Array<{ id: string; name: string; email: string }>; totalPages?: number }>(`/api/v1/admin/users?page=${page}&size=200&sort=name,asc`))).map((member) => ({ value: member.id, label: `${member.name} (${member.email})` }))
          : (await Promise.all((await OrganizationService.getMyOrganizations()).map(async (org) =>
              (await OrganizationService.getMembers(org.id)).map((member) => ({ value: member.userId, label: `${member.name ?? member.email} (${member.email ?? ''})` }))
            ))).flat()
        if (active) setMembers([...new Map(options.map((option) => [option.value, option])).values()])
      } catch {
        if (active) setError('Unable to load associates for committee assignment. Refresh to retry.')
      }
    }
    void loadMembers()
    return () => { active = false }
  }, [canManage, id, user?.role])

  const mutate = async (operation: () => Promise<void>) => {
    setBusy(true)
    try {
      await operation()
      notifications.show({ title: 'Saved', message: 'Award settings updated.', color: 'green' })
    } catch (cause) {
      notifications.show({ title: 'Unable to save', message: cause instanceof Error ? cause.message : 'Try again.', color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const requestDelete = (item: Hackathon) => {
    setDeleteError('')
    setDeleteTarget(item)
  }

  const deleteCampaign = async () => {
    if (!deleteTarget || busy || !isAdmin) return
    setBusy(true)
    setDeleteError('')
    try {
      await HackathonService.deleteHackathon(deleteTarget.id)
      setCampaigns((current) => current.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
      if (id === deleteTarget.id) navigate('/awards')
      notifications.show({ title: 'Deleted', message: 'Award campaign deleted.', color: 'green' })
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Unable to delete award campaign. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <Container size={1240} py="xl" className="dp-page dp-management-page">
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Title order={1}>{canManage ? 'Award management' : 'Committee scoring'}</Title>
            <Text c="white" mt="sm">{canManage ? 'Manage committee members, review case ratings, and track the final ranking.' : 'Open an assigned award to review nominations and submit your ratings.'}</Text>
          </div>
          {canManage && <Button component={Link} to="/hackathons/create" className="dp-primary-button">Create award campaign</Button>}
        </Group>
        {!id && <TextInput aria-label={language === 'zh' ? '搜索奖项' : 'Search awards'} placeholder={language === 'zh' ? '搜索奖项' : 'Search awards'} value={search} onChange={(event) => setSearch(event.currentTarget.value)} maw={420} />}
        {error && <Alert color="red" role="alert">{error}</Alert>}
        {loading ? <Text role="status">Loading award campaigns…</Text> : !id ? (
          visibleCampaigns.length ? visibleCampaigns.map((item) => (
            <Card key={item.id} className="dp-form-shell" p={{ base: 'lg', md: 32 }}>
              <Group justify="space-between">
                <div><Title order={3}>{canManage ? <Link className="dp-award-title-link" to={`/awards/${item.id}`}>{item.title}</Link> : item.title}</Title><Text c="white" mt="xs">{new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}</Text></div>
                <Badge>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Badge>
              </Group>
              <Group mt="lg">
                <Button component={Link} to={`/hackathons/${item.id}/judge`}>Committee scoring</Button>
                {canManage && <Button component={Link} to={`/hackathons/${item.id}/leaderboard`} variant="light">Scores & rankings</Button>}
                {canManage && <Button component={Link} to={`/hackathons/${item.id}/edit`} variant="outline">Edit campaign & dates</Button>}
                {isAdmin && <Button variant="subtle" color="red" c="#ffb1b1" onClick={() => requestDelete(item)}>Delete award</Button>}
              </Group>
            </Card>
          )) : <Text>No award campaigns are available{canManage ? '.' : ' for your committee account.'}</Text>
        ) : !campaign ? <Alert color="orange">This award campaign is unavailable.</Alert> : (
          <>
            <Card className="dp-form-shell" p={{ base: 'lg', md: 32 }}>
              <Group justify="space-between"><Title order={2}>{campaign.title}</Title><Badge>{campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}</Badge></Group>
              <Text mt="md">{campaign.description}</Text>
              <Group mt="lg">
                <Button component={Link} to={`/hackathons/${id}/judge`}>Committee scoring</Button>
                {canManage && <Button component={Link} to={`/hackathons/${id}/leaderboard`} variant="light">Scores & rankings</Button>}
                {canManage && <Button component={Link} to={`/hackathons/${id}/edit`} variant="default">Edit campaign & dates</Button>}
                {isAdmin && <Button variant="subtle" color="red" c="#ffb1b1" onClick={() => requestDelete(campaign)}>Delete award</Button>}
              </Group>
              {canManage && <Select mt="lg" maw={520} size="md" label="Campaign status" description="Running campaigns accept associate votes; completed campaigns close voting." value={campaign.status} disabled={busy}
                data={[{ value: 'draft', label: 'Draft' }, { value: 'open', label: 'Open' }, { value: 'running', label: 'Running' }, { value: 'completed', label: 'Completed' }].map((option) => ({ ...option, label: language === 'zh' ? translateUiText(option.label) : option.label }))}
                onChange={(value) => { if (value) void mutate(async () => {
                  const updated = await HackathonService.transitionStatus(campaign.id, value as Hackathon['status'])
                  setCampaigns((current) => current.map((item) => item.id === updated.id ? updated : item))
                }) }} />}
            </Card>
            {canManage && <Card className="dp-form-shell" p={{ base: 'lg', md: 32 }}>
              <Title order={3}>Committee members</Title>
              <Stack mt="md">
                {judges.map((judge) => <Group key={judge.id} justify="space-between">
                  <Text>{judge.name ?? judge.userId} · {judge.email}</Text>
                  <Button size="sm" variant="subtle" color="red" disabled={busy} onClick={() => void mutate(async () => { await JudgingService.removeJudge(campaign.id, judge.userId); setJudges((current) => current.filter((item) => item.userId !== judge.userId)) })}>Remove</Button>
                </Group>)}
                {!judges.length && <Text c="white">No committee members assigned yet.</Text>}
                <Select size="md" label="Assign an associate" searchable value={invitee} onChange={setInvitee} data={members.filter((member) => !judges.some((judge) => judge.userId === member.value))} />
                <Button w="fit-content" loading={busy} disabled={!invitee} onClick={() => void mutate(async () => { if (!invitee) return; const added = await JudgingService.inviteJudge(campaign.id, invitee); setJudges((current) => [...current, added]); setInvitee(null) })}>Assign committee member</Button>
              </Stack>
            </Card>}
            {canManage && <VotingCriteriaManager hackathonId={campaign.id} isManager />}
            <Card className="dp-form-shell" p={{ base: 'lg', md: 32 }}>
              <Title order={3}>Evaluation standard</Title>
              {DIGITAL_PIONEER_RUBRIC.map((criterion) => <Text key={criterion.key} mt="md"><strong>{criterion.name} · {criterion.weight}%</strong><br />{criterion.description}</Text>)}
              {canManage && <Text mt="lg" c="white">Associate voting: up to 4 votes per category. At least 50% must be outside the voter's department after every vote or withdrawal. Department is the Org.code prefix before “-”: BD/DPA-SRE3 → BD/DPA; BD/BA-AP → BD/BA. Committee rankings use the weighted evaluation score.</Text>}
            </Card>
          </>
        )}
      </Stack>
      <Modal opened={!!deleteTarget} onClose={() => { if (!busy) setDeleteTarget(null) }} title="Delete award campaign?" centered closeOnClickOutside={!busy} closeOnEscape={!busy} withCloseButton={!busy}>
        <Stack>
          <Text fw={700}>{deleteTarget?.title}</Text>
          <Text>This permanently deletes the campaign and its nominations, votes, committee assignments, and scores. This cannot be undone.</Text>
          {deleteError && <Alert color="red" role="alert">{deleteError}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button color="red" loading={busy} onClick={() => void deleteCampaign()}>Confirm deletion</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
