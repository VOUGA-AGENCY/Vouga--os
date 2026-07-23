import "server-only";

import { composeGlobalSearch } from "@/projections/search/global-search";

import { createCompanyModule } from "./companies";
import { createDecisionModule } from "./decisions";
import { createMeetingModule } from "./meetings";
import { createRoadmapModule } from "./roadmap";
import { createSprintModule } from "./sprints";
import { createTaskModule } from "./tasks";
import { createRelationsModule } from "./relations";

export async function createGlobalSearchIndex(now: string) {
  const [companies, relations, meetings, tasks, decisions, sprints, roadmap] =
    await Promise.all([
      createCompanyModule(),
      createRelationsModule(),
      createMeetingModule(),
      createTaskModule(),
      createDecisionModule(),
      createSprintModule(),
      createRoadmapModule(),
    ]);

  return composeGlobalSearch(
    {
      companies: companies.readModel,
      relations: relations.readModel,
      decisions: decisions.readModel,
      meetings: meetings.readModel,
      roadmap: roadmap.readModel,
      sprints: sprints.readModel,
      tasks: tasks.readModel,
    },
    now,
  );
}
