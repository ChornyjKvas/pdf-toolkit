import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { MergePage } from './pages/MergePage'
import { SplitPage } from './pages/SplitPage'
import { RotatePage } from './pages/RotatePage'
import { DeletePagesPage } from './pages/DeletePagesPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/merge-pdf" element={<MergePage />} />
        <Route path="/split-pdf" element={<SplitPage />} />
        <Route path="/rotate-pdf" element={<RotatePage />} />
        <Route path="/delete-pdf" element={<DeletePagesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  )
}
