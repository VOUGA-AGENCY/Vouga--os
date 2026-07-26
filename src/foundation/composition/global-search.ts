import "server-only";

import { cache } from "react";
import { composeGlobalSearch } from "@/projections/search/global-search";

import { createCompanyModule } from "./companies";
import { createDecisionModule } from "./decisions";
import { createMeetingModule } from "./meetings";
import { createProjectModule } from "./projects";
import { createRoadmapModule } from "./roadmap";
import { createSprintModule } from "./sprints";
import { createTaskModule } from "./tasks";
import { createRelationsModule } from "./relations";

export const createGlobalSearchIndex = cache(async (now: string) => {
  const [companies, relations, meetings, projects, tasks, decisions, sprints, roadmap] =
    await Promise.all([
      createCompanyModule(),
      createRelationsModule(),
      createMeetingModule(),
      createProjectModule(),
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
      projects: projects.readModel,
      roadmap: roadmap.readModel,
      sprints: sprints.readModel,
      tasks: tasks.readModel,
    },
    now,
  );
});
