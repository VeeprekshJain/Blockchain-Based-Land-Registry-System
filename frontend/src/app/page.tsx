import Link from 'next/link';

const features = [
  {
    icon: '🔒',
    title: 'Immutable Records',
    desc: 'Every land transaction is permanently recorded on the blockchain — no alteration, no fraud.',
  },
  {
    icon: '⚡',
    title: 'Instant Verification',
    desc: 'Verify ownership in real-time. No paperwork delays, no middlemen.',
  },
  {
    icon: '🌐',
    title: 'Fully Transparent',
    desc: 'All records are publicly auditable. Anyone can verify ownership at any time.',
  },
  {
    icon: '🛡️',
    title: 'Tamper-Proof',
    desc: 'Smart contracts enforce business rules automatically with zero human intervention.',
  },
];

const stats = [
  { label: 'Smart Contract', value: 'Solidity 0.8.24' },
  { label: 'Network', value: 'Ethereum / Local' },
  { label: 'API', value: 'REST + Blockchain' },
  { label: 'Database', value: 'MongoDB' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-24 text-center">
        <span className="inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-400">
          Blockchain-Powered Land Registry
        </span>
        <h1 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Secure Land Ownership
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            On The Blockchain
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
          A tamper-proof digital land registry that records ownership transfers as immutable smart
          contract transactions. No more disputes, no forgery.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 transition"
          >
            View All Land Records
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-gray-700 bg-gray-800 px-8 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-700 transition"
          >
            Register a Parcel
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-800 bg-gray-900 py-6">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-6 sm:grid-cols-4">
          {stats.map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-base font-semibold text-white">{value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold text-white">Why Blockchain?</h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Traditional land registries are slow and prone to corruption. We fix that.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-6 transition hover:border-blue-700"
            >
              <div className="mb-3 text-3xl">{icon}</div>
              <h3 className="font-semibold text-gray-100">{title}</h3>
              <p className="mt-2 text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="rounded-2xl border border-blue-900 bg-blue-950/50 p-10">
          <h2 className="text-2xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-3 text-sm text-gray-400">
            Open the dashboard to browse all registered parcels or register a new one.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/transfer"
              className="rounded-lg border border-gray-700 bg-gray-800 px-6 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-700 transition"
            >
              Transfer Ownership
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
