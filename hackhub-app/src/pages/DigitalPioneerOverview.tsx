import { Button, Container, Grid, Group, Stack, Text } from '@mantine/core'
import { IconArrowRight, IconBallpen, IconEye } from '@tabler/icons-react'
import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { AwardLens } from '../components/DigitalPioneer/AwardLens'
import { useLanguage } from '../contexts/LanguageContext'
import { DIGITAL_PIONEER_TIMELINE, DIGITAL_PIONEER_TRACKS } from '../config/digitalPioneer'
import './DigitalPioneer.css'

const copy = {
  en: {
    kicker: '2026 · BDCN High-Performance Culture',
    purpose: 'Recognizing individual contributions to digital transformation in customer value, innovation and collaboration.',
    nominate: 'Start a nomination',
    browse: 'Browse & vote',
    briefLabel: 'One individual award',
    briefTitle: 'Three award categories',
    briefBody: 'Manager nomination and self-nomination are both welcome. Choose the category that best reflects the nominee’s strongest contribution.',
    categoriesLabel: 'Award categories',
    categoriesTitle: 'Award categories and criteria',
    categoriesBody: 'Review the observable behavior standards for each category before selecting where to nominate.',
    timelineLabel: 'Campaign calendar',
    timelineTitle: '2026 selection timeline',
    ctaLabel: 'Individual nomination',
    ctaTitle: 'Nominate a Digital Pioneer',
    ctaBody: 'Describe what changed, how the nominee led the work, and the measurable value created.',
  },
  zh: {
    kicker: '2026 · BDCN 高绩效文化',
    purpose: '数字先锋奖表彰在客户价值、创新实践和团队协作中作出数字化贡献的个人。',
    nominate: '开始提名',
    browse: '浏览并投票',
    briefLabel: '一项个人荣誉',
    briefTitle: '三个奖项赛道',
    briefBody: '支持管理者提名与个人自荐。请选择最能代表候选人核心贡献的奖项赛道。',
    categoriesLabel: '奖项赛道',
    categoriesTitle: '奖项赛道与评选标准',
    categoriesBody: '提名前，请先查看每个赛道对应的可观察行为标准。',
    timelineLabel: '评选日程',
    timelineTitle: '2026 评选时间线',
    ctaLabel: '个人提名',
    ctaTitle: '提名一位数字先锋',
    ctaBody: '说明发生了什么改变、候选人如何推动工作，以及创造了哪些可衡量的价值。',
  },
} as const

export function DigitalPioneerOverview(): ReactElement {
  const { language } = useLanguage()
  const text = copy[language]

  return (
    <Container size={1440} py={{ base: 'md', md: 'xl' }} className="dp-page">
      <section className="dp-hero" aria-labelledby="digital-pioneer-title">
        <Grid className="dp-hero__content" gutter={{ base: 42, lg: 76 }} align="center">
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Stack gap={32}>
              <Text className="dp-kicker">{text.kicker}</Text>
              <div>
                <h1 id="digital-pioneer-title" className="dp-hero__title">
                  Digital Pioneer
                </h1>
                <Text className="dp-hero__intro" mt="xl">{text.purpose}</Text>
              </div>
              <Group gap="sm">
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
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 5 }}>
            <AwardLens />
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
              <Text className="dp-timeline-phase" fw={700}>
                {String(index + 1).padStart(2, '0')} · {item.phase}
              </Text>
              <Text className="dp-timeline-detail">{item.detail}</Text>
            </article>
          ))}
        </div>
      </section>

      <section className="dp-cta" aria-labelledby="nomination-cta-title">
        <Grid gutter="xl" align="center">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <h2 id="nomination-cta-title" className="dp-section-title">
              {text.ctaTitle}
            </h2>
            <Text className="dp-section-copy" mt="lg">{text.ctaBody}</Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Button
              component={Link}
              to="/nominate"
              size="lg"
              fullWidth
              rightSection={<IconArrowRight size={18} />}
              className="dp-primary-button"
            >
              {text.nominate}
            </Button>
          </Grid.Col>
        </Grid>
      </section>
    </Container>
  )
}
