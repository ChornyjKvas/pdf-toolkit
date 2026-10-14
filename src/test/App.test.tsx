import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { tools } from '../lib/tools'

describe('frontend foundation', () => {
  it('shows the homepage, four tool links, and honest privacy copy', () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Less friction.More finished.')
    const section = screen.getByRole('region', { name: 'A tool for each small task.' })
    expect(within(section).getAllByRole('link')).toHaveLength(4)
    const expectedLinks = [['Merge PDF', '/merge-pdf'], ['Split PDF', '/split-pdf'], ['Rotate PDF', '/rotate-pdf'], ['Delete Pages', '/delete-pdf']]
    for (const [name, path] of expectedLinks) expect(within(section).getByRole('link', { name: `${name} — ${path === '/delete-pdf' ? 'Coming soon' : 'Available'}` })).toHaveAttribute('href', path)
    expect(screen.getByText('Your files stay in your browser.')).toBeVisible()
    expect(screen.getByText(/No PDF content is sent to our servers/)).toBeVisible()
  })

  it.each(tools.filter((tool) => tool.path === '/delete-pdf'))('$path renders an honest placeholder and a home link', (tool) => {
    render(<MemoryRouter initialEntries={[tool.path]}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: tool.name })).toBeVisible()
    expect(screen.getByText('Coming soon')).toBeVisible()
    expect(screen.getByText(/There is currently no file upload or PDF processing functionality/)).toBeVisible()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
    expect(document.querySelector('input[type="file"]')).toBeNull()
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
