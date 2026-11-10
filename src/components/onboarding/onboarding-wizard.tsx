"use client";

import * as React from "react";
import { Sparkles, CheckCircle2, Globe, Shield, ArrowRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface OnboardingWizardProps {
  initialWorkspaceName?: string;
  onComplete: () => void;
}

export function OnboardingWizard({ initialWorkspaceName = "My Workspace", onComplete }: OnboardingWizardProps) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [workspaceName, setWorkspaceName] = React.useState(initialWorkspaceName);
  const [endpointUrl, setEndpointUrl] = React.useState("https://api.github.com/zen");
  const [endpointName, setEndpointName] = React.useState("Sample GitHub API");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleFinish = async () => {
    try {
      setIsSubmitting(true);

      // Create first endpoint if URL provided
      if (step === 2 && endpointUrl) {
        await fetch("/api/endpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: endpointName || "Primary API",
            url: endpointUrl,
            method: "GET",
            intervalSeconds: 60,
            timeoutMs: 5000,
            expectedStatusCodes: "200",
            requestHeaders: [],
            followRedirects: true,
          }),
        }).catch(() => null);
      }

      // Mark onboarding as complete in DB
      await fetch("/api/onboarding/complete", { method: "POST" });
      toast.success("Welcome aboard! 14-Day Pro Trial activated.");
      onComplete();
    } catch {
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={handleFinish}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
          title="Skip onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-indigo-500" : "bg-slate-800"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs mb-2">
                Step 1 of 3
              </Badge>
              <h2 className="text-2xl font-bold text-white">Welcome to APIWatch</h2>
              <p className="text-sm text-slate-400 mt-1">
                Let&apos;s name your workspace. You can invite team members and organize all your services under this workspace.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wsName" className="text-slate-300">Workspace Name</Label>
              <Input
                id="wsName"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Production Services"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="pt-3 flex justify-end">
              <Button onClick={() => setStep(2)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Next Step
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs mb-2">
                Step 2 of 3
              </Badge>
              <h2 className="text-2xl font-bold text-white">Add Your First Endpoint</h2>
              <p className="text-sm text-slate-400 mt-1">
                Enter an HTTP/HTTPS URL you want us to continuously monitor 24/7.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="epName" className="text-slate-300 text-xs">Service Name</Label>
                <Input
                  id="epName"
                  value={endpointName}
                  onChange={(e) => setEndpointName(e.target.value)}
                  placeholder="e.g. Authentication Service"
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>
              <div>
                <Label htmlFor="epUrl" className="text-slate-300 text-xs">Endpoint URL</Label>
                <Input
                  id="epUrl"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://api.example.com/health"
                  className="bg-slate-950 border-slate-800 text-white mt-1 font-mono text-sm"
                />
              </div>
            </div>
            <div className="pt-3 flex justify-between items-center">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-400">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Continue
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white mb-2 shadow-lg shadow-indigo-500/25">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs mb-2">
                14-Day Pro Trial Active
              </Badge>
              <h2 className="text-2xl font-bold text-white">You&apos;re All Set!</h2>
              <p className="text-sm text-slate-400 mt-1">
                Your workspace is ready. You have full access to Pro features for the next 14 days without any credit card required.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Up to 50 monitored endpoints with 1-min intervals</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automatic SSL/TLS expiry tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Webhook, Discord & Email incident dispatch</span>
              </div>
            </div>
            <div className="pt-3">
              <Button
                disabled={isSubmitting}
                onClick={handleFinish}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Launch Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
