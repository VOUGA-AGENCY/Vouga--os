import "server-only";

import { cache } from "react";
import { createCompanyModule } from "@/foundation/composition/companies";
import { createCostModule } from "@/foundation/composition/costs";
import { createDecisionModule } from "@/foundation/composition/decisions";
import { createMeetingModule } from "@/foundation/composition/meetings";
import { createRoadmapModule } from "@/foundation/composition/roadmap";
import { createSprintModule } from "@/foundation/composition/sprints";
import { createTaskModule } from "@/foundation/composition/tasks";
import { createRelationsModule } from "@/foundation/composition/relations";
import { ContextEngine } from "@/projections/context-engine/context-engine";

export const createContextEngine = cache(async () => {
  const [companies, relations, costs, tasks, meetings, decisions, sprints, roadmap] =
    await Promise.all([
      createCompanyModule(),
      createRelationsModule(),
      createCostModule(),
      createTaskModule(),
      createMeetingModule(),
      createDecisionModule(),
      createSprintModule(),
      createRoadmapModule(),
    ]);

  return new ContextEngine({
    companies: companies.readModel,
    relations: relations.readModel,
    costs: costs.readModel,
    tasks: tasks.readModel,
    meetings: meetings.readModel,
    decisions: decisions.readModel,
    sprints: sprints.readModel,
    roadmap: roadmap.readModel,
  });
});
