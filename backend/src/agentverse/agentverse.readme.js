// ============================================================
// Agentverse-facing README + registration metadata.
//
// This content is stored/uploaded to Agentverse during registration so
// the agent is indexable and searchable. It is generated here so it stays
// truthful and consistent with the code, and so credentials/keys are never
// embedded.
//
// The README structure follows the Agentverse profile format used for
// self-hosted Chat Protocol agents (description, capabilities, examples,
// limitations). It only claims capabilities that are actually implemented.
// ============================================================

const {
  AGENT_NAME,
  AGENT_DESCRIPTION,
  CAPABILITIES,
  KEYWORDS,
} = require('./agentverse.identity')

const README_MARKDOWN = `# ${AGENT_NAME} — Emergency Healthcare Coordination Agent

${AGENT_DESCRIPTION}

## What CrisisFlow can do

- Find emergency healthcare facilities near a location
- Find healthcare services (hospitals, clinics)
- Find pharmacies
- Find blood banks
- Calculate routes to nearby facilities
- Multi-step: find an emergency facility AND its route

## What CrisisFlow uses

- Real Google Places data for facility discovery
- Real Google Routes data for route calculation
- The CrisisFlow tool registry + ACP agent interface

## Architecture

\`\`\`
ASI:One  ->  CrisisFlow  ->  ACP  ->  Tool Registry  ->  Google APIs
\`\`\`

## Example request

\`\`\`
Find emergency healthcare facilities near lat 28.62 lng 77.36
\`\`\`

## Limitations

- Facility information depends on provider (Google Places) data
- Route information depends on Maps availability
- CrisisFlow does NOT diagnose medical conditions
- CrisisFlow does NOT prescribe medication
- CrisisFlow does NOT guarantee facility availability, hospital admission,
  blood availability, or medicine stock

## Interaction mode

The official Agentverse FastAPI/uagents_core adapter implements Agent Chat
Protocol and forwards only supported requests to CrisisFlow's private
\`POST /api/acp\` interface. The Express endpoint is not itself an
Agentverse registration endpoint.
`

// Registration metadata submitted to Agentverse.
function registrationPayload() {
  return {
    name: AGENT_NAME,
    description: AGENT_DESCRIPTION,
    capabilities: CAPABILITIES,
    keywords: KEYWORDS,
    readme: README_MARKDOWN,
  }
}

module.exports = {
  README_MARKDOWN,
  registrationPayload,
}
