# Global data architecture on real screens

This integration exists only in branch `feature/global-data-real-screens-20260722`.

The confirmed laboratory version remains unchanged in branch `test/global-data-push-lab-20260722`.
The production branch `main` is not changed.

## Integration strategy

The first real-screen migration keeps the current screen components and API contracts intact.
A global runtime is mounted above `AuthTokenGuard` and provides:

- in-memory and `sessionStorage` cache for `/api/me`, `/api/events`, and `/api/find-teams`;
- stale-while-revalidate background refresh;
- global handling of sports and membership push notifications;
- immediate cache updates for games, trainings, and confirmation status;
- background reconciliation through the existing APIs;
- global synchronization of subscriptions to `team_<ID>`;
- route revision boundaries that remount a screen from the updated cache without changing its UI.

No PHP server files or Android files are changed.

## Connected screens

- `/calendar` — profile, teams, calendar, confirmation updates;
- `/home` — profile updates;
- `/find-team` — cached search and membership updates;
- `/chat` — membership/topic updates while the existing chat store stays unchanged;
- `/coach` — profile and calendar updates.

## Push events

- `NEW GAME`
- `EDIT GAME`
- `DELETE GAME`
- `NEW TRAINING`
- `EDIT TRAINING`
- `DELETE TRAINING`
- `GAMER CONFIRMATION`
- `GAME CONFIRMATION`
- `TRAINING CONFIRMATION`
- `JOIN TO TEAM`

Chat push notifications continue to be handled by the existing chat implementation.

## Local verification

```bash
cd ~/Desktop/HM51-Web/hm51-next

git fetch origin
git switch -c feature/global-data-real-screens-20260722 \
  --track origin/feature/global-data-real-screens-20260722

npm test
npm run build
npm run dev
```

If the local branch already exists:

```bash
git switch feature/global-data-real-screens-20260722
git pull --ff-only origin feature/global-data-real-screens-20260722

npm test
npm run build
npm run dev
```

## Functional test

1. Sign in and allow notifications.
2. Open `/calendar`, `/home`, `/find-team`, `/chat`, then return to `/calendar`.
3. In browser DevTools → Network, filter by `me`, `events`, and `find-teams`.
4. Confirm that repeated screen switching uses cached responses and does not repeatedly call the remote PHP server.
5. From another device create, edit, and delete a game and training.
6. Confirm that the real calendar updates after the push.
7. Change game or training confirmation and verify status, squad, and position.
8. Accept a test player's team request and verify that teams, topics, and calendar update.
9. Test returning after more than 15 minutes and restoring internet after offline mode.
10. Test logout and login again before considering merge.

## Important limitations of this stage

- Existing screen components still call their normal API functions, but the global runtime intercepts repeat reads and returns the shared cached response.
- Participants of an event remain lazy-loaded when the event card is opened.
- Team search is cached for 10 minutes and refreshed in the background.
- A missed background sports push is corrected by the existing API during startup, stale refresh, reconnect, or screen request.
- The branch must not be merged into `main` until local build and the full functional test pass.
