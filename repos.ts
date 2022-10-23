import { UpdateCheckerConfig } from './src/bot.js'

export const config: UpdateCheckerConfig[] = [
  {
    assignedUsers: ['trickypr'],
    branch: 'main',
    issueLabel: 'upstream',
    name: 'Quark Runtime',
    repo: 'quark-platform/runtime',
  },
  {
    assignedUsers: ['trickypr', 'pressjump'],
    branch: 'alpha',
    issueLabel: 'upstream',
    name: 'Pulse Browser',
    repo: 'pulse-browser/browser',
  },
  {
    assignedUsers: ['splatboydev'],
    branch: 'main',
    issueLabel: 'update',
    name: 'Freon Browser',
    repo: 'splatboydev/freon',
  },
]
