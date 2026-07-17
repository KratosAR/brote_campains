#!/usr/bin/env node
/**
 * Generates a Markdown changelog from git log, grouped by area tag
 * ([INFRA]/[BACKEND]/[FRONTEND]) then by Conventional Commits type.
 *
 * Only understands this repo's tagged commit convention (see
 * commitlint.config.js): "[TAG] type(scope): subject". Commits that don't
 * match (old history, merge commits, etc.) are skipped, not guessed at.
 *
 * Usage:
 *   node scripts/generate-changelog.mjs --since <tag-or-sha> [--until <sha>]
 *
 * Prints Markdown to stdout. Doesn't touch any files itself - the caller
 * decides whether that goes into a GitHub Release body, CHANGELOG.md, etc.
 */

import { execSync } from 'node:child_process'

const HEADER_PATTERN = /^\[(INFRA|BACKEND|FRONTEND)\]\s+(\w+)(?:\(([\w$.\-*/ ]*)\))?!?:\s*(.+)$/

const TYPE_LABELS = {
  feat: 'Features',
  fix: 'Fixes',
  perf: 'Performance',
  refactor: 'Refactors',
  docs: 'Documentation',
  test: 'Tests',
  build: 'Build',
  ci: 'CI/CD',
  chore: 'Chores',
  style: 'Style',
  revert: 'Reverts',
}

const TAG_LABELS = {
  INFRA: 'Infrastructure',
  BACKEND: 'Backend',
  FRONTEND: 'Frontend',
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--since') args.since = argv[++i]
    if (argv[i] === '--until') args.until = argv[++i]
  }
  return args
}

function getCommits(since, until) {
  const range = since ? `${since}..${until}` : until
  const raw = execSync(`git log ${range} --pretty=format:%H%x1f%s`, {
    encoding: 'utf-8',
  })
  if (!raw.trim()) return []
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, subject] = line.split('\x1f')
      return { hash, subject }
    })
}

function groupCommits(commits) {
  const groups = {}
  const skipped = []

  for (const { hash, subject } of commits) {
    const match = subject.match(HEADER_PATTERN)
    if (!match) {
      skipped.push(subject)
      continue
    }
    const [, tag, type, scope, description] = match
    groups[tag] ??= {}
    groups[tag][type] ??= []
    groups[tag][type].push({ hash: hash.slice(0, 7), scope, description })
  }

  return { groups, skipped }
}

function renderMarkdown(groups) {
  const tagOrder = ['BACKEND', 'FRONTEND', 'INFRA']
  const typeOrder = ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'build', 'ci', 'chore', 'style', 'revert']
  const lines = []

  for (const tag of tagOrder) {
    if (!groups[tag]) continue
    lines.push(`### ${TAG_LABELS[tag]}`, '')
    for (const type of typeOrder) {
      const entries = groups[tag][type]
      if (!entries || entries.length === 0) continue
      lines.push(`**${TYPE_LABELS[type] ?? type}**`, '')
      for (const { hash, scope, description } of entries) {
        const scopeText = scope ? `**${scope}**: ` : ''
        lines.push(`- ${scopeText}${description} (${hash})`)
      }
      lines.push('')
    }
  }

  return lines.join('\n').trim()
}

function main() {
  const { since, until = 'HEAD' } = parseArgs(process.argv.slice(2))
  const commits = getCommits(since, until)
  const { groups, skipped } = groupCommits(commits)

  const markdown = renderMarkdown(groups)
  console.log(markdown || '_No tagged commits in this range._')

  if (skipped.length > 0) {
    console.error(`\n(skipped ${skipped.length} untagged commit(s) - not part of the [INFRA]/[BACKEND]/[FRONTEND] convention)`)
  }
}

main()
