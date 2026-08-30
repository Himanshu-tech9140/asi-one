import React from 'react'
import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '../components/common/Button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05] text-accent-soft">
        <Compass size={30} />
      </div>
      <h1 className="mt-5 text-3xl font-bold text-white">404</h1>
      <p className="mt-2 text-sm text-slate-400">This coordination path doesn’t exist.</p>
      <Button to="/" className="mt-6">
        Back to Dashboard
      </Button>
    </div>
  )
}
