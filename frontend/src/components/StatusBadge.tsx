export default function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-600'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-red-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
