import { describe, expect, it } from "vitest";
import type { ActiveMember, MemberDirectory } from "@/application/members/contracts";
import type { Meeting } from "@/domain/meetings/meeting";
import type { MeetingContextDirectory, MeetingRepository } from "./contracts";
import { MeetingService } from "./meeting-service";
const members: ActiveMember[] = [{ id: "member-1", displayName: "Miguel", email: "m@vouga.pt" }];
function setup() {
  let saved: Meeting | null = null;
  const repository: MeetingRepository = {
    findById: async () => saved,
    create: async (values) =>
      (saved = {
        id: "meeting-1",
        ...values,
        status: "planned",
        conclusion: null,
        closedAt: null,
        createdAt: "2026-07-19T09:00:00Z",
        updatedAt: "2026-07-19T09:00:00Z",
      }),
    update: async (meeting, values) => (saved = { ...meeting, ...values }),
    saveState: async (meeting) => (saved = meeting),
    close: async (meeting) => (saved = meeting),
    delete: async () => {
      saved = null;
    },
  };
  const directory: MemberDirectory = {
    listActive: async () => members,
    isActive: async (id) => id === "member-1",
  };
  const contexts: MeetingContextDirectory = {
    listCompanies: async () => [],
    companiesExist: async () => true,
    listTasks: async () => [],
    tasksExist: async () => true,
    listContacts: async () => [],
    contactsExist: async () => true,
  };
  return {
    service: new MeetingService(repository, directory, contexts, () => "2026-07-19T12:00:00Z"),
    get: () => saved,
  };
}
const values = {
  title: "Alinhamento",
  startsAt: "2026-07-19T10:00:00Z",
  endsAt: "2026-07-19T11:00:00Z",
  participantMemberIds: ["member-1"],
  companyIds: [],
  taskIds: [],
};
describe("MeetingService", () => {
  it("guarda apenas referências aprovadas", async () => {
    const { service } = setup();
    const created = await service.createMeeting(values);
    expect(created.participants[0].memberId).toBe("member-1");
  });
  it("deriva o título da Vacation a partir do Member oficial", async () => {
    const { service } = setup();
    const created = await service.createMeeting({
      kind: "vacation",
      calendarTone: "purple",
      startsAt: "2026-07-20T23:00:00.000Z",
      endsAt: "2026-07-25T23:00:00.000Z",
      participantMemberIds: ["member-1"],
    });
    expect(created).toMatchObject({
      kind: "vacation",
      calendarTone: "purple",
      title: "Vacation · Miguel",
    });
  });
  it("fecha através do repositório autorizado", async () => {
    const { service } = setup();
    const created = await service.createMeeting(values);
    expect((await service.closeMeeting(created.id, "Output")).status).toBe("closed");
  });
  it("elimina pelo caso de uso explícito", async () => {
    const x = setup();
    const created = await x.service.createMeeting(values);
    await x.service.deleteMeeting(created.id);
    expect(x.get()).toBeNull();
  });
});
