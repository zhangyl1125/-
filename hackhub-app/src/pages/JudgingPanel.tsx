import { useState } from 'react'
import type { ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Progress,
  Select,
  Slider,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconClipboardCheck,
  IconExternalLink,
  IconScale,
  IconTrophy,
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { DIGITAL_PIONEER_RECOMMENDATIONS, DIGITAL_PIONEER_RUBRIC } from '../config/digitalPioneer'
import { useAuthStore } from '../store/authStore'
import { loadAllNominations, officialCriteria, savedEvaluation } from '../utils/committeeScoring'
import type { JudgeScore } from '../services/judgingService'
import type { Idea } from '../services/ideaService'
import { JudgingService } from '../services/judgingService'
import { VotingService } from '../services/votingService'
import type { VotingCriteria } from '../services/votingService'
import { PermissionService } from '../utils/permissions'
import './DigitalPioneer.css'

interface IdeaScores {
  [criteriaId: string]: number
}

interface ScoreSubmission {
  ideaId: string
  scores: IdeaScores
  recommendation: string
  comment: string
}

function getScoreTone(score: number): string {
  if (score >= 9) return 'grape'
  if (score >= 7) return 'green'
  if (score >= 5) return 'yellow'
  return 'red'
}

function getScoreLabel(score: number, impact: boolean): string {
  if (score >= 9) return impact ? 'Significant' : 'Benchmark'
  if (score >= 7) return impact ? 'Noticeable' : 'Strong'
  if (score >= 5) return 'Marginal'
  return impact ? 'Limited' : 'Non-compliant'
}

function matchingRubric(criterion: VotingCriteria, index: number) {
  const normalized = criterion.name.toLowerCase()
  if (normalized.includes('impact') || normalized.includes('business')) return DIGITAL_PIONEER_RUBRIC[1]
  if (normalized.includes('behavior') || normalized.includes('behaviour')) return DIGITAL_PIONEER_RUBRIC[0]
  return DIGITAL_PIONEER_RUBRIC[Math.min(index, DIGITAL_PIONEER_RUBRIC.length - 1)]
}

interface IdeaJudgingCardProps {
  idea: Idea
  criteria: VotingCriteria[]
  onSubmit: (submission: ScoreSubmission) => void
  isSubmitting: boolean
  alreadyScored: boolean
  savedScores: JudgeScore[]
  canSubmitRating: boolean
}

function IdeaJudgingCard({
  idea,
  criteria,
  onSubmit,
  isSubmitting,
  alreadyScored,
  savedScores,
  canSubmitRating,
}: IdeaJudgingCardProps): ReactElement {
  const nominee = idea.projectAttachments?.find((attachment) => attachment.type === 'nomination')
  const saved = savedEvaluation(savedScores)
  const [scores, setScores] = useState<IdeaScores>(() =>
    Object.fromEntries(criteria.map((criterion) => [criterion.id, saved.scores[criterion.id] ?? 7]))
  )
  const [recommendation, setRecommendation] = useState<string | null>(saved.recommendation)
  const [comment, setComment] = useState(saved.comment)

  const weightedScore = criteria.reduce(
    (total, criterion) => total + (scores[criterion.id] ?? 0) * (criterion.weight / 100),
    0
  )
  const canSubmit = canSubmitRating && criteria.length > 0
    && criteria.every((criterion) => Number.isInteger(scores[criterion.id]))
    && recommendation !== null

  return (
    <Card className="dp-judge-shell" p={{ base: 'lg', md: 32 }}>
      <Grid gutter={{ base: 24, md: 38 }}>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="md" h="100%">
            <Group justify="space-between" align="flex-start">
              <Badge variant="light" color="grape">{idea.category}</Badge>
              {alreadyScored ? (
                <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>Recorded</Badge>
              ) : null}
            </Group>
            <div>
              <Title order={3}>{idea.title}</Title>
              <Text size="sm" c="dimmed" mt="sm" style={{ whiteSpace: 'pre-line' }}>
                {idea.description}
              </Text>
            </div>
            <div className="dp-fieldset">
              <Text size="sm"><b>Nominee:</b> {nominee?.name ?? 'Not provided'}</Text>
              <Text size="sm"><b>Org. code:</b> {nominee?.nomineeOrgCode ?? 'Not provided'}</Text>
              <Text size="sm"><b>Position:</b> {nominee?.nomineePosition ?? 'Not provided'}</Text>
              <Text size="sm"><b>Nominating HoD:</b> {nominee?.nominatingHead ?? 'Not provided'}</Text>
            </div>
            <Group gap="xs">
              {idea.tags.slice(0, 4).map((tag) => <Badge key={tag} size="sm" variant="outline">{tag}</Badge>)}
            </Group>
            <Stack gap="xs" mt="auto">
              {(idea.projectAttachments ?? []).filter((attachment) => attachment.type !== 'nomination' && /^https?:\/\//i.test(attachment.url)).map((attachment) => (
                <Button key={attachment.url} component="a" href={attachment.url} target="_blank" rel="noopener noreferrer" variant="light" rightSection={<IconExternalLink size={15} />}>{attachment.name || 'Review attachment'}</Button>
              ))}
              {idea.repositoryUrl ? (
                <Button component="a" href={idea.repositoryUrl} target="_blank" variant="light" rightSection={<IconExternalLink size={15} />}>
                  Review evidence
                </Button>
              ) : null}
              {idea.demoUrl ? (
                <Button component="a" href={idea.demoUrl} target="_blank" variant="subtle" rightSection={<IconExternalLink size={15} />}>
                  Open demo
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="xl">
            <Group justify="space-between" align="flex-end">
              <div>
                <Title order={3}>Score the evidence</Title>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text className="dp-utility" size="sm" c="dimmed">Weighted total</Text>
                <Text className="dp-field-number" fw={700}>{weightedScore.toFixed(1)}</Text>
              </div>
            </Group>

            {criteria.map((criterion, index) => {
              const score = scores[criterion.id] ?? 7
              const rubric = matchingRubric(criterion, index)
              return (
                <div className="dp-fieldset" key={criterion.id}>
                  <Group justify="space-between" align="flex-start" mb="lg">
                    <div>
                      <Group gap="xs">
                        <Text fw={800}>{rubric.name}</Text>
                        <Text className="dp-score-accent" fw={700}>{rubric.nameZh}</Text>
                        <Badge variant="filled" color="dark">{criterion.weight}%</Badge>
                      </Group>
                      <Text size="sm" c="dimmed" mt={5}>{rubric.description}</Text>
                    </div>
                    <Badge color={getScoreTone(score)} variant="light" size="lg">
                      {score} · {getScoreLabel(score, rubric.key === 'impact')}
                    </Badge>
                  </Group>
                  <Slider
                    aria-label={`${rubric.name} score`}
                    value={score}
                    onChange={(value) => setScores((current) => ({ ...current, [criterion.id]: value }))}
                    min={1}
                    max={10}
                    step={1}
                    marks={[1, 4, 7, 10].map((value) => ({ value, label: String(value) }))}
                    color={getScoreTone(score)}
                    size="md"
                  />
                  <Accordion variant="contained" mt={32}>
                    <Accordion.Item value={`${criterion.id}-guide`}>
                      <Accordion.Control>View scoring guide</Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="sm">
                          {rubric.levels.map((level) => (
                            <Grid key={level.range} gutter="sm">
                              <Grid.Col span={2}><Text fw={800} className="dp-score-accent">{level.range}</Text></Grid.Col>
                              <Grid.Col span={3}><Text fw={700} size="sm">{level.label}</Text></Grid.Col>
                              <Grid.Col span={7}><Text size="sm" c="dimmed">{level.detail}</Text></Grid.Col>
                            </Grid>
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>
                </div>
              )
            })}

            <div className="dp-fieldset">
              <Grid gutter="md">
                <Grid.Col span={{ base: 12, sm: 5 }}>
                  <Select
                    label="Recommendation"
                   
                    required
                    placeholder="Select a recommendation"
                    data={DIGITAL_PIONEER_RECOMMENDATIONS.map(({ value, label }) => ({ value, label }))}
                    value={recommendation}
                    onChange={setRecommendation}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 7 }}>
                  <Textarea
                    label="Comments, if any"
                   
                    minRows={3}
                    maxLength={1200}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </Grid.Col>
              </Grid>
            </div>

            {alreadyScored ? (
              <Alert color="teal" icon={<IconCheck size={18} />}>
                A rating from you is already recorded. Submit again only if you intend to update it.
              </Alert>
            ) : null}

            <Group justify="space-between" align="center">
              <div style={{ flex: 1, maxWidth: 260 }}>
                <Progress value={weightedScore * 10} color={getScoreTone(weightedScore)} size="sm" />
              </div>
              <Button
                className="dp-primary-button"
                leftSection={<IconClipboardCheck size={17} />}
                disabled={!canSubmit}
                loading={isSubmitting}
                onClick={() => onSubmit({
                  ideaId: idea.id,
                  scores,
                  recommendation: recommendation ?? '',
                  comment,
                })}
              >
                {alreadyScored ? 'Update rating' : 'Submit rating'}
              </Button>
            </Group>
          </Stack>
        </Grid.Col>
      </Grid>
    </Card>
  )
}

export function JudgingPanel(): ReactElement {
  const { hackathonId } = useParams<{ hackathonId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [submittingIdea, setSubmittingIdea] = useState<string | null>(null)
  const canManageJudging = user !== null && PermissionService.isManagerOrAbove(user)

  const { data: judges, isLoading: judgeStatusLoading, error: judgeStatusError } = useQuery({
    queryKey: ['hackathon-judges', hackathonId],
    queryFn: () => JudgingService.getJudges(hackathonId!),
    enabled: Boolean(hackathonId && user),
    staleTime: 60 * 1000,
  })
  const isAssignedJudge = (judges ?? []).some((judge) => judge.userId === user?.id)
  const canJudge = canManageJudging || isAssignedJudge

  const { data: criteria, isLoading: criteriaLoading, error: criteriaError } = useQuery({
    queryKey: ['voting-criteria', hackathonId],
    queryFn: () => VotingService.getCriteria(hackathonId!),
    enabled: Boolean(hackathonId && canJudge),
    staleTime: 5 * 60 * 1000,
  })
  const { data: nominations, isLoading: ideasLoading, error: ideasError } = useQuery({
    queryKey: ['judging-ideas', hackathonId],
    queryFn: () => loadAllNominations(hackathonId!),
    enabled: Boolean(hackathonId && canJudge),
    staleTime: 2 * 60 * 1000,
  })
  const { data: myScores, isLoading: scoresLoading, error: scoresError } = useQuery({
    queryKey: ['my-judge-scores', hackathonId],
    queryFn: () => JudgingService.getMyScores(hackathonId!),
    enabled: Boolean(hackathonId && isAssignedJudge),
    staleTime: 60 * 1000,
  })

  const ownScores = (myScores ?? []).filter((score) => score.judgeId === user?.id)
  const scoredIdeaIds = new Set(ownScores.map((score) => score.ideaId))

  const scoreIdeaMutation = useMutation({
    mutationFn: async (submission: ScoreSubmission) => {
      const note = [`Recommendation: ${submission.recommendation}`, submission.comment.trim()]
        .filter(Boolean)
        .join('\n\n')
      await JudgingService.submitEvaluation(hackathonId!, {
        ideaId: submission.ideaId,
        scores: Object.entries(submission.scores).map(([criterionId, score]) => ({ criterionId, score })),
        comment: note,
      })
      return submission.ideaId
    },
    onSuccess: async () => {
      setSubmittingIdea(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-judge-scores', hackathonId] }),
        queryClient.invalidateQueries({ queryKey: ['judging-ideas', hackathonId] }),
        queryClient.invalidateQueries({ queryKey: ['score-summary', hackathonId] }),
        queryClient.invalidateQueries({ queryKey: ['all-judge-scores', hackathonId] }),
      ])
      notifications.show({
        title: 'Rating recorded',
        message: 'The weighted total and committee ranking have been updated.',
        color: 'teal',
      })
    },
    onError: (error) => {
      setSubmittingIdea(null)
      notifications.show({
        title: 'Rating not recorded',
        message: error instanceof Error ? error.message : 'Please try again.',
        color: 'red',
      })
    },
  })

  if (judgeStatusLoading) {
    return <Center py={100}><Loader size="lg" /></Center>
  }

  if (judgeStatusError) return <Alert color="red">Unable to verify committee access. Please reload and try again.</Alert>

  if (!canJudge) {
    return (
      <Container size="sm" py={80}>
        <Center>
          <Stack align="center" gap="md">
            <ThemeIcon size={72} radius="xl" variant="light" color="red"><IconAlertCircle size={34} /></ThemeIcon>
            <Title order={2}>Committee access required</Title>
            <Text ta="center" c="dimmed">Only assigned committee members and award managers can open this evaluation form.</Text>
            <Button variant="light" onClick={() => navigate(`/hackathons/${hackathonId}`)}>Back to award event</Button>
          </Stack>
        </Center>
      </Container>
    )
  }

  const isLoading = criteriaLoading || ideasLoading || scoresLoading
  const error = criteriaError ?? ideasError ?? scoresError
  const ideas: Idea[] = nominations ?? []
  const submittedIdeas = ideas.filter((idea) => ['submitted', 'in-progress', 'completed'].includes(idea.status))
  const criteriaReady = officialCriteria(criteria ?? [])

  return (
    <Container size={1380} py={{ base: 'md', md: 'xl' }} className="dp-page">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Group gap="xs" mb="md">
              <ActionIcon variant="subtle" aria-label="Back to award event" onClick={() => navigate(`/hackathons/${hackathonId}`)}>
                <IconArrowLeft size={18} />
              </ActionIcon>
              <Text className="dp-section-label" style={{ marginBottom: 0 }}>2026 Digital Pioneer · Committee</Text>
            </Group>
            <h1 className="dp-section-title">Committee scoring</h1>
            <Text className="dp-section-copy" mt="md">
              Review the nomination evidence, score both criteria with whole numbers, and record a recommendation. Totals use the official 70/30 weighting.
            </Text>
          </div>
          {canManageJudging ? <Tooltip label="Open committee ranking">
            <Button
              variant="light"
              color="grape"
              leftSection={<IconTrophy size={17} />}
              onClick={() => navigate(`/hackathons/${hackathonId}/leaderboard`)}
            >
              View ranking
            </Button>
          </Tooltip> : null}
        </Group>

        {!isAssignedJudge ? <Alert color="blue">You have manager access to review nominations. Assign yourself as a committee member in award settings to submit ratings.</Alert> : null}
        <Card className="dp-rules-panel" p="lg">
          <Grid align="center">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Group gap="sm"><IconScale size={20} /><Text fw={800}>Official weighting</Text></Group>
            </Grid.Col>
            {DIGITAL_PIONEER_RUBRIC.map((rubric) => (
              <Grid.Col span={{ base: 6, sm: 3 }} key={rubric.key}>
                <Text className="dp-track-code">{rubric.nameZh}</Text>
                <Text fw={800}>{rubric.name} · {rubric.weight}%</Text>
              </Grid.Col>
            ))}
            <Grid.Col span={{ base: 12, sm: 2 }}>
              <Badge color={criteriaReady ? 'teal' : 'orange'} variant="light">
                {criteriaReady ? 'Ready' : 'Check setup'}
              </Badge>
            </Grid.Col>
          </Grid>
        </Card>

        {isLoading ? (
          <Center py={80}><Stack align="center"><Loader /><Text c="dimmed">Loading nominations…</Text></Stack></Center>
        ) : null}
        {error ? <Alert color="red" icon={<IconAlertCircle size={18} />}>{error instanceof Error ? error.message : 'Unable to load evaluation data.'}</Alert> : null}
        {!isLoading && !error && !criteriaReady ? (
          <Alert color="orange" icon={<IconAlertCircle size={18} />}>
            Configure exactly two criteria totaling 100% before committee scoring: Behavior Demonstration 70% and Business Impact 30%.
          </Alert>
        ) : null}
        {!isLoading && !error && criteriaReady && submittedIdeas.length === 0 ? (
          <Center py={80}><Stack align="center"><Text fw={700}>No nominations are ready for review.</Text><Text c="dimmed">Submitted cases will appear here automatically.</Text></Stack></Center>
        ) : null}
        {!isLoading && !error && criteriaReady ? submittedIdeas.map((idea) => (
          <IdeaJudgingCard
            key={`${idea.id}-${ownScores.filter((score) => score.ideaId === idea.id).map((score) => `${score.id}:${score.score}:${score.comment}`).join()} `}
            savedScores={ownScores.filter((score) => score.ideaId === idea.id)}
            canSubmitRating={isAssignedJudge}
            idea={idea}
            criteria={criteria ?? []}
            alreadyScored={scoredIdeaIds.has(idea.id)}
            isSubmitting={submittingIdea === idea.id}
            onSubmit={(submission) => {
              setSubmittingIdea(idea.id)
              scoreIdeaMutation.mutate(submission)
            }}
          />
        )) : null}
      </Stack>
    </Container>
  )
}
