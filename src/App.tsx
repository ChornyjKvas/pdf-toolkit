import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { ToolPage } from './pages/ToolPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { tools } from './lib/tools'
import { MergePage } from './pages/MergePage'
import { SplitPage } from './pages/SplitPage'
import { RotatePage } from './pages/RotatePage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/merge-pdf" element={<MergePage />} />
        <Route path="/split-pdf" element={<SplitPage />} />
        <Route path="/rotate-pdf" element={<RotatePage />} />
        {tools.filter((tool) => tool.path === '/delete-pdf').map((tool) => <Route key={tool.path} path={tool.path} element={<ToolPage tool={tool} />} />)}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  )
}
