"use client";

import * as React from "react";
import { OnboardingWizard } from "./onboarding-wizard";

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [showWizard, setShowWizard] = React.useState(false);
  const [workspaceName, setWorkspaceName] = React.useState("My Workspace");

  React.useEffect(() => {
    // Check if user has already dismissed or completed onboarding
    const localDismissed = localStorage.getItem("apiwatch_onboarding_dismissed");
    if (localDismissed === "true") {
      return;
    }

    fetch("/api/onboarding/status")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.data && data.data.completed === false) {
          setShowWizard(true);
          if (data.data.workspaceName) {
            setWorkspaceName(data.data.workspaceName);
          }
        }
      })
      .catch(() => {
        // quiet in case of offline/dev
      });
  }, []);

  const handleComplete = () => {
    localStorage.setItem("apiwatch_onboarding_dismissed", "true");
    setShowWizard(false);
  };

  return (
    <>
      {children}
      {showWizard && (
        <OnboardingWizard
          initialWorkspaceName={workspaceName}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
