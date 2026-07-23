type CollectionLoadingProps = {
  label: string;
  rows?: number;
};

export function CollectionLoading({ label, rows = 4 }: CollectionLoadingProps) {
  return (
    <main
      aria-busy="true"
      aria-label={`A carregar ${label}`}
      className="workspace-main module-main"
    >
      <div className="loading-line loading-line-short" />
      <div className="loading-line loading-line-title" />
      <div className="collection-loading" role="status">
        <span className="sr-only">A carregar {label}</span>
        {Array.from({ length: rows }, (_, index) => (
          <div className="collection-loading-row" key={index}>
            <div className="loading-line loading-line-short" />
            <div className="loading-line" />
            <div className="loading-line loading-line-short" />
          </div>
        ))}
      </div>
    </main>
  );
}
