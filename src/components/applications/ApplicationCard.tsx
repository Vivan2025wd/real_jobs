import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils/format";

export function ApplicationCard({
  jobTitle,
  companyName,
  status,
  appliedAt,
}: {
  jobTitle: string;
  companyName: string;
  status: string;
  appliedAt: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">{jobTitle}</p>
          <p className="text-sm text-gray-500">{companyName} · Applied {timeAgo(appliedAt)}</p>
        </div>
        <StatusBadge status={status} />
      </CardBody>
    </Card>
  );
}