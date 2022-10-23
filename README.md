# update-bot

Keep track on when you need to update your orgs firefox forks

## Adding your repo

1. Create an issue tag on your repo that update issues should be filed under. For example, [`upstream`](https://github.com/pulse-browser/browser/issues?q=label%3Aupstream+).
2. Give `fushra-robot` trilage permissions, so it can set labels and assignees (otherwise you will get issue spam, ping @TrickyPR in [discord](https://discord.gg/xNkretH7sD) to confirm)
3. Add your repo to the `repos.ts` file
4. Create a pull request with your changes
