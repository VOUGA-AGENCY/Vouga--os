import { BrandMark } from "@/foundation/appearance/brand-mark";

export default function CalendarLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="A carregar Calendar"
      className="workspace-loading-screen"
    >
      <div className="workspace-loading-mark">
        <BrandMark priority size={32} />
      </div>
    </main>
  );
}
