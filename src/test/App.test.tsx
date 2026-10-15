import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('frontend foundation', () => {
  it('shows the homepage, five tool links, and honest privacy copy', () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What do you want to do?')
    const section = screen.getByRole('region', { name: 'What do you want to do?' })
    expect(within(section).getAllByRole('link')).toHaveLength(5)
    const expectedLinks = [['Merge PDF', '/merge-pdf', 'Combine files into one PDF.'], ['Split PDF', '/split-pdf', 'Extract the pages you need.'], ['Rotate PDF', '/rotate-pdf', 'Turn pages the right way.'], ['Delete Pages', '/delete-pdf', 'Remove unwanted pages.'], ['Organize PDF', '/organize-pdf', 'Reorder, rotate, and remove pages.']]
    for (const [name, path, description] of expectedLinks) expect(within(section).getByRole('link', { name: `Available ${name} ${description} Open tool` })).toHaveAttribute('href', path)
    expect(screen.getByRole('link', { name: 'Dependency licenses' })).toHaveAttribute('href', './THIRD_PARTY_NOTICES.txt')
    expect(screen.getByRole('link', { name: 'P. PDF Toolkit' })).toHaveAttribute('href', '/')
    expect(screen.getByText(/The five tools above process PDF files in your browser/)).toBeVisible()
    expect(screen.queryByText('A little less paperwork.')).not.toBeInTheDocument()
    expect(screen.getAllByText('Available')).toHaveLength(5)
    expect(screen.queryByRole('link', { name: /DOCX|PPTX|convert/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Choose.*PDF/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeVisible()
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

  it.each([
    ['Merge PDF', 'Combine files into one PDF.'],
    ['Split PDF', 'Extract the pages you need.'],
    ['Rotate PDF', 'Turn pages the right way.'],
    ['Delete Pages', 'Remove unwanted pages.'],
    ['Organize PDF', 'Reorder, rotate, and remove pages.'],
  ])('opens %s from its card with the keyboard and focuses main', async (name, description) => {
    const user = userEvent.setup()
    render(<MemoryRouter><App /></MemoryRouter>)
    screen.getByRole('link', { name: 'Available ' + name + ' ' + description + ' Open tool' }).focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name })).toBeVisible()
    expect(document.title).toBe(name + ' — PDF Toolkit')
    expect(screen.getByRole('main')).toHaveFocus()
    await user.click(screen.getByRole('link', { name: /All tools/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What do you want to do?')
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
