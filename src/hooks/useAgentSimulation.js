import { useState, useEffect, useRef, useCallback } from 'react'
import { EXECUTION_STEPS } from '../data/mockData'

// Frontend-only agent simulation.
// Runs through high-level execution steps on a timer and exposes
// which steps are pending / active / completed.
//
// No real API calls — this is pure UI simulation so the workflow
// can be visualized and later swapped for a real backend.

const STEP_ORDER = EXECUTION_STEPS.map((s) => s.id)

// Map step id -> short tool status text used in ToolExecution card
const TOOL_STATUS_BY_STEP = {
  searched: 'Facility Search',
  compared: 'Option Comparison',
  routing: 'Route Calculation',
}

export function useAgentSimulation() {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [completedIndex, setCompletedIndex] = useState(-1)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [timestamps, setTimestamps] = useState({})
  const timersRef = useRef([])

  const start = useCallback(() => {
    // reset
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setActiveIndex(-1)
    setCompletedIndex(-1)
    setIsComplete(false)
    setTimestamps({})

    let cumulative = 0
    EXECUTION_STEPS.forEach((step, i) => {
      const startAt = cumulative
      cumulative += step.duration + 250 // small gap between steps

      const t1 = setTimeout(() => {
        setActiveIndex(i)
        setCompletedIndex(i - 1)
        const started = new Date().toLocaleTimeString('en-US', {
          hour12: false,
          minute: '2-digit',
          second: '2-digit',
        })
        setTimestamps((prev) => ({ ...prev, [step.id]: started }))
        setIsRunning(true)
      }, startAt)

      // mark this step complete when the next one starts
      const completeAt = startAt + step.duration
      timersRef.current.push(
        setTimeout(
          () => {
            setCompletedIndex(i)
          },
          step.duration > 0 ? completeAt : startAt + 1,
        ),
      )
    })

    // final completion
    timersRef.current.push(
      setTimeout(() => {
        setCompletedIndex(STEP_ORDER.length - 1)
        setActiveIndex(-1)
        setIsRunning(false)
        setIsComplete(true)
      }, cumulative + 400),
    )
  }, [])

  const reset = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setActiveIndex(-1)
    setCompletedIndex(-1)
    setIsRunning(false)
    setIsComplete(false)
    setTimestamps({})
  }, [])

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout)
  }, [])

  const steps = STEP_ORDER.map((id, i) => ({
    ...EXECUTION_STEPS[i],
    status:
      i <= completedIndex ? 'completed' : i === activeIndex ? 'active' : 'pending',
    completed: i <= completedIndex,
    active: i === activeIndex,
    timestamp: timestamps[id],
  }))

  // Unified tool execution status (visible during + after run)
  const toolStatuses = {
    'Facility Search': completedIndex >= 3 ? 'completed' : isRunning ? 'running' : 'idle',
    'Route Calculation': completedIndex >= 5 ? 'completed' : isRunning ? 'running' : 'idle',
    'Web Search': completedIndex >= 4 ? 'completed' : isRunning ? 'running' : 'idle',
  }

  return {
    steps,
    isRunning,
    isComplete,
    start,
    reset,
    toolStatuses,
  }
}
