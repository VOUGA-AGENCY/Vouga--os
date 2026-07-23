export default function CalendarLoading() {
  return (
    <main className="workspace-main module-main calendar-main" aria-busy="true" aria-label="A carregar Calendar">
      <div className="loading-line loading-line-wide" />
      <div className="loading-line" />
      <div className="calendar-loading-grid">
        {Array.from({ length: 7 }, (_, index) => <div className="loading-card" key={index} />)}
      </div>
    </main>
  );
}
