import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { ToolPage } from './pages/ToolPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { tools } from './lib/tools'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {tools.map((tool) => <Route key={tool.path} path={tool.path} element={<ToolPage tool={tool} />} />)}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  )
}
