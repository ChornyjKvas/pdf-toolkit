import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('frontend foundation', () => {
  it('shows the homepage, four tool links, and honest privacy copy', () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Less friction.More finished.')
    const section = screen.getByRole('region', { name: 'A tool for each small task.' })
    expect(within(section).getAllByRole('link')).toHaveLength(4)
    const expectedLinks = [['Merge PDF', '/merge-pdf'], ['Split PDF', '/split-pdf'], ['Rotate PDF', '/rotate-pdf'], ['Delete Pages', '/delete-pdf']]
    for (const [name, path] of expectedLinks) expect(within(section).getByRole('link', { name: `${name} — Available` })).toHaveAttribute('href', path)
    expect(screen.getByText('Your files stay in your browser.')).toBeVisible()
    expect(screen.getByText(/No PDF content is sent to our servers/)).toBeVisible()
  })

  it('opens the Delete Pages tool with an empty, disabled action', () => {
    render(<MemoryRouter initialEntries={['/delete-pdf']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Delete Pages' })).toBeVisible()
    expect(screen.getByLabelText('Choose one PDF')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Delete pages' })).toBeDisabled()
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
  })

  it('shows a 404 for an unknown route', () => {
    render(<MemoryRouter initialEntries={['/missing']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })

  it('navigates with the keyboard and focuses main content after navigation', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><App /></MemoryRouter>)
    screen.getByRole('link', { name: 'Merge PDF — Available' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { level: 1, name: 'Merge PDF' })).toBeVisible()
    expect(screen.getByRole('main')).toHaveFocus()
    await user.click(screen.getByRole('link', { name: /All tools/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Less friction.')
  })

  it('opens a static-hosting hash deep link without a server route', () => {
    window.location.hash = '#/split-pdf'
    render(<HashRouter><App /></HashRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Split PDF' })).toBeVisible()
    window.location.hash = ''
  })
})
