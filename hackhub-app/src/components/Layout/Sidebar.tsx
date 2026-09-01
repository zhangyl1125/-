import { NavLink, Stack, Text, ThemeIcon, Group, Badge } from '@mantine/core'
import {
  IconDashboard,
  IconTrophy,
  IconUsers,
  IconUser,
  IconPlus,
  IconPresentation,
  IconShield,
  IconBuilding,
} from '@tabler/icons-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useHackathonStore } from '../../store/hackathonStore'
import { PermissionService } from '../../utils/permissions'
import { useLanguage } from '../../contexts/LanguageContext'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { hackathons } = useHackathonStore()
  const { t } = useLanguage()

  const navigationItems = [
    { label: t('sidebar.dashboard'), icon: IconDashboard, path: '/', description: t('sidebar.dashboardDescription') },
    { label: t('sidebar.organizations'), icon: IconBuilding, path: '/organizations', description: t('sidebar.organizationsDescription') },
    { label: t('sidebar.hackathons'), icon: IconTrophy, path: '/hackathons', description: t('sidebar.hackathonsDescription') },
    { label: t('sidebar.teams'), icon: IconUsers, path: '/teams', description: t('sidebar.teamsDescription') },
    { label: t('sidebar.projects'), icon: IconPresentation, path: '/projects', description: t('sidebar.projectsDescription') },
    { label: t('sidebar.profile'), icon: IconUser, path: '/profile', description: t('sidebar.profileDescription') },
  ]

  const isManager = user?.role === 'manager'
  const isAdmin = user && PermissionService.canManageUsers(user)
  const activeHackathons = hackathons.filter(h => h.status === 'running').length

  return (
    <Stack gap="xs">
      <Text size="xs" fw={500} c="dimmed" tt="uppercase" mb="sm">
        {t('sidebar.navigation')}
      </Text>

      {navigationItems.map((item) => (
        <NavLink
          key={item.path}
          label={
            <Group justify="space-between" w="100%">
              <Text size="sm">{item.label}</Text>
              {item.path === '/hackathons' && activeHackathons > 0 && (
                <Badge size="xs" variant="light" color="green">
                  {activeHackathons}
                </Badge>
              )}
            </Group>
          }
          description={item.description}
          leftSection={
            <ThemeIcon variant="light" size="sm">
              <item.icon size={16} />
            </ThemeIcon>
          }
          active={location.pathname === item.path}
          onClick={() => navigate(item.path)}
          variant="subtle"
        />
      ))}

      {(isAdmin || isManager) && (
        <>
          <Text size="xs" fw={500} c="dimmed" tt="uppercase" mt="lg" mb="sm">
            {isAdmin ? t('sidebar.adminPanel') : t('sidebar.management')}
          </Text>
          
          {isManager && !isAdmin && (
            <NavLink
              label={t('sidebar.createHackathon')}
              description={t('sidebar.createHackathonDescription')}
              leftSection={
                <ThemeIcon variant="light" size="sm" color="blue">
                  <IconPlus size={16} />
                </ThemeIcon>
              }
              onClick={() => navigate('/hackathons/create')}
              variant="subtle"
            />
          )}
          
          <NavLink
            label={isAdmin ? t('sidebar.manageUsers') : t('sidebar.manageMembers')}
            description={isAdmin ? t('sidebar.manageUsersDescription') : t('sidebar.manageMembersDescription')}
            leftSection={
              <ThemeIcon variant="light" size="sm" color={isAdmin ? 'red' : 'blue'}>
                <IconShield size={16} />
              </ThemeIcon>
            }
            active={location.pathname === '/admin/users'}
            onClick={() => navigate('/admin/users')}
            variant="subtle"
          />
          
          {isAdmin && (
            <NavLink
              label={t('sidebar.manageOrganizations')}
              description={t('sidebar.manageOrganizationsDescription')}
              leftSection={
                <ThemeIcon variant="light" size="sm" color="purple">
                  <IconBuilding size={16} />
                </ThemeIcon>
              }
              active={location.pathname === '/admin/organizations'}
              onClick={() => navigate('/admin/organizations')}
              variant="subtle"
            />
          )}
        </>
      )}

      <Text size="xs" c="dimmed" mt="auto" pt="lg">
        {t('sidebar.welcome', { name: user?.name ?? '' })}
      </Text>
    </Stack>
  )
}
