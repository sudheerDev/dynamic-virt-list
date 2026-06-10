# Dynamic virtlist

This is a separate, experimental project for rewriting the Mattermost message virtualization library while keeping the current implementation available as a behavior oracle.

The copied legacy implementation starts in `src/lib/dynamic_virtualized_list`. The scenario app and Playwright suite are split into two concerns.

## Load And Scroll Position

These cases cover first mount behavior and the initial scroll target:

- Channel loaded at the bottom/latest message.
- Channel loaded at the new message line.
- Channel loaded around a permalink target.
- Channel loaded at the bottom with a few network-backed image attachments.
- Channel loaded around a permalink target with a few network-backed image attachments.

Channel-style first loads mount 50 messages. Permalink first loads mount 60 messages around the target. Older messages are added later through the load-older action.

## Message Actions

These controls apply a change to the currently mounted list instance. They do not reload or remount the list, so you can click a load state first and then apply these actions manually:

- Appending a new message while pinned keeps latest visible.
- Appending a new message while away from latest does not steal the reader's position.
- Loading older messages preserves the current reading anchor.
- Random deletion of messages above the fold keeps the scroll position stable.
- Editing visible message text keeps the active reading region stable.
- Message content growth while pinned keeps the viewport at latest.
- Viewport height changes while pinned keep latest visible.
- Opening the RHS shrinks the list while preserving the active reading region.

The two control groups are defined in `src/scenarios/scenario_cases.ts` as `loadScenarioCases` and `messageActionCases`. The file also keeps `scenarioCases` for automated matrix tests that intentionally combine a load mode with a follow-up action.

For non-bottom first-load modes, the runner waits before applying the follow-up action. This models the chat app settling after loading at the new message line or permalink before delayed events such as RHS opening, deletions, edits, or incoming messages happen.

## Commands

```sh
npm run build --prefix webapp/virt
npm run dev --prefix webapp/virt
npm run test --prefix webapp/virt
```

Run `npm install` before the first command in a fresh checkout. The Playwright runner checks the package's local `node_modules` first and can also fall back to Mattermost's nearby Playwright install when this folder is used inside the Mattermost checkout.
