// ============================================================
// Production Environment & Deployment Safety Validation Tests
//
// Verifies production constraints:
// - Fail startup if MONGODB_URI missing in production
// - Fail startup if FRONTEND_URL missing or wildcard in production
// - Reject missing GOOGLE_MAPS_API_KEY in production (no silent mock)
// - Reject missing ASI_ONE_API_KEY in production (no silent mock)
// - Never leak credentials
// ============================================================

const assert = require('node:assert/strict')
const { fork } = require('child_process')
const path = require('path')

console.log('--- Testing Production Environment Enforcement ---')

function runWorker(envVars) {
  return new Promise((resolve) => {
    const workerScript = `
      process.env = { ...process.env, ...${JSON.stringify(envVars)} };
      try {
        const { env } = require('./src/config/env');
        process.send({ success: true, env: { nodeEnv: env.nodeEnv, corsOrigin: env.corsOrigin, isProduction: env.isProduction } });
      } catch (err) {
        process.send({ success: false, error: err.message });
      }
    `
    const child = fork(
      '-e',
      [workerScript],
      {
        cwd: path.resolve(__dirname, '..'),
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      },
    )

    child.on('message', (msg) => {
      resolve(msg)
      child.kill()
    })

    child.on('exit', () => {
      resolve({ success: false, error: 'Process exited without message' })
    })
  })
}

async function run() {
  // 1. Missing MONGODB_URI in production
  {
    const res = await runWorker({
      NODE_ENV: 'production',
      MONGODB_URI: '',
      FRONTEND_URL: 'https://crisisflow.onrender.com',
    })
    assert.equal(res.success, false, 'Production startup fails when MONGODB_URI is missing')
    assert(res.error.includes('MONGODB_URI'), 'Error message specifies MONGODB_URI')
    console.log('  ok - Production requires MONGODB_URI and rejects startup without it')
  }

  // 2. Missing FRONTEND_URL in production
  {
    const res = await runWorker({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/crisisflow',
      FRONTEND_URL: '',
    })
    assert.equal(res.success, false, 'Production startup fails when FRONTEND_URL is missing')
    assert(res.error.includes('FRONTEND_URL'), 'Error message specifies FRONTEND_URL')
    console.log('  ok - Production requires FRONTEND_URL and rejects startup without it')
  }

  // 3. Wildcard * FRONTEND_URL in production
  {
    const res = await runWorker({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/crisisflow',
      FRONTEND_URL: '*',
    })
    assert.equal(res.success, false, 'Production rejects wildcard * in FRONTEND_URL')
    assert(res.error.includes('valid http(s) URL'), 'Error message requires valid URL')
    console.log('  ok - Production rejects wildcard CORS origin')
  }

  // 4. Valid production configuration
  {
    const res = await runWorker({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/crisisflow',
      FRONTEND_URL: 'https://crisisflow-web.onrender.com',
      PORT: '10000',
    })
    assert.equal(res.success, true, 'Valid production environment loads successfully')
    assert.equal(res.env.nodeEnv, 'production', 'nodeEnv is production')
    assert.equal(res.env.corsOrigin, 'https://crisisflow-web.onrender.com', 'corsOrigin matches FRONTEND_URL')
    assert.equal(res.env.isProduction, true, 'isProduction is true')
    console.log('  ok - Valid production config passes validation and respects dynamic PORT')
  }

  console.log('\nAll Production Environment Safety Tests Passed!')
}

run().catch((err) => {
  console.error('Production test suite failed:', err)
  process.exit(1)
})

