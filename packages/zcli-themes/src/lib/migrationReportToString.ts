import * as chalk from 'chalk'
import type { MigrationReport } from '../types'

const successLine = chalk.green('Theme migrated successfully')

export default function migrationReportToString (report: MigrationReport | undefined): string {
  if (!report || Object.keys(report).length === 0) {
    return `${successLine} (no migrations fired).`
  }

  const lines: string[] = [successLine, '']

  const identifiers = Object.keys(report).sort()
  for (const identifier of identifiers) {
    const entries = report[identifier]
    if (!entries || entries.length === 0) continue

    lines.push(`  ${chalk.green('✓')} ${chalk.cyan.bold(identifier)}`)

    for (const { target, description, test_plan: testPlan } of entries) {
      if (target) {
        lines.push(`      • ${chalk.bold(target)} — ${description}`)
      } else {
        lines.push(`      • ${description}`)
      }
      lines.push(`        ${testPlan}`)
    }

    lines.push('')
  }

  if (lines[lines.length - 1] === '') lines.pop()

  return lines.join('\n')
}
