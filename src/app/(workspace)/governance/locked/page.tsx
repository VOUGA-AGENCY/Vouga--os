import { GovernanceUnlockForm } from "./governance-unlock-form";

export default async function GovernanceLockedPage({
  searchParams,
}: {
  searchParams: Promise<{ configuration?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  const missingConfiguration = params.configuration === "missing";

  return (
    <main className="governance-locked-page">
      <div aria-hidden="true" className="governance-blur-preview">
        <div />
        <div />
        <div />
        <div />
      </div>
      <section aria-labelledby="governance-unlock-title" className="governance-unlock-panel">
        <p className="eyebrow">Governance protegida</p>
        <h1 id="governance-unlock-title">Access key</h1>
        <GovernanceUnlockForm
          configurationAvailable={!missingConfiguration}
          returnTo={returnTo}
        />
      </section>
    </main>
  );
}

function safeReturnTo(value: string | undefined) {
  if (!value) return "/governance";
  const pathname = value.split("?")[0];
  return ["/governance", "/costs", "/vault"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ) ? value : "/governance";
}
