import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageProvider, useLanguage } from './LanguageContext'
import { translateUiText } from './uiTranslations'

function TestContent() {
  const { language, toggleLanguage } = useLanguage()

  return (
    <div>
      <button onClick={toggleLanguage}>{language}</button>
      <span>Hackathons</span>
      <span>12 participants</span>
      <input placeholder="Search hackathons..." />
    </div>
  )
}

describe('LanguageProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('translates all static UI content to Chinese by default and restores English', () => {
    render(
      <LanguageProvider>
        <TestContent />
      </LanguageProvider>,
    )

    expect(screen.getByText('黑客松')).toBeInTheDocument()
    expect(screen.getByText('12 位参与者')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('搜索黑客松……')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'zh' }))

    expect(screen.getByText('Hackathons')).toBeInTheDocument()
    expect(screen.getByText('12 participants')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search hackathons...')).toBeInTheDocument()
  })

  it('leaves user content without a known UI translation unchanged', () => {
    expect(translateUiText("Alice's Custom Hackathon")).toBe("Alice's Custom Hackathon")
    expect(translateUiText('Spring 2026 Hackathon')).toBe('2026 春季黑客松')
  })
})
