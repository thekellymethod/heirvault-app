import { prisma } from "@/lib/db";

export async function ClientActivityFeed({ clientId }: { clientId: string }) {
  const logs = await prisma.audit_logs.findMany({
    where: { clientId:clientId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      users: true,
    },
  });

  if (logs.length === 0) {
    return (
      <section className="mt-4 text-sm text-slate-400">
        No recorded activity for this client yet.
      </section>
    );
  }

  return (
    <section className="mt-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-100">
        Recent activity
      </h2>
      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start justify-between border-b border-slate-800/50 pb-2 last:border-b-0 last:pb-0"
          >
            <div className="text-xs text-slate-200">
              <div className="font-medium">
                {humanizeAuditAction(log.action)}
              </div>
              <div className="text-slate-400">{log.message}</div>
              {log.users && (
                <div className="mt-0.5 text-[11px] text-slate-500">
                  By: {log.users.email}
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              {log.createdAt.toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function humanizeAuditAction(action: string): string {
  switch (action) {
    case "CLIENT_CREATED":
      return "Client created";
    case "CLIENT_UPDATED":
      return "Client updated";
    case "POLICY_CREATED":
      return "Policy created";
    case "POLICY_UPDATED":
      return "Policy updated";
    case "BENEFICIARY_CREATED":
      return "Beneficiary added";
    case "BENEFICIARY_UPDATED":
      return "Beneficiary updated";
    case "INVITE_CREATED":
      return "Client invite sent";
    case "INVITE_ACCEPTED":
      return "Client invite accepted";
    case "INVITE_REACTIVATED":
      return "Client invite reactivated";
    default:
      return action;
  }
}

