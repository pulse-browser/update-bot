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

const ISSUE_USER = 'pulse-browser'
const ISSUE_REPO = 'browser'
const BOT_USER = 'fushra-robot'
const PING_USERS = ['trickypr', 'pressjump']

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
}

const config: UpdateCheckerConfig[] = require('../repos.json')

async function getOpenUpdateTrackerOrCreateOne(
  gluonConfig: any
): Promise<number> {
  const { data } = await gh_interface.rest.issues.list({
    owner: ISSUE_USER,
    repo: ISSUE_REPO,
    labels: 'upstream',
    creator: BOT_USER,
  })

  if (data.length == 0) {
    return (
      await gh_interface.rest.issues.create({
        owner: ISSUE_USER,
        repo: ISSUE_REPO,
        title: `❗ ${gluonConfig.name} has out of date dependencies`,
        labels: ['upstream'],
        assignees: [BOT_USER, ...PING_USERS],
        body: ``,
      })
    ).data.number
  } else {
    return data[0].number
  }
}

async function main() {
  for (const repo of config) {
    try {
      const gluon_config = await (
        await fetch(
          `https://raw.githubusercontent.com/${repo.repo}/${repo.branch}/gluon.json`
        )
      ).json()

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
        const issueId = await getOpenUpdateTrackerOrCreateOne(gluon_config)

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
    } catch (e) {
      console.error(e)
    }
  }
}

main()
