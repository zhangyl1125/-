import { useState } from 'react'
import type { ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActionIcon, Alert, Badge, Button, Card, Center, Container, Group, Loader, Select, Stack, Table, Text } from '@mantine/core'
import { IconArrowLeft, IconDownload } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { JudgingService } from '../services/judgingService'
import { VotingService } from '../services/votingService'
import { useAuthStore } from '../store/authStore'
import { PermissionService } from '../utils/permissions'
import { loadAllNominations, rankCommitteeScores } from '../utils/committeeScoring'
import './DigitalPioneer.css'

interface LeaderboardProps { hackathonId?: string }

function downloadCsv(cells: string[][]): void {
  const csv = '\uFEFF' + cells.map((row) => row.map((cell) => {
    const safe = /^[=+@\-\t\r]/.test(cell) ? `'${cell}` : cell
    return `"${safe.replaceAll('"', '""')}"`
  }).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'digital-pioneer-committee-ranking.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function Leaderboard({ hackathonId: propHackathonId }: LeaderboardProps = {}): ReactElement {
  const { hackathonId: routeHackathonId } = useParams<{ hackathonId: string }>()
  const hackathonId = propHackathonId ?? routeHackathonId
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canManage = user !== null && PermissionService.isManagerOrAbove(user)
  const [category, setCategory] = useState<string | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null)
  const summary = useQuery({ queryKey: ['score-summary', hackathonId], queryFn: () => JudgingService.getScoreSummary(hackathonId!), enabled: Boolean(hackathonId && canManage), staleTime: 30000, refetchInterval: 30000 })
  const ideas = useQuery({ queryKey: ['leaderboard-ideas', hackathonId], queryFn: () => loadAllNominations(hackathonId!), enabled: Boolean(hackathonId && canManage), staleTime: 60000 })
  const details = useQuery({ queryKey: ['all-judge-scores', hackathonId], queryFn: () => JudgingService.getAllScores(hackathonId!), enabled: Boolean(hackathonId && canManage), refetchInterval: 30000 })
  const judges = useQuery({ queryKey: ['hackathon-judges', hackathonId], queryFn: () => JudgingService.getJudges(hackathonId!), enabled: Boolean(hackathonId && canManage) })
  const criteria = useQuery({ queryKey: ['voting-criteria', hackathonId], queryFn: () => VotingService.getCriteria(hackathonId!), enabled: Boolean(hackathonId && canManage) })
  const nominations = new Map((ideas.data ?? []).map((idea) => [idea.id, idea]))
  const rows = rankCommitteeScores((summary.data ?? []).filter((score) => !category || nominations.get(score.ideaId)?.category === category))
  const error = summary.error ?? ideas.error
  const detailError = details.error ?? judges.error ?? criteria.error
  const selectedScores = (details.data ?? []).filter((score) => score.ideaId === selectedIdea)
  const judgeGroups = [...new Set([...(judges.data ?? []).map((judge) => judge.userId), ...selectedScores.map((score) => score.judgeId)])]
  const exportRows = [['Rank', 'Nomination', 'Category', 'Committee total / 10', 'Completed judges', 'Associate votes'], ...rows.map((score) => [String(score.displayRank ?? ''), score.ideaTitle, nominations.get(score.ideaId)?.category ?? '', score.panelScore?.toFixed(2) ?? 'Not scored', String(score.judgeCount), String(score.voteCount)])]

  if (!canManage) return <Container size="sm" py="xl"><Alert color="blue" title="Manager access required">Committee rankings and individual ratings are available to award managers.</Alert></Container>

  return <Container size={1320} w="100%" miw={0} style={{ maxWidth: 1320 }} py={{ base: 'md', md: 'xl' }} className="dp-page"><Stack gap="xl" miw={0}>
    <Group justify="space-between" align="flex-end">
      <div><Group gap="xs" mb="md"><ActionIcon variant="subtle" aria-label="Back to award event" onClick={() => navigate(`/awards/${hackathonId}`)}><IconArrowLeft size={18} /></ActionIcon><Text className="dp-section-label" mb={0}>Committee view · Live totals</Text></Group>
        <h1 className="dp-section-title">Committee ranking</h1><Text className="dp-section-copy" mt="md">Average of completed committee evaluations: Behavior Demonstration 70% + Business Impact 30%. Equal totals share a rank; associate votes do not affect committee totals.</Text></div>
      <Button variant="light" color="grape" leftSection={<IconDownload size={17} />} disabled={!rows.length || Boolean(error)} onClick={() => downloadCsv(exportRows)}>Export CSV</Button>
    </Group>
    <Select label="Award category" placeholder="All categories" clearable value={category} onChange={setCategory} data={[...new Set((ideas.data ?? []).map((idea) => idea.category))]} maw={360} />
    {summary.isLoading || ideas.isLoading ? <Center py={60}><Loader /></Center> : error ? <Alert color="red">{error instanceof Error ? error.message : 'Unable to load ranking.'}</Alert> : !rows.length ? <Text c="dimmed">No nominations in this category yet.</Text> : <Card className="dp-ranking-shell" p={0} miw={0} maw="100%" style={{ overflow: 'hidden' }}>
      <Table.ScrollContainer type="native" minWidth={850}><Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover><Table.Thead><Table.Tr>{['Rank', 'Nomination', 'Category', 'Committee total', 'Completed judges', 'Associate votes', ...(canManage ? ['Ratings'] : [])].map((label) => <Table.Th key={label}>{label}</Table.Th>)}</Table.Tr></Table.Thead><Table.Tbody>
        {rows.map((score) => <Table.Tr key={score.ideaId}><Table.Td>{score.displayRank === null ? '—' : `#${score.displayRank}`}</Table.Td><Table.Td><Text fw={700}>{score.ideaTitle}</Text><Text size="sm" c="dimmed">{nominations.get(score.ideaId)?.projectAttachments?.find((attachment) => attachment.type === 'nomination')?.name}</Text></Table.Td><Table.Td><Badge variant="light">{nominations.get(score.ideaId)?.category}</Badge></Table.Td><Table.Td><Text fw={800}>{score.panelScore?.toFixed(2) ?? 'Not scored'}</Text></Table.Td><Table.Td>{score.judgeCount}</Table.Td><Table.Td>{score.voteCount}</Table.Td>{canManage ? <Table.Td><Button variant="subtle" size="xs" onClick={() => setSelectedIdea(score.ideaId)}>View ratings</Button></Table.Td> : null}</Table.Tr>)}
      </Table.Tbody></Table></Table.ScrollContainer>
    </Card>}
    {canManage && selectedIdea ? <Card className="dp-ranking-shell" p="lg" miw={0} maw="100%" style={{ overflow: 'hidden' }}><Stack><Text fw={800}>Committee ratings · {nominations.get(selectedIdea)?.title}</Text>
      {details.isLoading || judges.isLoading || criteria.isLoading ? <Loader /> : detailError ? <Alert color="red">Unable to load individual ratings. Please reload and try again.</Alert> : !judgeGroups.length ? <Text c="dimmed">No committee ratings have been submitted for this nomination.</Text> : <Table.ScrollContainer type="native" minWidth={720}><Table verticalSpacing="md"><Table.Thead><Table.Tr><Table.Th>Committee member</Table.Th>{(criteria.data ?? []).map((criterion) => <Table.Th key={criterion.id}>{criterion.name} ({criterion.weight}%)</Table.Th>)}<Table.Th>Weighted total / 10</Table.Th><Table.Th>Recommendation & comments</Table.Th></Table.Tr></Table.Thead><Table.Tbody>
        {judgeGroups.map((judgeId) => {
          const scores = selectedScores.filter((score) => score.judgeId === judgeId)
          const complete = (criteria.data?.length ?? 0) > 0 && criteria.data!.every((criterion) => scores.some((score) => score.criterionId === criterion.id))
          const total = (criteria.data ?? []).reduce((sum, criterion) => sum + (scores.find((score) => score.criterionId === criterion.id)?.score ?? 0) * criterion.weight / 100, 0)
          return <Table.Tr key={judgeId}><Table.Td>{judges.data?.find((judge) => judge.userId === judgeId)?.name ?? judgeId}</Table.Td>{(criteria.data ?? []).map((criterion) => <Table.Td key={criterion.id}>{scores.find((score) => score.criterionId === criterion.id)?.score ?? 'Pending'}</Table.Td>)}<Table.Td>{complete ? total.toFixed(2) : 'Incomplete'}</Table.Td><Table.Td><Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{[...new Set(scores.map((score) => score.comment).filter(Boolean))].join('\n\n') || '—'}</Text></Table.Td></Table.Tr>
        })}
      </Table.Tbody></Table></Table.ScrollContainer>}
    </Stack></Card> : null}
  </Stack></Container>
}
