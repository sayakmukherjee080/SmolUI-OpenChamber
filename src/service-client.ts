// Talks to the extension's local service, which installs the agent skill
// into the user's OpenCode skills directory.

import type { HostClient } from "@openchamber/sdk";

export type SkillSetupResult = "current" | "installed" | "updated" | "unavailable";

type SetupStatus = {
  installed?: boolean;
  installedVersion?: string | null;
  packageVersion?: string;
};

/**
 * Makes sure the OpenCode skill on disk matches this extension's version;
 * installs or re-syncs through the service. Returns "unavailable" when the
 * service is missing, ungranted, or failed — never throws.
 */
export async function ensureSkill(host: HostClient): Promise<SkillSetupResult> {
  try {
    const status = await host.serviceRequest({ method: "GET", path: "/setup/status" });
    if (status.status !== 200) return "unavailable";
    const info = JSON.parse(status.body) as SetupStatus;
    if (info.installed && info.installedVersion === info.packageVersion) return "current";
    const install = await host.serviceRequest({ method: "POST", path: "/setup/install" });
    if (install.status !== 200) return "unavailable";
    return info.installed ? "updated" : "installed";
  } catch {
    return "unavailable";
  }
}
