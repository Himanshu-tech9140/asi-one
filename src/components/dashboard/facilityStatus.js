export function badgeToneForStatus(status) {
  if (status === 'Recommended') return 'blue'
  if (status === 'Alternative') return 'slate'
  return 'slate'
}
