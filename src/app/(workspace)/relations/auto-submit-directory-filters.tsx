"use client";

export function AutoSubmitDirectoryFilters({ children }: { children: React.ReactNode }) {
  return (
    <form
      className="crm-directory-sort"
      method="get"
      onChange={(event) => event.currentTarget.requestSubmit()}
    >
      {children}
    </form>
  );
}
