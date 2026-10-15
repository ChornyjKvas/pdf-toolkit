import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('frontend foundation', () => {
  it('shows the homepage, five tool links, and honest privacy copy', () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Less friction.More finished.')
    const section = screen.getByRole('region', { name: 'A tool for each small task.' })
    expect(within(section).getAllByRole('link')).toHaveLength(5)
    const expectedLinks = [['Merge PDF', '/merge-pdf', 'Bring multiple PDFs together in one document.'], ['Split PDF', '/split-pdf', 'Take just the pages you need from a PDF.'], ['Rotate PDF', '/rotate-pdf', 'Give sideways pages the right perspective.'], ['Delete Pages', '/delete-pdf', 'Keep the useful pages. Leave the rest behind.'], ['Organize PDF', '/organize-pdf', 'See, reorder, rotate, and remove your pages.']]
    for (const [name, path, description] of expectedLinks) expect(within(section).getByRole('link', { name: `Available ${name} ${description} Explore tool` })).toHaveAttribute('href', path)
    expect(screen.getByRole('link', { name: 'Dependency licenses' })).toHaveAttribute('href', './THIRD_PARTY_NOTICES.txt')
    expect(screen.getByRole('link', { name: 'P. PDF Toolkit' })).toHaveAttribute('href', '/')
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
    screen.getByRole('link', { name: 'Available Merge PDF Bring multiple PDFs together in one document. Explore tool' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { level: 1, name: 'Merge PDF' })).toBeVisible()
    expect(document.title).toBe('Merge PDF — PDF Toolkit')
    expect(screen.getByRole('main')).toHaveFocus()
    await user.click(screen.getByRole('link', { name: /All tools/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Less friction.')
    expect(document.title).toBe('PDF Toolkit — Simple tools, local files')
  })

  it.each([['/split-pdf', 'Split PDF'], ['/rotate-pdf', 'Rotate PDF'], ['/delete-pdf', 'Delete Pages'], ['/missing', 'Page not found']])('sets the browser title for %s', (path, title) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
    expect(document.title).toBe(`${title} — PDF Toolkit`)
  })

  it('opens a static-hosting hash deep link without a server route', () => {
    window.location.hash = '#/split-pdf'
    render(<HashRouter><App /></HashRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Split PDF' })).toBeVisible()
    window.location.hash = ''
  })
})
