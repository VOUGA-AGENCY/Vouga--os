export type ActiveMember = Readonly<{
  id: string;
  displayName: string;
  email: string;
}>;

export interface MemberDirectory {
  listActive(): Promise<ActiveMember[]>;
  isActive(id: string): Promise<boolean>;
}
