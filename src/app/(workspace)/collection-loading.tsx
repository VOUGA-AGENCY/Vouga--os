import { BrandMark } from "@/foundation/appearance/brand-mark";

type CollectionLoadingProps = {
  label: string;
  rows?: number;
};

export function CollectionLoading({ label }: CollectionLoadingProps) {
  return (
    <main
      aria-busy="true"
      aria-label={`A carregar ${label}`}
      className="workspace-loading-screen"
    >
      <div className="workspace-loading-mark">
        <BrandMark priority size={32} />
      </div>
    </main>
  );
}
