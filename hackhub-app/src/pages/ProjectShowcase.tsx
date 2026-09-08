import {
  Container,
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Button,
  Grid,
  ActionIcon,
  Avatar,
  ThemeIcon,
  Select,
  TextInput,
  SimpleGrid,
  Modal,
  Center,
  Alert,
  Image,
  FileInput,
  Textarea,
  UnstyledButton,
} from '@mantine/core'
import {
  IconTrophy,
  IconHeart,
  IconHeartFilled,
  IconBrandGithub,
  IconWorldWww,
  IconSearch,
  IconUser,
  IconExternalLink,
  IconTool,
  IconUpload,
  IconGavel,
  IconArrowRight,
  IconInfoCircle,
  IconPhoto,
  IconCheck,
} from '@tabler/icons-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { notifications } from '@mantine/notifications'
import { getAllPages } from '../services/pagination'
import { api, ApiError } from '../lib/apiClient'
import { HackathonService } from '../services/hackathonService'
import type { Hackathon } from '../services/hackathonService'
import { IdeaService } from '../services/ideaService'
import { OrganizationService } from '../services/organizationService'
import { ProfileService } from '../services/profileService'
import { StorageService } from '../services/storageService'
import { TeamService } from '../services/teamService'
import { JudgingService } from '../services/judgingService'
import {
  DIGITAL_PIONEER_TRACKS,
  normalizeDigitalPioneerTrack,
} from '../config/digitalPioneer'
import { AwardLens } from '../components/DigitalPioneer/AwardLens'
import { NominationComments } from '../components/DigitalPioneer/NominationComments'
import './DigitalPioneer.css'

interface Project {
  id: string
  title: string
  description: string
  nominee_name: string
  nominee_org_code: string
  team_members: Array<{
    id: string
    name: string
    avatar?: string
    role?: string
  }>
  hackathon_id: string
  category: string
  technologies: string[]
  github_url?: string
  demo_url?: string
  video_url?: string
  images: string[]
  votes: number
  user_vote?: boolean
  status: 'draft' | 'submitted' | 'in-progress' | 'completed'
  created_at: string
  submission_date: string
}

interface ProjectFilters {
  search: string
  category: string
  technology: string
}

interface ProjectUploadForm {
  hackathonId: string
  nomineeUserId: string
  executiveSummary: string
  achievementImpact: string
  cultureDemonstration: string
  category: string
  technologies: string
}

const emptyUploadForm = (): ProjectUploadForm => ({
  hackathonId: '',
  nomineeUserId: '',
  executiveSummary: '',
  achievementImpact: '',
  cultureDemonstration: '',
  category: '',
  technologies: '',
})

export function ProjectShowcase({ nominationMode = false }: { nominationMode?: boolean }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmClearVotes, setConfirmClearVotes] = useState(false)
  const [clearingVotes, setClearingVotes] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [modalOpened, setModalOpened] = useState(false)
  const [nominees, setNominees] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [nomineeLoadError, setNomineeLoadError] = useState(false)
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [projectImage, setProjectImage] = useState<File | null>(null)
  const [uploadForm, setUploadForm] = useState<ProjectUploadForm>(emptyUploadForm)
  const [assignedJudgeHackathons, setAssignedJudgeHackathons] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    category: '',
    technology: '',
  })

  const loadProjects = useCallback(async () => {
      setLoading(true)
      try {
        const loadedHackathons = await getAllPages((page) => HackathonService.getHackathons(page, 100))
        setHackathons(loadedHackathons)
        const currentAward = loadedHackathons.find((award) => award.status === 'running') ?? loadedHackathons[0]
        setUploadForm((current) => current.hackathonId || loadedHackathons.length === 0
          ? current
          : { ...current, hackathonId: currentAward.id })

        const hackathonData = await Promise.all(loadedHackathons.map(async (hackathon) => {
          const [ideasPage, teams] = await Promise.all([
            getAllPages((page) => IdeaService.getIdeas(hackathon.id, page, 100)),
            TeamService.getTeams(hackathon.id),
          ])

          const teamsWithMembers = await Promise.all(teams.map(async (team) => ({
            team,
            members: await TeamService.getTeamMembers(team.id).catch(() => []),
          })))
          const membersByTeam = new Map(teamsWithMembers.map(({ team, members }) => [team.id, members]))

          const projectList = await Promise.all(ideasPage.map(async (idea): Promise<Project> => {
            const team = teams.find((candidate) => candidate.id === idea.teamId)
            const members = team ? membersByTeam.get(team.id) ?? [] : []
            const teamMembers = await Promise.all(members.map(async (member) => {
              const profile = await ProfileService.getProfile(member.userId).catch(() => null)
              return {
                id: member.userId,
                name: profile?.name ?? member.userId,
                avatar: profile?.avatarUrl ?? undefined,
                role: member.role,
              }
            }))
            const screenshots = (idea.projectAttachments ?? [])
              .filter((attachment) => attachment.type === 'screenshot')
            const images = await Promise.all(screenshots.map(async (attachment) => {
              if (!attachment.storageKey) return attachment.url
              return StorageService.getPresignedUrl('project-attachments', attachment.storageKey)
                .catch(() => attachment.url)
            }))

            const creatorProfile = teamMembers.length > 0
              ? null
              : await ProfileService.getProfile(idea.createdBy).catch(() => null)

            return {
              id: idea.id,
              title: idea.title,
              description: idea.description,
              nominee_org_code: idea.projectAttachments?.find((attachment) => attachment.type === 'nomination')?.nomineeOrgCode ?? '',
              nominee_name: idea.projectAttachments?.find((attachment) => attachment.type === 'nomination')?.name ?? teamMembers[0]?.name ?? creatorProfile?.name ?? team?.name ?? 'Individual Nominee',
              team_members: teamMembers,
              hackathon_id: hackathon.id,
              category: normalizeDigitalPioneerTrack(idea.category, idea.tags ?? []),
              technologies: idea.tags ?? [],
              github_url: idea.repositoryUrl ?? undefined,
              demo_url: idea.demoUrl ?? undefined,
              images: [...images, ...(idea.attachments ?? [])].filter(Boolean),
              votes: idea.votes ?? 0,
              user_vote: idea.userHasVoted ?? false,
              status: idea.status,
              created_at: idea.createdAt,
              submission_date: idea.updatedAt,
            }
          }))

          return { projectList }
        }))
        setProjects(hackathonData.flatMap(({ projectList }) => projectList))
      } catch (error) {
        console.error('Error loading projects:', error)
        notifications.show({
          title: 'Unable to load nominations',
          message: 'Refresh the page to try again.',
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (!nominationMode || !user || user.role === 'participant') return
    let cancelled = false
    const loadNominees = async () => {
      try {
        const candidates = user.role === 'admin'
          ? await getAllPages((page) => api.get<{ content: Array<{ id: string; name: string; email: string }>; totalPages?: number }>(`/api/v1/admin/users?page=${page}&size=200&sort=name,asc`))
          : (await Promise.all((await OrganizationService.getMyOrganizations()).map(async (org) =>
              (await OrganizationService.getMembers(org.id)).map((member) => ({
                id: member.userId, name: member.name ?? member.email ?? member.userId, email: member.email ?? '',
              }))
            ))).flat()
        if (!cancelled) setNominees([...new Map([{ id: user.id, name: user.name, email: user.email }, ...candidates].map((candidate) => [candidate.id, candidate])).values()])
      } catch {
        if (!cancelled) setNomineeLoadError(true)
      }
    }
    void loadNominees()
    return () => { cancelled = true }
  }, [nominationMode, user])

  const handleProjectUpload = async () => {
    if (!user || uploading) return
    if (!uploadForm.hackathonId || !uploadForm.executiveSummary.trim()
      || !uploadForm.achievementImpact.trim() || !uploadForm.cultureDemonstration.trim()
      || !uploadForm.category.trim() || !projectImage) {
      notifications.show({
        title: 'Missing Information',
        message: 'Complete all required fields and select a nominee photo.',
        color: 'orange',
      })
      return
    }

    const nomineeUserId = uploadForm.nomineeUserId || user!.id
    const nomineeName = nominees.find((candidate) => candidate.id === nomineeUserId)?.name ?? user!.name
    setUploading(true)
    try {
      const technologies = uploadForm.technologies
        .split(',')
        .map((technology) => technology.trim())
        .filter(Boolean)
      const description = [
        `Executive Summary\n${uploadForm.executiveSummary.trim()}`,
        `Details of Core Achievement and Business Impact (Including Financial Figures)\n${uploadForm.achievementImpact.trim()}`,
        `How You Demonstrate Bosch China Culture (Especially in Your Applied Category)\n${uploadForm.cultureDemonstration.trim()}`,
      ].join('\n\n')
      const personalTeamName = `${user?.name ?? 'Digital Pioneer'} nomination`
      // Ideas still accept a teamId in the existing API. For this individual award,
      // the team record is only a compatibility container and is never exposed in the UI.
      const team = await TeamService.getOrCreateNominationTeam({
            name: personalTeamName,
            description,
            hackathonId: uploadForm.hackathonId,
            skills: technologies,
          }, user.id)

      const uploadedImage = await StorageService.uploadFile(
        projectImage,
        'project-attachments',
        `projects/${team.id}`
      )
      await IdeaService.createIdea({
        title: nomineeName,
        description,
        hackathonId: uploadForm.hackathonId,
        teamId: team.id,
        category: uploadForm.category.trim(),
        tags: technologies,
        status: 'submitted',
        projectAttachments: [{
          type: 'nomination',
          url: '',
          name: nomineeName,
          nomineeUserId,
        }, {
          type: 'screenshot',
          url: uploadedImage.url,
          name: projectImage.name,
          storageKey: uploadedImage.key,
        }],
      })

      notifications.show({
        title: 'Nomination submitted',
        message: 'The nomination is now available for review.',
        color: 'green',
      })
      setProjectImage(null)
      setUploadForm(emptyUploadForm())
      await loadProjects()
    } catch (error) {
      notifications.show({
        title: 'Submission failed',
        message: error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Unable to submit the nomination',
        color: 'red',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleVote = async (projectId: string) => {
    if (!user) {
      notifications.show({
        title: 'Login Required',
        message: 'Please log in to vote for a nominee.',
        color: 'orange',
      })
      return
    }

    if (votingIds.has(projectId)) return
    setVotingIds((current) => new Set(current).add(projectId))
    try {
      const result = await IdeaService.voteIdea(projectId)
      setProjects(prev => prev.map(project => {
        if (project.id === projectId) {
          return {
            ...project,
            user_vote: result.voted,
            votes: result.voteCount,
          }
        }
        return project
      }))
      setSelectedProject((project) => project?.id === projectId
        ? { ...project, user_vote: result.voted, votes: result.voteCount }
        : project)

      notifications.show({
        title: result.voted ? 'Vote Recorded' : 'Vote Removed',
        message: result.voted ? 'Thank you for your vote!' : 'Your vote has been removed',
        color: 'green',
      })
    } catch (error) {
      console.error('Error voting:', error)
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to record vote',
        color: 'red',
      })
    } finally {
      setVotingIds((current) => { const next = new Set(current); next.delete(projectId); return next })
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                           project.description.toLowerCase().includes(filters.search.toLowerCase()) ||
                           project.nominee_name.toLowerCase().includes(filters.search.toLowerCase()) ||
                           project.nominee_org_code.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesCategory = !filters.category || project.category === filters.category
      const matchesTechnology = !filters.technology || project.technologies.includes(filters.technology)
      
      return matchesSearch && matchesCategory && matchesTechnology
    })
  }, [projects, filters])

  const technologies = useMemo(
    () => [...new Set(projects.flatMap((project) => project.technologies))].sort(),
    [projects]
  )
  const selectedNominationTrack = DIGITAL_PIONEER_TRACKS.find(
    (track) => track.value === uploadForm.category
  )

  const clearTrackVotes = async () => {
    if (!selectedProject || clearingVotes) return
    setClearingVotes(true)
    try {
      await IdeaService.clearTrackVotes(selectedProject.hackathon_id, selectedProject.category)
      await loadProjects()
      setModalOpened(false)
      setConfirmClearVotes(false)
      notifications.show({ title: 'Votes reset', message: 'You can now select nominees again.', color: 'teal' })
    } catch {
      notifications.show({ title: 'Error', message: 'Unable to save changes. Please try again.', color: 'red' })
    } finally { setClearingVotes(false) }
  }

  const openProjectModal = (project: Project) => {
    setConfirmClearVotes(false)
    setSelectedProject(project)
    setModalOpened(true)
    if (user?.role === 'participant' && !assignedJudgeHackathons.has(project.hackathon_id)) {
      void JudgingService.getJudges(project.hackathon_id).then((judges) => {
        if (judges.some((judge) => judge.userId === user.id)) {
          setAssignedJudgeHackathons((current) => new Set(current).add(project.hackathon_id))
        }
      }).catch(() => undefined)
    }
  }

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Center py="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={80} variant="light" color="red">
              <IconTool style={{ width: 40, height: 40 }} />
            </ThemeIcon>
            <Title order={3}>Access Denied</Title>
            <Text c="dimmed" ta="center">
              You don&apos;t have permission to view nominations. Please contact an administrator.
            </Text>
          </Stack>
        </Center>
      </Container>
    )
  }

  if (nominationMode) {
    return (
      <Container size={1240} py={{ base: 'md', md: 'xl' }} className="dp-page">
        <section className="dp-hero dp-nomination-hero" aria-labelledby="nomination-title">
          <Grid className="dp-hero__content" align="center">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <h1 id="nomination-title" className="dp-section-title" style={{ marginTop: 18 }}>
                Nominate a Digital Pioneer.
              </h1>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <AwardLens compact />
            </Grid.Col>
          </Grid>
        </section>

        <section className="dp-nomination-flow" aria-labelledby="track-choice-title">
          <div className="dp-flow-heading">
            <div>
              <Title id="track-choice-title" order={2}>Choose an award category</Title>
            </div>
          </div>

          <div className="dp-nomination-tracks" role="radiogroup" aria-label="Nomination track">
            {DIGITAL_PIONEER_TRACKS.map((track) => {
              const isSelected = track.value === uploadForm.category
              return (
                <UnstyledButton
                  key={track.value}
                  className="dp-nomination-track"
                  data-active={isSelected}
                  role="radio"
                  aria-checked={isSelected}
                  aria-controls="nomination-form"
                  aria-expanded={isSelected}
                  onClick={() => setUploadForm((current) => ({ ...current, category: track.value }))}
                >
                  <span className="dp-nomination-track__topline">
                    <span className="dp-nomination-track__code">{track.shorthand}</span>
                    <span className="dp-nomination-track__check" aria-hidden="true">
                      {isSelected ? <IconCheck size={15} stroke={2.4} /> : null}
                    </span>
                  </span>
                  <span className="dp-nomination-track__name">{track.label}</span>
                  <span className="dp-nomination-track__description">{track.description}</span>
                </UnstyledButton>
              )
            })}
          </div>

          {!selectedNominationTrack ? (
            <div className="dp-track-gate" role="status">
              <Text fw={650}>Choose a track to begin</Text>
            </div>
          ) : loading ? (
            <div className="dp-track-gate" role="status">
              <Text fw={650}>Preparing the nomination form…</Text>
            </div>
          ) : hackathons.length === 0 ? (
            <Alert color="orange" icon={<IconInfoCircle size={18} />} mt="lg">
              No nomination window is currently open.
            </Alert>
          ) : (
            <Card className="dp-form-shell" p={{ base: 'lg', md: 38 }}>
              <Stack gap={0} id="nomination-form">
                  <Group className="dp-form-intro" justify="space-between" align="center" wrap="wrap">
                    <div>
                      <Title order={3}>{selectedNominationTrack.label}</Title>
                    </div>
                    <Badge className="dp-selected-track" variant="light">
                      <span>{selectedNominationTrack.shorthand}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Selected</span>
                    </Badge>
                  </Group>
                  <div className="dp-fieldset" style={{ borderTop: 0, paddingTop: 0 }}>
                    <Grid gutter="md">
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        {user.role === 'participant' ? (
                          <TextInput label="Nominee name" value={user.name} readOnly />
                        ) : (
                          <Select
                            label="Nominee name"
                            searchable
                            required
                            data={nominees.length ? nominees.map((candidate) => ({ value: candidate.id, label: `${candidate.name} (${candidate.email})` })) : [{ value: user.id, label: user.name }]}
                            value={uploadForm.nomineeUserId || user.id}
                            onChange={(value) => setUploadForm((current) => ({ ...current, nomineeUserId: value ?? user.id }))}
                          />
                        )}
                        {nomineeLoadError && <Text size="sm" c="red" role="alert">Unable to load associates. Refresh to retry; self-nomination is still available.</Text>}
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <FileInput
                          label="Photo"
                          required
                          accept="image/jpeg,image/png,image/webp"
                          leftSection={<IconPhoto size={16} />}
                          value={projectImage}
                          onChange={setProjectImage}
                          clearable
                        />
                      </Grid.Col>
                      <Grid.Col span={12}>
                        <TextInput label="Application category" value={selectedNominationTrack.label} readOnly />
                      </Grid.Col>
                    </Grid>
                  </div>

                  <div className="dp-fieldset">
                    <div className="dp-nomination-question">
                      <div style={{ minWidth: 0 }}>
                        <Textarea
                          label={<><span className="dp-question-number" aria-hidden="true">01</span><span>Executive summary (the elevator pitch)</span></>}
                          required
                          minRows={4}
                          maxLength={1200}
                          placeholder="In 3–5 sentences, summarize your key contributions over the past year and explain why you represent the spirit of a Digital Pioneer."
                          value={uploadForm.executiveSummary}
                          onChange={(event) => setUploadForm((current) => ({ ...current, executiveSummary: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="dp-fieldset">
                    <div className="dp-nomination-question">
                      <div style={{ minWidth: 0 }}>
                        <Textarea
                          label={<><span className="dp-question-number" aria-hidden="true">02</span><span>Details of core achievement and business impact (including financial figures)</span></>}
                          required
                          minRows={4}
                          maxLength={2400}
                          value={uploadForm.achievementImpact}
                          onChange={(event) => setUploadForm((current) => ({ ...current, achievementImpact: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="dp-fieldset">
                    <div className="dp-nomination-question">
                      <div style={{ minWidth: 0 }}>
                        <Textarea
                          label={<><span className="dp-question-number" aria-hidden="true">03</span><span>How you demonstrate Bosch China culture (especially in your applied category)?</span></>}
                          required
                          minRows={4}
                          maxLength={2000}
                          value={uploadForm.cultureDemonstration}
                          onChange={(event) => setUploadForm((current) => ({ ...current, cultureDemonstration: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="dp-fieldset">
                    <div className="dp-nomination-question">
                      <div style={{ minWidth: 0 }}>
                        <TextInput
                          label={<><span className="dp-question-number" aria-hidden="true">04</span><span>Tags you want to add</span></>}
                          value={uploadForm.technologies}
                          onChange={(event) => setUploadForm((current) => ({ ...current, technologies: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <Group justify="flex-end" align="center" pt="lg">
                    <Button
                      className="dp-primary-button"
                      rightSection={<IconArrowRight size={17} />}
                      onClick={() => void handleProjectUpload()}
                      loading={uploading}
                    >
                      Submit nomination
                    </Button>
                  </Group>
                </Stack>
            </Card>
          )}
        </section>
      </Container>
    )
  }

  return (
    <Container size={1240} py={{ base: 'sm', md: 'lg' }} className="dp-page">
      {/* Check permissions first */}
      {!user ? (
        <Center py="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={80} variant="light" color="red">
              <IconTool style={{ width: 40, height: 40 }} />
            </ThemeIcon>
            <Title order={3}>Access Denied</Title>
            <Text c="dimmed" ta="center">
              You don't have permission to view nominations. Please contact an administrator.
            </Text>
          </Stack>
        </Center>
      ) : (
      <Stack gap="lg">
        <div className="dp-selection-header">
          <Group justify="space-between" align="center">
            <div>
              <h1 className="dp-section-title dp-selection-title">Meet this year&apos;s nominees</h1>
            </div>
            <Button
              leftSection={<IconUpload size={16} />}
              onClick={() => navigate('/nominate')}
              className="dp-primary-button"
            >
              New nomination
            </Button>
          </Group>
        </div>

        <div className="dp-category-tabs" role="group" aria-label="Filter by award category">
          <UnstyledButton
            className="dp-category-tab"
            data-active={filters.category === ''}
            aria-pressed={filters.category === ''}
            onClick={() => setFilters((current) => ({ ...current, category: '' }))}
          >
            <span>All nominees</span>
            <span className="dp-category-tab__count">{projects.length}</span>
          </UnstyledButton>
          {DIGITAL_PIONEER_TRACKS.map((track) => (
            <UnstyledButton
              key={track.value}
              className="dp-category-tab"
              data-active={filters.category === track.value}
              aria-pressed={filters.category === track.value}
              onClick={() => setFilters((current) => ({ ...current, category: track.value }))}
            >
              <span>{track.label}</span>
              <span className="dp-category-tab__count">
                {projects.filter((project) => project.category === track.value).length}
              </span>
            </UnstyledButton>
          ))}
        </div>

        {!nominationMode && (
        <>
        <Card className="dp-filter-shell" p="sm">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                placeholder="Search nominee or contribution"
                leftSection={<IconSearch size={16} />}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <Select
                placeholder="Filter by tag"
                data={technologies}
                value={filters.technology}
                onChange={(value) => setFilters(prev => ({ ...prev, technology: value || '' }))}
                clearable
              />
          </SimpleGrid>
        </Card>

        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="dp-project-card" h={330} p="lg">
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Text c="dimmed">Loading nominations…</Text>
                </div>
              </Card>
            ))
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="dp-project-card"
                data-voted={project.user_vote ? 'true' : undefined}
                p="md"
              >
                <Stack gap="sm" h="100%">
                  <div className="dp-card-visual">
                    {project.images[0] ? (
                      <Image
                        src={project.images[0]}
                        alt={`${project.nominee_name} nomination`}
                        h={148}
                        radius="lg"
                        fit="cover"
                      />
                    ) : (
                      <div className="dp-nominee-placeholder">
                        <IconUser size={24} />
                        <Text c="dimmed" size="sm">Nominee photo</Text>
                      </div>
                    )}
                    {project.user_vote ? (
                      <div className="dp-vote-stamp" role="status">
                        <IconHeartFilled size={14} />
                        <span>Voted</span>
                      </div>
                    ) : null}
                  </div>

                  <Badge variant="outline" w="fit-content">{project.category}</Badge>
                  <div>
                    <Title order={4} lineClamp={1}>{project.title}</Title>
                    <Group gap={6} mt={5}>
                      <IconUser size={13} />
                      <Text size="sm" fw={550} translate="no">{project.nominee_name}</Text>
                    </Group>
                    <Text size="sm" c="dimmed" mt={4}><span>Department</span>: <span translate="no">{project.nominee_org_code.split('-')[0] || '—'}</span></Text>
                  </div>
                  <Text size="sm" c="dimmed" lineClamp={2}>{project.description}</Text>

                  <Group gap={6}>
                    {project.technologies.slice(0, 2).map((tech) => (
                      <Badge key={tech} size="sm" variant="light">
                        {tech}
                      </Badge>
                    ))}
                    {project.technologies.length > 2 && (
                      <Badge size="sm" variant="outline">
                        +{project.technologies.length - 2}
                      </Badge>
                    )}
                  </Group>

                  <Group justify="space-between" align="center" mt="auto" wrap="nowrap">
                    <Group gap={6}>
                      <Button size="compact-sm" variant="subtle" onClick={() => openProjectModal(project)}>
                        Details & comments
                      </Button>
                      {project.github_url && (
                        <ActionIcon
                          component="a"
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="light"
                          size="sm"
                          aria-label="Open evidence"
                        >
                          <IconBrandGithub size={14} />
                        </ActionIcon>
                      )}
                      {project.demo_url && (
                        <ActionIcon
                          component="a"
                          href={project.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="light"
                          size="sm"
                          aria-label="Open additional evidence"
                        >
                          <IconWorldWww size={14} />
                        </ActionIcon>
                      )}
                    </Group>
                    <Button
                      className="dp-vote-button"
                      loading={votingIds.has(project.id)}
                      data-voted={project.user_vote ? 'true' : 'false'}
                      variant={project.user_vote ? 'filled' : 'default'}
                      leftSection={project.user_vote ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
                      aria-label={project.user_vote ? `Voted, ${project.votes} votes` : `Vote, ${project.votes} votes`}
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleVote(project.id)
                      }}
                    >
                      {project.user_vote ? 'Voted' : 'Vote'} ({project.votes})
                    </Button>
                  </Group>
                </Stack>
              </Card>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1' }}>
              <Center py="xl">
                <Stack align="center">
                  <ThemeIcon size={60} variant="light" color="gray">
                    <IconTrophy size={30} />
                  </ThemeIcon>
                  <Text c="dimmed">No nominations match these filters.</Text>
                  <Button leftSection={<IconUpload size={16} />} onClick={() => navigate('/nominate')}>
                    New nomination
                  </Button>
                </Stack>
              </Center>
            </div>
          )}
        </SimpleGrid>
        </>
        )}

        {/* Project Detail Modal */}
        <Modal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          title={selectedProject?.title}
          size="xl"
        >
        {selectedProject && (
          <Stack gap="md">
            {selectedProject.images[0] ? (
              <Image
                src={selectedProject.images[0]}
                alt={`${selectedProject.nominee_name} nomination`}
                h={300}
                radius="md"
                fit="contain"
              />
            ) : (
              <div style={{ height: 300, backgroundColor: '#f8f9fa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text c="dimmed">Nominee photo</Text>
              </div>
            )}

            {/* Description */}
            <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedProject.description}</Text>
            <Badge variant="light" w="fit-content">{selectedProject.category}</Badge>

            {/* Individual nominee */}
            <div>
              <Title order={5} mb="sm">Nominee</Title>
              <Group>
                {([{ id: selectedProject.id, name: selectedProject.nominee_name, role: undefined }]).map((member) => (
                  <Group key={member.id} gap="xs">
                    <Avatar size="sm" />
                    <div>
                      <Text size="sm" fw={500} translate="no">{member.name}</Text>
                      <Text size="sm" c="dimmed"><span>Department</span>: <span translate="no">{selectedProject.nominee_org_code.split('-')[0] || '—'}</span></Text>
                      <Text size="sm" c="dimmed"><span>Org. code</span>: <span translate="no">{selectedProject.nominee_org_code || '—'}</span></Text>
                      {member.role && <Text size="sm" c="dimmed">{member.role}</Text>}
                    </div>
                  </Group>
                ))}
              </Group>
            </div>

            <div>
              <Title order={5} mb="sm">Tags</Title>
              <Group>
                {selectedProject.technologies.map((tech) => (
                  <Badge key={tech} variant="light">
                    {tech}
                  </Badge>
                ))}
              </Group>
            </div>

            {/* Links */}
            <Group>
              {selectedProject.github_url && (
                <Button
                  component="a"
                  href={selectedProject.github_url}
                  target="_blank"
                  leftSection={<IconBrandGithub size={16} />}
                  variant="light"
                >
                  View Evidence
                </Button>
              )}
              {selectedProject.demo_url && (
                <Button
                  component="a"
                  href={selectedProject.demo_url}
                  target="_blank"
                  leftSection={<IconExternalLink size={16} />}
                  variant="light"
                >
                  Additional evidence
                </Button>
              )}
              {(user.role === 'admin' || user.role === 'manager'
                || assignedJudgeHackathons.has(selectedProject.hackathon_id)) && (
                <Button
                  leftSection={<IconGavel size={16} />}
                  variant="light"
                  color="grape"
                  onClick={() => navigate(`/hackathons/${selectedProject.hackathon_id}/judge`)}
                >
                  Committee scoring
                </Button>
              )}
            </Group>

            {/* Vote Button */}
            <Button
              fullWidth
              loading={votingIds.has(selectedProject.id)}
              leftSection={selectedProject.user_vote ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
              variant={selectedProject.user_vote ? 'filled' : 'light'}
              color="red"
              onClick={() => handleVote(selectedProject.id)}
            >
              {selectedProject.user_vote ? 'Voted' : 'Vote'} ({selectedProject.votes})
            </Button>

            {confirmClearVotes ? (
              <Stack gap="xs">
                <Text size="sm">Reset all your votes in this track?</Text>
                <Group justify="flex-end">
                  <Button variant="subtle" disabled={clearingVotes} onClick={() => setConfirmClearVotes(false)}>Cancel</Button>
                  <Button color="red" loading={clearingVotes} onClick={() => void clearTrackVotes()}>Reset votes</Button>
                </Group>
              </Stack>
            ) : <Button variant="subtle" color="gray" onClick={() => setConfirmClearVotes(true)}>Reset my track votes</Button>}

            <NominationComments key={selectedProject.id} ideaId={selectedProject.id} userId={user.id} isAdmin={user.role === 'admin'} />
          </Stack>
        )}
      </Modal>

      </Stack>
      )}
    </Container>
  )
}
