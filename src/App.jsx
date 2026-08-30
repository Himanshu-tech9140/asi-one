import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import NewCoordination from './pages/NewCoordination'
import TaskDetails from './pages/TaskDetails'
import History from './pages/History'
import AgentNetwork from './pages/AgentNetwork'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewCoordination />} />
        <Route path="/task/:id" element={<TaskDetails />} />
        <Route path="/history" element={<History />} />
        <Route path="/agents" element={<AgentNetwork />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
