#!/usr/bin/env node
/**
 * Interactive release: choose test / production / both and semver version, then run build + electron-builder.
 * Non-interactive: set RELEASE_VERSION=1.2.3 RELEASE_TARGETS=test,production (or test / production / both).
 * Prompts use green; echoed answers use blue (ANSI).
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const root = process.cwd()
const pkgPath = path.join(root, 'package.json')

const C = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
}

function warn(msg) {
  console.warn(`${C.dim}${msg}${C.reset}`)
}

function promptLine(msg) {
  console.log(`${C.green}${msg}${C.reset}`)
}

function answerLine(msg) {
  console.log(`${C.blue}${msg}${C.reset}`)
}

function readPkg() {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
}

function semverOk(v) {
  return /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(v)
}

/**
 * @param {string} raw
 * @returns {'test'|'production'[]}
 */
function parseTargets(raw) {
  const s = raw.trim().toLowerCase()
  if (!s) return []
  if (s === 'both' || s === 'all' || s === '1,2' || s === '1 2') return ['test', 'production']
  const parts = s.split(/[\s,]+/).filter(Boolean)
  const out = /** @type {('test'|'production')[]} */ ([])
  for (const p of parts) {
    if (p === 'test' || p === 'dev' || p === 'testing') {
      if (!out.includes('test')) out.push('test')
    } else if (p === 'production' || p === 'prod' || p === 'release') {
      if (!out.includes('production')) out.push('production')
    }
  }
  return out
}

function pnpm(args) {
  /** Windows：无 shell 时无法直接 spawn .cmd，会报 spawnSync EINVAL */
  const win = process.platform === 'win32'
  const r = spawnSync('pnpm', args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    ...(win ? { shell: true } : {}),
  })
  if (r.error) throw r.error
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function runNodeScript(relPath) {
  const r = spawnSync(process.execPath, [path.join(root, relPath)], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  if (r.error) throw r.error
  if (r.status !== 0) process.exit(r.status ?? 1)
}

/**
 * @param {string} version
 * @param {'test'|'production'} target
 */
function runElectronBuilder(version, target) {
  /**
   * 双份 `--config` 在 yargs 里会变成字符串数组，只会保留最后一个 extends，output 覆盖不生效，
   * test/prod 会打进同一 release/x.x.x，第二次打包无法删除 app.asar。
   * 改为单文件 + extends 继承根目录 electron-builder.json5。
   */
  const outDirRel =
    target === 'test' ? `release/${version}-test` : `release/${version}`

  /** @type {Record<string, unknown>} */
  const patch = {
    /** read-config-file 把相对 extends 按 cwd 解析，不能用 ../，否则找不到基座配置 */
    extends: path.resolve(root, 'electron-builder.json5'),
    directories: { output: outDirRel },
    extraMetadata: { version },
  }
  if (target === 'test') {
    patch.productName = '企微调研Demo-Test'
  }

  const patchRel = 'scripts/.electron-builder-release.json'
  const patchAbs = path.join(root, patchRel)
  fs.writeFileSync(patchAbs, JSON.stringify(patch), 'utf8')

  const ebCli = path.join(root, 'node_modules', 'electron-builder', 'cli.js')
  const r = spawnSync(process.execPath, [ebCli, '--config', patchAbs], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  if (r.error) throw r.error
  if (r.status !== 0) process.exit(r.status ?? 1)
}

/**
 * @param {'test'|'production'} mode
 */
function viteBuild(mode) {
  const viteMode = mode === 'test' ? 'test' : 'production'
  pnpm(['exec', 'vite', 'build', '--mode', viteMode])
}

async function interactive() {
  const pkg = readPkg()
  const rl = readline.createInterface({ input, output })

  promptLine(
    'Select package target(s). Type one or more (space-separated): test | production | both\n' +
      'Examples: "production"   "test"   "test production"   "both"'
  )
  const rawTargets = (await rl.question(`${C.dim}> ${C.reset}`)).trim()
  let targets = parseTargets(rawTargets)
  if (!targets.length) {
    warn('No valid target; defaulting to production.')
    targets = ['production']
  }
  answerLine(`Targets: ${targets.join(', ')}`)

  const defV = typeof pkg.version === 'string' ? pkg.version : '1.0.0'
  promptLine(`Application version (semver). Press Enter for default: ${defV}`)
  const rawVer = (await rl.question(`${C.dim}> ${C.reset}`)).trim()
  const version = rawVer || defV
  if (!semverOk(version)) {
    console.error(`${C.reset}Invalid semver: ${version}`)
    process.exit(1)
  }
  answerLine(`Version: ${version}`)

  rl.close()
  return { targets, version }
}

function nonInteractive() {
  const pkg = readPkg()
  const version = (process.env.RELEASE_VERSION?.trim() || pkg.version || '1.0.0').trim()
  const rawT = process.env.RELEASE_TARGETS?.trim() || 'production'
  let targets = parseTargets(/^(both|all)$/i.test(rawT) ? 'both' : rawT)
  if (!targets.length) targets = ['production']
  if (!semverOk(version)) {
    console.error(`Invalid semver: ${version} (set RELEASE_VERSION or fix package.json version)`)
    process.exit(1)
  }
  answerLine(`Targets: ${targets.join(', ')}  Version: ${version}`)
  return { targets, version }
}

async function main() {
  const useInteractive = process.stdin.isTTY && !process.env.RELEASE_VERSION
  const { targets, version } = useInteractive ? await interactive() : nonInteractive()

  promptLine('[1/3] Cleaning previous release output…')
  runNodeScript('scripts/clean-release.mjs')

  promptLine('[2/3] Typecheck (vue-tsc)…')
  pnpm(['exec', 'vue-tsc', '--noEmit'])

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]
    const step = `[3/3] Build ${t} (${i + 1}/${targets.length})…`
    promptLine(step)
    viteBuild(t)
    runElectronBuilder(version, t)
  }

  promptLine('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
