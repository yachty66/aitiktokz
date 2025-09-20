import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Quick glance at accounts, schedules, and performance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-white text-black hover:bg-gray-200">
            Create Account
          </Button>
          <Button variant="secondary">New Schedule</Button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Scheduled", value: "0" },
          { label: "Posted", value: "0" },
          { label: "Total Engagement", value: "0" },
          { label: "Avg Engagement Rate", value: "0.0%" },
        ].map((m) => (
          <Card key={m.label} className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {m.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                No accounts connected yet.
              </p>
              <Button size="sm">Connect Account</Button>
            </div>
            <div className="h-40 rounded-md border border-dashed border-white/15 flex items-center justify-center text-sm text-muted-foreground">
              Accounts table placeholder
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Upcoming Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                No scheduled posts.
              </p>
              <Button size="sm" variant="secondary">
                Create Schedule
              </Button>
            </div>
            <div className="h-40 rounded-md border border-dashed border-white/15 flex items-center justify-center text-sm text-muted-foreground">
              Schedules table placeholder
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
