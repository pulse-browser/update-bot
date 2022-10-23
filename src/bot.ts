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
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types'
import fetch from 'node-fetch'

// Note: Because of ESM quirks, we have to append .js to the end of our files
// even if they are ts
import { delay, getLatestAddonVersion, getLatestFF } from './utils.js'
import { config } from '../repos.js'

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
  assignedUsers: string[]
  issueLabel: string
}

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
  console.info(`Checking for open update tracker for ${projectName}`)

  let data:
    | undefined
    | RestEndpointMethodTypes['issues']['list']['response']['data']

  try {
    const { data: returnedData } = await gh_interface.rest.issues.listForRepo({
      creator: BOT_USER,
      labels: issueLabel,
      owner: issueOwner,
      repo: issueRepo,
    })

    data = returnedData
  } catch (error) {
    console.warn(error)
    console.log()
    console.log("Couldn't get open issues, creating a new one")
  }

  if (data?.length > 0) {
    console.info(`Found ${data[0].number} on ${issueOwner}/${issueRepo}`)
    return data[0].number
  }

  console.info(`No open update tracker found, creating one`)

  const createIssueResponce = await gh_interface.rest.issues.create({
    assignees: [BOT_USER, ...pingUsers],
    body: ``,
    labels: [issueLabel],
    owner: issueOwner,
    repo: issueRepo,
    title: `❗ ${projectName} has out of date dependencies`,
  })

  console.info(
    `Created issue ${createIssueResponce.data.number} on ${issueOwner}/${issueRepo}`
  )
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
        new: currentFirefoxVersion,
        old: gluon_config.version.version,
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
          new: await getLatestAddonVersion(addon),
          old: addon.version,
        })
      }
    }

    if (outOfDateDependencies.length > 0) {
      const issueOwner = repo.repo.split('/')[0]
      const issueRepo = repo.repo.split('/')[1]

      const issueId = await getOpenUpdateTrackerOrCreateOne({
        issueLabel: repo.issueLabel,
        issueOwner,
        issueRepo,
        pingUsers: repo.assignedUsers,
        projectName: gluon_config.name,
      })

      console.info(`Updating issue ${issueId} on ${issueOwner}/${issueRepo}`)
      gh_interface.request(
        'PATCH /repos/{owner}/{repo}/issues/{issue_number}',
        {
          body: `## Outdated Dependencies
${outOfDateDependencies
  .map(
    (dependency) =>
      `- ${dependency.name}: ${dependency.old} → ${dependency.new}`
  )
  .join('\n')}

You can opt in or out of these requests by creating a pull request to the [update bot repository](https://github.com/pulse-browser/update-bot/blob/main/repos.json)`,

          issue_number: issueId,
          owner: issueOwner,
          repo: issueRepo,
        }
      )
    }

    await delay(30)
  } catch (error) {
    console.error(error)
  }
}
