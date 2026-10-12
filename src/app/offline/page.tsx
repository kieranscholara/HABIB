export default function Page() {
  return (
    <main className="offline-page">
      <span className="empty-symbol">✳</span>
      <h1>A little pause.</h1>
      <p>
        You’re offline. Connect to the internet to continue learning. Your
        completed practice is saved.
      </p>
      <a className="button" href="/dashboard">
        Try again →
      </a>
    </main>
  );
}
