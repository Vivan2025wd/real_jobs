import Link from "next/link";

export default function UnsubscribeDonePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-xl font-bold text-gray-900">You won&apos;t receive more listing invitations</h1>
        <p className="mt-2 text-sm text-gray-600">The address has been added to our suppression list.</p>
        <Link href="/" className="mt-5 inline-block text-sm font-medium text-indigo-600">Return to RealJobs</Link>
      </section>
    </main>
  );
}
