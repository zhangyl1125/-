import { Button, Container, Grid, Group, Stack, Text } from '@mantine/core'
import { IconBallpen, IconEye } from '@tabler/icons-react'
import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import pioneerLogo from '../assets/digital-pioneer-logo.png'
import { useLanguage } from '../contexts/LanguageContext'
import { DIGITAL_PIONEER_TIMELINE, DIGITAL_PIONEER_TRACKS } from '../config/digitalPioneer'
import './DigitalPioneer.css'

const copy = {
  en: {
    nominate: 'Start a nomination',
    browse: 'Browse & vote',
    categoriesTitle: 'Award categories and criteria',
    timelineTitle: '2026 selection timeline',
  },
  zh: {
    nominate: '开始报名',
    browse: '浏览并投票',
    categoriesTitle: '奖项赛道与评选标准',
    timelineTitle: '2026 评选时间线',
  },
} as const

export function DigitalPioneerOverview(): ReactElement {
  const { language } = useLanguage()
  const text = copy[language]

  return (
    <Container size={1440} py={{ base: 'md', md: 'xl' }} className="dp-page">
      <section className="dp-hero dp-overview-hero" aria-labelledby="digital-pioneer-title">
        <Grid className="dp-hero__content" gutter={{ base: 42, lg: 76 }} align="center">
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Stack gap={32}>
              <div>
                <h1 id="digital-pioneer-title" className="dp-hero__title">
                  2026 BDCN Digital Pioneer
                </h1>
                <Text className="dp-hero__intro" mt="xl">The Digital Pioneer Award honors individuals who actively drive digital transformation and live BDCN High-Performance Culture— delivering customer values, pioneering innovation, and achieving shared success through collaboration.</Text>
              </div>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 5 }}>
            <div className="dp-overview-logo-wrap">
              <img className="dp-overview-logo" src={pioneerLogo} alt="2026 BDCN Digital Pioneer" width={1254} height={1254} />
              <span className="dp-overview-logo-lettering" aria-hidden="true" style={{ maskImage: `url(${pioneerLogo})`, WebkitMaskImage: `url(${pioneerLogo})` }} />
            </div>
          </Grid.Col>
        </Grid>
      </section>

      <section className="dp-section" aria-labelledby="award-categories-title">
        <Grid gutter={{ base: 18, md: 60 }} align="end">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <h2 id="award-categories-title" className="dp-section-title">{text.categoriesTitle}</h2>
          </Grid.Col>
        </Grid>

        <div className="dp-track-grid">
          {DIGITAL_PIONEER_TRACKS.map((track) => (
            <article className="dp-track" key={track.value}>
              <h3 className="dp-track-title">{language === 'zh' ? track.labelZh : track.label}</h3>
              <Text className="dp-track-intro" mt="md">{track.description}</Text>
              <ul className="dp-standard-list">
                {track.standards.map((standard) => <li key={standard}>{standard}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="dp-section" aria-labelledby="campaign-timeline-title">
        <h2 id="campaign-timeline-title" className="dp-section-title">{text.timelineTitle}</h2>
        <div className="dp-timeline">
          {DIGITAL_PIONEER_TIMELINE.map((item, index) => (
            <article className="dp-timeline-item" key={item.phase}>
              <Text className="dp-timeline-period">{item.period}</Text>
              <Text className="dp-timeline-phase" fw={700} translate="no">
                {String(index + 1).padStart(2, '0')} · {item.phase}
              </Text>
            </article>
          ))}
        </div>
      </section>

      <section className="dp-cta" aria-label={text.nominate}>
        <Group gap="sm" justify="flex-end">
          <Button
            component={Link}
            to="/nominate"
            className="dp-primary-button"
            leftSection={<IconBallpen size={18} />}
          >
            {text.nominate}
          </Button>
          <Button
            component={Link}
            to="/projects"
            variant="default"
            className="dp-secondary-button"
            leftSection={<IconEye size={18} />}
          >
            {text.browse}
          </Button>
        </Group>
      </section>
    </Container>
  )
}
