export default function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-10 rounded-xl border p-8 text-center">
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}
