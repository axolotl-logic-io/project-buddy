"use client";

import type { Route } from "next";
import Link from "next/link";
import { type JSX, useCallback, useId, useState } from "react";
import { ListItems } from "@/components/list-items.tsx";
import { ListSettings } from "@/components/list-settings.tsx";
import { RiteDialog } from "@/components/rite-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestId } from "@/ids.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import type { Rite } from "@/rites/rite.ts";
import type { TaskHistory } from "@/streaks/streaks.ts";
import type { TallyQuest } from "@/tallies/tally.ts";
import { LIST_PAGE_COPY } from "@/ui/copy/list-page.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";

// One of a quest's lists, on its own page in the page's frame: a link
// back to the quest, the list's name with its size, the rite candle and
// a button that shows the list's settings under the name, then its items.
// rites is undefined while a performance runs, which hides the candle.
function ListPage({
  questId,
  quest,
  back,
  list,
  contents,
  destinations,
  history,
  tallies,
  next,
  rites,
}: {
  readonly questId: QuestId;
  // The quest's name, for the link back to it.
  readonly quest: string;
  readonly back: Route;
  readonly list: List;
  readonly contents: readonly ListItem[];
  readonly destinations: readonly List[];
  readonly history: TaskHistory | undefined;
  readonly tallies: TallyQuest | undefined;
  readonly next: ListItemId | undefined;
  readonly rites: readonly Rite[] | undefined;
}): JSX.Element {
  const settingsId = useId();
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const toggleSettings = useCallback(
    (): void => setSettingsOpen((shown) => !shown),
    [],
  );
  const size = QUEST_OVERVIEW_COPY.listSize(list.type, {
    total: contents.length,
    open: contents.filter(({ checkedOff }) => !checkedOff).length,
  });
  return (
    <div className="page-workspace quest-folio list-page">
      <header className="list-page-top">
        <Link
          className="list-page-back"
          href={back}
          aria-label={LIST_PAGE_COPY.back(quest)}
        >
          <Icon name="chevron-left" />
          <span className="list-page-back-name">{quest}</span>
        </Link>
        <div className="list-page-head">
          <div className="list-page-name">
            <h2 className="quest-focus-title">{list.name}</h2>
            <span className="list-section-size">
              <span aria-hidden={true} className="list-section-dot" /> {size}
            </span>
          </div>
          {rites !== undefined && rites.length > 0 && (
            <RiteDialog list={list} rites={rites} />
          )}
          <Button
            variant="quiet"
            className="list-page-settings-open"
            aria-label={LISTS_COPY.settings}
            title={LISTS_COPY.settings}
            aria-expanded={settingsOpen}
            aria-controls={settingsId}
            onClick={toggleSettings}
          >
            <Icon name="settings" />
          </Button>
        </div>
        <div
          id={settingsId}
          className="list-page-settings"
          hidden={!settingsOpen}
        >
          <ListSettings questId={questId} list={list} />
        </div>
      </header>
      <ListItems
        questId={questId}
        list={list}
        contents={contents}
        destinations={destinations}
        history={history}
        tallies={tallies}
        next={next}
      />
    </div>
  );
}

export { ListPage };
