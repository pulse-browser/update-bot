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
import axios from 'axios'

// Thefted from gluon
// =====================================

export enum SupportedProducts {
  Firefox = 'firefox',
  FirefoxESR = 'firefox-esr',
  FirefoxESRNext = 'firefox-esr-next',
  FirefoxDev = 'firefox-dev',
  FirefoxBeta = 'firefox-beta',
  FirefoxNightly = 'firefox-nightly',
}

const firefoxTargets = JSON.parse(`{
  "${SupportedProducts.Firefox}": "LATEST_FIREFOX_VERSION",
  "${SupportedProducts.FirefoxBeta}": "LATEST_FIREFOX_DEVEL_VERSION",
  "${SupportedProducts.FirefoxDev}": "FIREFOX_DEVEDITION",
  "${SupportedProducts.FirefoxESR}": "FIREFOX_ESR",
  "${SupportedProducts.FirefoxESRNext}": "FIREFOX_ESR_NEXT",
  "${SupportedProducts.FirefoxNightly}": "FIREFOX_NIGHTLY"
}`)

export const getLatestFF = async (
  product: SupportedProducts = SupportedProducts.Firefox
): Promise<string> => {
  const { data } = await axios.get(
    'https://product-details.mozilla.org/1.0/firefox_versions.json'
  )

  return data[firefoxTargets[product]]
}

// End of theft
// ====================


// Config contants
/**
 * Specifies the location of the config for this file
 * TODO: Auto scan a github user / org to find these repos
 */
const GLUON_CONFIG_LOCATION = 'https://raw.githubusercontent.com/pulse-browser/browser/alpha/gluon.json'
const ISSUE_USER = 'pulse-browser'
const ISSUE_REPO = 'browser'
const BOT_USER = 'fushra-bot'
const PING_USERS = ['trickypr', 'pressjump']

// Connect to github
const gh_interface = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    userAgent: 'pulse-update-checker' 
})

async function main() {
  const gluon_config = await (await fetch(GLUON_CONFIG_LOCATION)).json()
  const current_version = await getLatestFF(gluon_config.version.product)

  if (gluon_config.version.version !== current_version) {
    const { data } = await gh_interface.rest.issues.list({
      owner: ISSUE_USER,
      repo: ISSUE_REPO,
      labels: 'upstream',
      creator: BOT_USER
    })

    if (data.length == 0) {
      await gh_interface.rest.issues.create({
        owner: ISSUE_USER,
        repo: ISSUE_REPO,
        title: `❗ ${gluon_config.name} is out of date`,
        labels: ["upstream"],
        assignees: [BOT_USER, ...PING_USERS],
        body: `## Version comparison
      
  * **${gluon_config.name} Version** - \`${gluon_config.version.version}\`
  * **${gluon_config.version.product} Version** - \`${current_version}\``,
      });
    } else {
      console.log('Issue has already been created, aborting')
    }
  }
}

main()
