import fetch from 'node-fetch'
import { gh_interface, UpdateCheckerConfig } from './bot'

export interface GithubAddonInfo {
  platform: 'github'
  id: string
  repo: string
  version: string
  fileGlob: string
}

export interface AMOAddonInfo {
  platform: 'amo'
  id: string
  amoId: string
  version: string
}

export interface UrlAddonInfo {
  platform: 'url'
  version: string
  id: string
  url: string
}

export type AddonInfo = (GithubAddonInfo | AMOAddonInfo | UrlAddonInfo) & {
  name: string
}

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
  const data = await get(
    'https://product-details.mozilla.org/1.0/firefox_versions.json'
  )

  return data[firefoxTargets[product]]
}

export async function get(path: string): Promise<any> {
  const data = await fetch(path)
  return await data.json()
}

export async function getLatestAddonVersion(addon: AddonInfo) {
  switch (addon.platform) {
    case 'github':
      return await getGithubAddonVersion(addon)
    case 'amo':
      return await getAMOAddonVersion(addon)
    case 'url':
      return addon.version
  }
}

async function getGithubAddonVersion(
  addon: GithubAddonInfo & { name: string }
): Promise<string> {
  const latestRelease = gh_interface.request(
    'GET /repos/{owner}/{repo}/releases/latest',
    {
      owner: addon.repo.split('/')[0],
      repo: addon.repo.split('/')[1],
    }
  )

  return (await latestRelease).data.tag_name
}

async function getAMOAddonVersion(addon: AMOAddonInfo & { name: string }) {
  const data = await get(
    `https://addons.mozilla.org/api/v4/addons/addon/${addon.amoId}/versions/`
  )

  return data.results[0].version
}

export const delay = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000))
