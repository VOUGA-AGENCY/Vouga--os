import { BrandMark } from "@/foundation/appearance/brand-mark";

export default function WorkspaceLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="workspace-loading-screen">
      <div className="workspace-loading-mark">
        <BrandMark priority size={32} />
      </div>
    </main>
  );
}
