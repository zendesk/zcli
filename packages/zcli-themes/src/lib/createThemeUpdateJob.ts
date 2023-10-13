import type { PendingJob } from "../types";
import { CliUx } from "@oclif/core";
import { request } from "@zendesk/zcli-core";
import * as chalk from "chalk";
import { error } from "@oclif/core/lib/errors";

export default async function createThemeUpdateJob(
  themeId: string,
  replaceSettings: boolean,
): Promise<PendingJob> {
  CliUx.ux.action.start("Creating theme update job");

  const response = await request.requestAPI(
    "/api/v2/guide/theming/jobs/themes/updates",
    {
      method: "POST",
      headers: {
        "X-Zendesk-Request-Originator": "zcli themes:update",
      },
      body: JSON.stringify({
        job: {
          attributes: {
            theme_id: themeId,
            replace_settings: replaceSettings,
            format: "zip",
          },
        },
      }),
    },
  );

  if (response.status !== 202) {
    const [{ code, title }] = (await response.json()).errors;
    error(`${chalk.bold(code)} - ${title}`);
  }

  const job = (await response.json()).job;
  CliUx.ux.action.stop("Ok");
  return job;
}
