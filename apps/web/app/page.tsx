export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">ScheduleBox</h1>
      <p className="mt-4 text-lg text-gray-600">
        AI-powered reservation and scheduling platform
      </p>
      <p className="mt-2 text-sm text-gray-400">
        v{process.env.APP_VERSION || '1.0.0'} &mdash; Phase 1: Infrastructure
      </p>
    </main>
  );
}
