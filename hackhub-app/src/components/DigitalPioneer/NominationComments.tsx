import { Alert, Button, Group, Stack, Text, Textarea, Title } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import { IdeaService } from '../../services/ideaService'
import type { Comment } from '../../services/ideaService'
import { ProfileService } from '../../services/profileService'

export function NominationComments({ ideaId, userId }: { ideaId: string; userId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [authors, setAuthors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(false)
  const postingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    void IdeaService.getComments(ideaId).then(async (items) => {
      if (cancelled) return
      setComments(items)
      setLoading(false)
      const profiles = await Promise.all([...new Set(items.map((item) => item.userId))].map(async (id) => {
        const profile = await ProfileService.getProfile(id).catch(() => null)
        return [id, profile?.name ?? 'Associate'] as const
      }))
      if (!cancelled) setAuthors(Object.fromEntries(profiles))
    }).catch(() => {
      if (!cancelled) { setLoadError(true); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [ideaId, revision])

  const submit = async () => {
    const content = draft.trim()
    if (!content || postingRef.current) return
    postingRef.current = true
    setPosting(true)
    setPostError(false)
    try {
      await IdeaService.addComment(ideaId, content)
      setDraft('')
      setRevision((value) => value + 1)
    } catch {
      setPostError(true)
    } finally {
      postingRef.current = false
      setPosting(false)
    }
  }

  return (
    <Stack gap="md" component="section" aria-labelledby={`comments-${ideaId}`} className="dp-comments">
      <Title order={3} id={`comments-${ideaId}`}>Comments</Title>
      {loading ? <Text role="status">Loading comments…</Text> : loadError ? (
        <Alert color="red" role="alert">
          <Text>Unable to load comments.</Text>
          <Button variant="subtle" onClick={() => setRevision((value) => value + 1)}>Retry</Button>
        </Alert>
      ) : comments.length === 0 ? <Text c="dimmed">No comments yet.</Text> : (
        <Stack gap="md">
          {comments.map((comment) => (
            <div key={comment.id} className="dp-comment">
              <Group justify="space-between" gap="xs" mb={6}>
                <Text fw={600}>{comment.userId === userId ? 'You' : authors[comment.userId] ?? 'Associate'}</Text>
                <Text component="time" dateTime={comment.createdAt} size="sm" c="dimmed">
                  {new Date(comment.createdAt).toLocaleString(document.documentElement.lang || 'zh-CN')}
                </Text>
              </Group>
              <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} translate="no">{comment.content}</Text>
            </div>
          ))}
        </Stack>
      )}
      <Textarea label="Add a comment" value={draft} onChange={(event) => setDraft(event.currentTarget.value)} minRows={3} disabled={posting} />
      {postError && <Alert color="red" role="alert">Unable to post comment. Please try again.</Alert>}
      <Group justify="flex-end">
        <Button onClick={() => void submit()} loading={posting} disabled={!draft.trim()}>Post comment</Button>
      </Group>
    </Stack>
  )
}
