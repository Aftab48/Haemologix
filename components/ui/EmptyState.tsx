import { Inbox } from "lucide-react";

export default function EmptyState({
  message = "No data available",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
      <Inbox className="w-10 h-10 mb-3" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}
