"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MockSchedule = {
  id: string;
  title: string;
  date: string;
  account: string;
  status: "queued" | "posted" | "failed";
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<MockSchedule[]>([]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedules</h1>
          <p className="text-sm text-muted-foreground">
            Plan and queue your posts.
          </p>
        </div>
        <Button
          onClick={() => {
            /* wire later */
          }}
        >
          Create Schedule
        </Button>
      </header>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>New Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Title" />
          <Input type="datetime-local" placeholder="Date" />
          <Input placeholder="Account" />
          <Button>Create</Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="h-40 rounded-md border border-dashed border-white/15 flex items-center justify-center text-sm text-muted-foreground">
              No schedules yet. Create one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id} className="border-b border-white/10">
                      <td className="py-2 pr-4">{s.title}</td>
                      <td className="py-2 pr-4">{s.date}</td>
                      <td className="py-2 pr-4">{s.account}</td>
                      <td className="py-2 pr-4 capitalize">{s.status}</td>
                      <td className="py-2 pr-0 text-right">
                        <Button size="sm" variant="outline" className="mr-2">
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive">
                          Cancel
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
