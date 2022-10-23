// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

// A bot that checks for updates regularly and creates an
// issue if there is an update for firefox
//
// Org
// ========
// TODO: Move the config constants into melon.json / gluon.json

import { Octokit } from 'octokit'
import fetch from 'node-fetch'
import { delay, getLatestAddonVersion, getLatestFF } from './utils'

const BOT_USER = 'fushra-robot'

// Connect to github
export const gh_interface = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'pulse-update-checker',
})

export interface UpdateCheckerConfig {
  name: string
  repo: string
  branch: string
  pingUsers: string[]
  issueLabel: string
}

// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const config: UpdateCheckerConfig[] = require('../repos.json')

async function getOpenUpdateTrackerOrCreateOne({
  projectName,
  issueOwner,
  issueRepo,
  issueLabel,
  pingUsers,
}: {
  projectName: string
  issueOwner: string
  issueRepo: string
  issueLabel: string
  pingUsers: string[]
}): Promise<number> {
  const { data } = await gh_interface.rest.issues.list({
    owner: issueOwner,
    repo: issueRepo,
    labels: issueLabel,
    creator: BOT_USER,
  })

  if (data.length > 0) {
    return data[0].number
  }

  const createIssueResponce = await gh_interface.rest.issues.create({
    owner: issueOwner,
    repo: issueRepo,
    title: `❗ ${projectName} has out of date dependencies`,
    labels: [issueLabel],
    assignees: [BOT_USER, ...pingUsers],
    body: ``,
  })

  return createIssueResponce.data.number
}

for (const repo of config) {
  try {
    const rawGluonConfig = await fetch(
      `https://raw.githubusercontent.com/${repo.repo}/${repo.branch}/gluon.json`
    )
    const gluon_config = await rawGluonConfig.json()

    const currentFirefoxVersion = await getLatestFF(
      gluon_config.version.product
    )

    const outOfDateDependencies: {
      name: string
      old: string
      new: string
    }[] = []

    if (gluon_config.version.version !== currentFirefoxVersion) {
      outOfDateDependencies.push({
        name: 'firefox',
        old: gluon_config.version.version,
        new: currentFirefoxVersion,
      })
    }

    for (const addonName in gluon_config.addons) {
      const addon = gluon_config.addons[addonName]

      if (addon.platform == 'url') {
        continue
      }

      if (addon.version !== (await getLatestAddonVersion(addon))) {
        outOfDateDependencies.push({
          name: addonName,
          old: addon.version,
          new: await getLatestAddonVersion(addon),
        })
      }
    }

    if (outOfDateDependencies.length > 0) {
      const issueOwner = repo.repo.split('/')[0]
      const issueRepo = repo.repo.split('/')[1]

      const issueId = await getOpenUpdateTrackerOrCreateOne({
        projectName: gluon_config.name,
        issueOwner,
        issueRepo,
        issueLabel: repo.issueLabel,
        pingUsers: repo.pingUsers,
      })

      gh_interface.request(
        'PATCH /repos/{owner}/{repo}/issues/{issue_number}',
        {
          owner: repo.repo.split('/')[0],
          repo: repo.repo.split('/')[1],
          issue_number: issueId,

          body: `## Outdated Dependencies
${outOfDateDependencies
  .map(
    (dependency) =>
      `- ${dependency.name}: ${dependency.old} → ${dependency.new}`
  )
  .join('\n')}

You can opt in or out of these requests by creating a pull request to the [update bot repository](https://github.com/pulse-browser/update-bot/blob/main/repos.json)`,
        }
      )
    }

    await delay(30)
  } catch (error) {
    console.error(error)
  }
}
