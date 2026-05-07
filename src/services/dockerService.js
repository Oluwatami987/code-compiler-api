const { execFile } = require('child_process')
const fs = require('fs/promises')
const path = require('path')
const os = require('os')
const { randomUUID } = require('crypto')

const IMAGE_MAP = {
  javascript: { image: 'compiler-javascript', filename: 'code.js', cmd: ['node', 'code.js'] },
  python:     { image: 'compiler-python',     filename: 'code.py', cmd: ['python', 'code.py'] }
}

module.exports = async function runInSandbox({ language, code, stdin = '', timeoutMs = 10000 }) {
  const config = IMAGE_MAP[language]
  if (!config) throw new Error(`Unsupported language: ${language}`)

  // write code to a temp directory
  const tmpDir = path.join(os.tmpdir(), randomUUID())
  await fs.mkdir(tmpDir, { recursive: true })
  await fs.writeFile(path.join(tmpDir, config.filename), code)

  const dockerArgs = [
    'run', '--rm',
    '--network', 'none',           // no internet access
    '--memory', '128m',            // max 128mb RAM
    '--cpus', '0.5',               // half a CPU core
    '--read-only',                 // read-only filesystem
    '--tmpfs', '/tmp:size=10m',    // small writable tmp
    '-v', `${tmpDir}:/app:ro`,     // mount code read-only
    config.image,
    ...config.cmd
  ]

  return new Promise((resolve) => {
    const start = Date.now()

    const proc = execFile('docker', dockerArgs, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 512 // 512kb max output
    }, (err, stdout, stderr) => {
      const executionTimeMs = Date.now() - start

      // clean up temp dir
      fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})

      if (err && err.killed) {
        return resolve({ stdout: '', stderr: 'Execution timed out', exitCode: 124, executionTimeMs, timedOut: true })
      }

      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: err ? (err.code || 1) : 0,
        executionTimeMs,
        timedOut: false
      })
    })

    // pipe stdin if provided
    if (stdin) {
      proc.stdin.write(stdin)
      proc.stdin.end()
    }
  })
}