# CrisisFlow — Emergency Healthcare Coordination Agent

CrisisFlow is an AI-powered emergency healthcare coordination agent that helps users discover nearby healthcare facilities, pharmacies, blood banks, and emergency services and calculate routes using real-world location data.

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

```
ASI:One  ->  CrisisFlow  ->  ACP  ->  Tool Registry  ->  Google APIs
```

## Example request

```
Find emergency healthcare facilities near lat 28.62 lng 77.36
```

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
`POST /api/acp` interface. The Express endpoint is not itself an
Agentverse registration endpoint.
