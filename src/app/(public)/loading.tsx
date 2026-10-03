// Shown inside the public layout while a page is prepared: the header and footer stay in place.
export default function Loading() {
  return (
    <div className="page-loading" role="status">
      <div className="loading-bar" />
      Chargement…
    </div>
  );
}
