import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6">
      <main className="max-w-2xl w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">APIWatch</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Automated API Monitoring & Reliability Platform
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            Phase 1 Ready
          </Badge>
        </div>

        <Card className="border border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Environment & Project Bootstrap</CardTitle>
            <CardDescription>
              Foundational stack configured with Next.js App Router, Tailwind CSS, shadcn/ui, and TypeScript.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-300">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Next.js 16 + React 19 + TypeScript</span>
              </div>
              <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-300">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Tailwind CSS v4 + shadcn/ui</span>
              </div>
              <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-300">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>ESLint + Prettier Configured</span>
              </div>
              <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-300">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Base Dependencies Installed</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Button>Get Started</Button>
              <Button variant="outline">Documentation</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
