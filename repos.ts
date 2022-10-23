import { UpdateCheckerConfig } from './src/bot.js'

export const config: UpdateCheckerConfig[] = [
  {
    assignedUsers: ['trickypr', 'pressjump'],
    branch: 'alpha',
    issueLabel: 'upstream',
    name: 'Pulse Browser',
    repo: 'pulse-browser/browser',
  },
  {
    assignedUsers: ['trickypr'],
    branch: 'main',
    issueLabel: 'upstream',
    name: 'Quark Runtime',
    repo: 'quark-platform/runtime',
  },
]
