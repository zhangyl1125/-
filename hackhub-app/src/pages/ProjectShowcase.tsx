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
} from '@mantine/core'
import {
  IconTrophy,
  IconHeart,
  IconHeartFilled,
  IconBrandGithub,
  IconWorldWww,
  IconSearch,
  IconUsers,
  IconExternalLink,
  IconTool,
  IconUpload,
} from '@tabler/icons-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useRealtime } from '../hooks/useRealtime'
import { notifications } from '@mantine/notifications'
import { ApiError } from '../lib/apiClient'
import { HackathonService } from '../services/hackathonService'
import type { Hackathon } from '../services/hackathonService'
import { IdeaService } from '../services/ideaService'
import { ProfileService } from '../services/profileService'
import { StorageService } from '../services/storageService'
import { TeamService } from '../services/teamService'
import type { Team } from '../services/teamService'

interface Project {
  id: string
  title: string
  description: string
  team_name: string
  team_members: Array<{
    id: string
    name: string
    avatar?: string
    role?: string
  }>
  hackathon_id: string
  hackathon_name: string
  category: string
  technologies: string[]
  github_url?: string
  demo_url?: string
  video_url?: string
  images: string[]
  votes: number
  user_vote?: boolean
  prize_position?: number
  status: 'draft' | 'submitted' | 'in-progress' | 'completed'
  created_at: string
  submission_date: string
}

interface ProjectFilters {
  search: string
  category: string
  technology: string
  prizeOnly: boolean
}

interface ProjectUploadForm {
  hackathonId: string
  teamId: string
  teamName: string
  title: string
  description: string
  category: string
  technologies: string
  repositoryUrl: string
  demoUrl: string
}

const CREATE_TEAM_VALUE = '__create_team__'

const emptyUploadForm = (): ProjectUploadForm => ({
  hackathonId: '',
  teamId: '',
  teamName: '',
  title: '',
  description: '',
  category: '',
  technologies: '',
  repositoryUrl: '',
  demoUrl: '',
})

export function ProjectShowcase() {
  const { user } = useAuthStore()
  const { isConnected } = useRealtime()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [modalOpened, setModalOpened] = useState(false)
  const [uploadOpened, setUploadOpened] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [userTeams, setUserTeams] = useState<Team[]>([])
  const [projectImage, setProjectImage] = useState<File | null>(null)
  const [uploadForm, setUploadForm] = useState<ProjectUploadForm>(emptyUploadForm)
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    category: '',
    technology: '',
    prizeOnly: false,
  })

  const loadProjects = useCallback(async () => {
      setLoading(true)
      try {
        const loadedHackathons = (await HackathonService.getHackathons(0, 100)).content
        setHackathons(loadedHackathons)
        setUploadForm((current) => current.hackathonId || loadedHackathons.length === 0
          ? current
          : { ...current, hackathonId: loadedHackathons[0].id })

        const hackathonData = await Promise.all(loadedHackathons.map(async (hackathon) => {
          const [ideasPage, teams] = await Promise.all([
            IdeaService.getIdeas(hackathon.id, 0, 100),
            TeamService.getTeams(hackathon.id),
          ])

          const teamsWithMembers = await Promise.all(teams.map(async (team) => ({
            team,
            members: await TeamService.getTeamMembers(team.id).catch(() => []),
          })))
          const membersByTeam = new Map(teamsWithMembers.map(({ team, members }) => [team.id, members]))

          const projectList = await Promise.all(ideasPage.content.map(async (idea): Promise<Project> => {
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

            return {
              id: idea.id,
              title: idea.title,
              description: idea.description,
              team_name: team?.name ?? 'Individual',
              team_members: teamMembers,
              hackathon_id: hackathon.id,
              hackathon_name: hackathon.title,
              category: idea.category,
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

          return {
            projectList,
            userTeams: teamsWithMembers
              .filter(({ members }) => members.some((member) => member.userId === user?.id))
              .map(({ team }) => team),
          }
        }))
        setProjects(hackathonData.flatMap(({ projectList }) => projectList))
        setUserTeams(hackathonData.flatMap(({ userTeams: teams }) => teams))
      } catch (error) {
        console.error('Error loading projects:', error)
        notifications.show({
          title: 'Error',
          message: 'Failed to load projects',
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
  }, [user?.id])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const openUploadModal = () => {
    const hackathonId = uploadForm.hackathonId || hackathons[0]?.id || ''
    const firstTeam = userTeams.find((team) => team.hackathonId === hackathonId)
    setUploadForm((current) => ({
      ...current,
      hackathonId,
      teamId: current.teamId || firstTeam?.id || CREATE_TEAM_VALUE,
    }))
    setUploadOpened(true)
  }

  const handleProjectUpload = async () => {
    const creatingTeam = uploadForm.teamId === CREATE_TEAM_VALUE
    if (!uploadForm.hackathonId || !uploadForm.title.trim() || !uploadForm.description.trim()
      || !uploadForm.category.trim() || !projectImage
      || (creatingTeam ? !uploadForm.teamName.trim() : !uploadForm.teamId)) {
      notifications.show({
        title: 'Missing Information',
        message: 'Complete all required fields and select a project image',
        color: 'orange',
      })
      return
    }

    setUploading(true)
    try {
      const technologies = uploadForm.technologies
        .split(',')
        .map((technology) => technology.trim())
        .filter(Boolean)
      const team = creatingTeam
        ? await TeamService.createTeam({
            name: uploadForm.teamName.trim(),
            description: uploadForm.description.trim(),
            hackathonId: uploadForm.hackathonId,
            skills: technologies,
          })
        : userTeams.find((candidate) => candidate.id === uploadForm.teamId)

      if (!team) throw new Error('Please select a team')

      const uploadedImage = await StorageService.uploadFile(
        projectImage,
        'project-attachments',
        `projects/${team.id}`
      )
      const idea = await IdeaService.createIdea({
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim(),
        hackathonId: uploadForm.hackathonId,
        teamId: team.id,
        category: uploadForm.category.trim(),
        tags: technologies,
      })
      await IdeaService.updateIdea(idea.id, {
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim(),
        category: uploadForm.category.trim(),
        tags: technologies,
        status: 'submitted',
        repositoryUrl: uploadForm.repositoryUrl.trim() || null,
        demoUrl: uploadForm.demoUrl.trim() || null,
        projectAttachments: [{
          type: 'screenshot',
          url: uploadedImage.url,
          name: projectImage.name,
          storageKey: uploadedImage.key,
        }],
      })

      notifications.show({
        title: 'Project Uploaded',
        message: 'Your project is now visible in the showcase',
        color: 'green',
      })
      setUploadOpened(false)
      setProjectImage(null)
      setUploadForm(emptyUploadForm())
      await loadProjects()
    } catch (error) {
      notifications.show({
        title: 'Upload failed',
        message: error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Unable to upload project',
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
        message: 'Please log in to vote for projects',
        color: 'orange',
      })
      return
    }

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
        message: error instanceof ApiError ? error.message : 'Failed to record vote',
        color: 'red',
      })
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                           project.description.toLowerCase().includes(filters.search.toLowerCase()) ||
                           project.team_name.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesCategory = !filters.category || project.category === filters.category
      const matchesTechnology = !filters.technology || project.technologies.includes(filters.technology)
      const matchesPrize = !filters.prizeOnly || project.prize_position
      
      return matchesSearch && matchesCategory && matchesTechnology && matchesPrize
    })
  }, [projects, filters])

  const categories = useMemo(
    () => [...new Set(projects.map((project) => project.category).filter(Boolean))].sort(),
    [projects]
  )
  const technologies = useMemo(
    () => [...new Set(projects.flatMap((project) => project.technologies))].sort(),
    [projects]
  )

  const getPrizeIcon = (position?: number) => {
    if (!position) return null
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32'] // Gold, Silver, Bronze
    return (
      <ThemeIcon size="sm" variant="filled" style={{ backgroundColor: colors[position - 1] }}>
        <IconTrophy size={12} />
      </ThemeIcon>
    )
  }

  const openProjectModal = (project: Project) => {
    setSelectedProject(project)
    setModalOpened(true)
  }

  return (
    <Container size="xl" py="xl">
      {/* Check permissions first */}
      {!user ? (
        <Center py="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={80} variant="light" color="red">
              <IconTool style={{ width: 40, height: 40 }} />
            </ThemeIcon>
            <Title order={3}>Access Denied</Title>
            <Text c="dimmed" ta="center">
              You don't have permission to view projects. Please contact an administrator.
            </Text>
          </Stack>
        </Center>
      ) : (
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={1} mb="xs">
                Project Showcase
              </Title>
              <Text c="dimmed" size="lg">
                Discover amazing projects built during hackathons
              </Text>
            </div>
            <Group gap="md">
              <Button leftSection={<IconUpload size={16} />} onClick={openUploadModal}>
                Upload Project
              </Button>
              {/* Real-time connection indicator */}
              <Group gap="xs">
                <div 
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: isConnected ? '#51cf66' : '#fa5252',
                    marginTop: 8
                  }}
                />
                <Text size="xs" c="dimmed">
                  {isConnected ? 'Live' : 'Offline'}
                </Text>
              </Group>
            </Group>
          </Group>
        </div>

        {/* Filters */}
        <Card withBorder>
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                placeholder="Search projects..."
                leftSection={<IconSearch size={16} />}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                placeholder="Category"
                data={categories}
                value={filters.category}
                onChange={(value) => setFilters(prev => ({ ...prev, category: value || '' }))}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                placeholder="Technology"
                data={technologies}
                value={filters.technology}
                onChange={(value) => setFilters(prev => ({ ...prev, technology: value || '' }))}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Button
                variant={filters.prizeOnly ? 'filled' : 'light'}
                onClick={() => setFilters(prev => ({ ...prev, prizeOnly: !prev.prizeOnly }))}
                leftSection={<IconTrophy size={16} />}
                fullWidth
              >
                Winners Only
              </Button>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Projects Grid */}
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} withBorder h={400} p="lg">
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Text c="dimmed">Loading...</Text>
                </div>
              </Card>
            ))
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <Card key={project.id} withBorder p="lg" style={{ cursor: 'pointer' }} onClick={() => openProjectModal(project)}>
                <Stack gap="md">
                  {/* Project Header */}
                  <Group justify="space-between">
                    <Group>
                      <Title order={4} lineClamp={1}>{project.title}</Title>
                      {getPrizeIcon(project.prize_position)}
                    </Group>
                    <ActionIcon
                      variant={project.user_vote ? 'filled' : 'light'}
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVote(project.id)
                      }}
                    >
                      {project.user_vote ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
                    </ActionIcon>
                  </Group>

                  {project.images[0] ? (
                    <Image
                      src={project.images[0]}
                      alt={`${project.title} screenshot`}
                      h={160}
                      radius="md"
                      fit="cover"
                    />
                  ) : (
                    <div style={{ height: 160, backgroundColor: '#f8f9fa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Text c="dimmed" size="sm">Project Screenshot</Text>
                    </div>
                  )}

                  {/* Description */}
                  <Text size="sm" c="dimmed" lineClamp={3}>
                    {project.description}
                  </Text>

                  {/* Team & Hackathon */}
                  <div>
                    <Group gap="xs" mb="xs">
                      <IconUsers size={14} />
                      <Text size="sm" fw={500}>{project.team_name}</Text>
                    </Group>
                    <Text size="xs" c="dimmed">{project.hackathon_name}</Text>
                  </div>

                  {/* Technologies */}
                  <Group gap="xs">
                    {project.technologies.slice(0, 3).map((tech) => (
                      <Badge key={tech} size="xs" variant="light">
                        {tech}
                      </Badge>
                    ))}
                    {project.technologies.length > 3 && (
                      <Badge size="xs" variant="outline">
                        +{project.technologies.length - 3}
                      </Badge>
                    )}
                  </Group>

                  {/* Footer */}
                  <Group justify="space-between" mt="auto">
                    <Group gap="xs">
                      <IconHeart size={14} />
                      <Text size="sm">{project.votes}</Text>
                    </Group>
                    <Group gap="xs">
                      {project.github_url && (
                        <ActionIcon
                          component="a"
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="light"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
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
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconWorldWww size={14} />
                        </ActionIcon>
                      )}
                    </Group>
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
                  <Text c="dimmed">No projects found matching your filters</Text>
                  <Button leftSection={<IconUpload size={16} />} onClick={openUploadModal}>
                    Upload Project
                  </Button>
                </Stack>
              </Center>
            </div>
          )}
        </SimpleGrid>

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
                alt={`${selectedProject.title} screenshot`}
                h={300}
                radius="md"
                fit="contain"
              />
            ) : (
              <div style={{ height: 300, backgroundColor: '#f8f9fa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text c="dimmed">Project Screenshot/Demo</Text>
              </div>
            )}

            {/* Description */}
            <Text>{selectedProject.description}</Text>

            {/* Team Members */}
            <div>
              <Title order={5} mb="sm">Team Members</Title>
              <Group>
                {selectedProject.team_members.map((member) => (
                  <Group key={member.id} gap="xs">
                    <Avatar size="sm" />
                    <div>
                      <Text size="sm" fw={500}>{member.name}</Text>
                      {member.role && <Text size="xs" c="dimmed">{member.role}</Text>}
                    </div>
                  </Group>
                ))}
              </Group>
            </div>

            {/* Technologies */}
            <div>
              <Title order={5} mb="sm">Technologies Used</Title>
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
                  View Code
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
                  Live Demo
                </Button>
              )}
            </Group>

            {/* Vote Button */}
            <Button
              fullWidth
              leftSection={selectedProject.user_vote ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
              variant={selectedProject.user_vote ? 'filled' : 'light'}
              color="red"
              onClick={() => handleVote(selectedProject.id)}
            >
              {selectedProject.user_vote ? 'Voted' : 'Vote'} ({selectedProject.votes})
            </Button>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={uploadOpened}
        onClose={() => !uploading && setUploadOpened(false)}
        title="Upload a Project"
        size="lg"
        closeOnClickOutside={!uploading}
        closeOnEscape={!uploading}
      >
        <Stack gap="md">
          {hackathons.length === 0 ? (
            <Alert color="orange">No hackathons are currently available for project uploads.</Alert>
          ) : (
            <>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Select
                  label="Hackathon"
                  required
                  data={hackathons.map((hackathon) => ({ value: hackathon.id, label: hackathon.title }))}
                  value={uploadForm.hackathonId}
                  onChange={(hackathonId) => {
                    const nextHackathonId = hackathonId ?? ''
                    const firstTeam = userTeams.find((team) => team.hackathonId === nextHackathonId)
                    setUploadForm((current) => ({
                      ...current,
                      hackathonId: nextHackathonId,
                      teamId: firstTeam?.id || CREATE_TEAM_VALUE,
                    }))
                  }}
                />
                <Select
                  label="Team"
                  required
                  data={[
                    ...userTeams
                      .filter((team) => team.hackathonId === uploadForm.hackathonId)
                      .map((team) => ({ value: team.id, label: team.name })),
                    { value: CREATE_TEAM_VALUE, label: 'Create a new team' },
                  ]}
                  value={uploadForm.teamId}
                  onChange={(teamId) => setUploadForm((current) => ({ ...current, teamId: teamId ?? '' }))}
                />
              </SimpleGrid>

              {uploadForm.teamId === CREATE_TEAM_VALUE && (
                <TextInput
                  label="New Team Name"
                  required
                  value={uploadForm.teamName}
                  onChange={(event) => setUploadForm((current) => ({ ...current, teamName: event.target.value }))}
                />
              )}

              <TextInput
                label="Project Title"
                required
                value={uploadForm.title}
                onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))}
              />
              <Textarea
                label="Project Description"
                required
                minRows={3}
                value={uploadForm.description}
                onChange={(event) => setUploadForm((current) => ({ ...current, description: event.target.value }))}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Category"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={uploadForm.category}
                  onChange={(event) => setUploadForm((current) => ({ ...current, category: event.target.value }))}
                />
                <TextInput
                  label="Technologies"
                  placeholder="React, Python, PostgreSQL"
                  value={uploadForm.technologies}
                  onChange={(event) => setUploadForm((current) => ({ ...current, technologies: event.target.value }))}
                />
              </SimpleGrid>
              <FileInput
                label="Project Image"
                description="PNG, JPG, GIF, WebP or SVG"
                required
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                leftSection={<IconUpload size={16} />}
                value={projectImage}
                onChange={setProjectImage}
                clearable
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Repository URL"
                  placeholder="https://github.com/..."
                  value={uploadForm.repositoryUrl}
                  onChange={(event) => setUploadForm((current) => ({ ...current, repositoryUrl: event.target.value }))}
                />
                <TextInput
                  label="Demo URL"
                  placeholder="https://..."
                  value={uploadForm.demoUrl}
                  onChange={(event) => setUploadForm((current) => ({ ...current, demoUrl: event.target.value }))}
                />
              </SimpleGrid>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setUploadOpened(false)} disabled={uploading}>
                  Cancel
                </Button>
                <Button leftSection={<IconUpload size={16} />} onClick={handleProjectUpload} loading={uploading}>
                  Upload Project
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
      </Stack>
      )}
    </Container>
  )
}
