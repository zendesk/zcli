import type { PendingJob } from "../types";
import { CliUx } from "@oclif/core";
import { request } from "@zendesk/zcli-core";
import * as chalk from "chalk";
import { error } from "@oclif/core/lib/errors";

export default async function createThemeImportJob(
  brandId: string,
): Promise<PendingJob> {
  CliUx.ux.action.start("Creating theme import job");

  const response = await request.requestAPI(
    "api/v2/guide/theming/jobs/themes/imports",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Zendesk-Request-Originator": "zcli themes:import",
      },
      body: JSON.stringify({
        job: {
          attributes: {
            brand_id: brandId,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CliUx.ux.action.stop("Ok");
  return (await response.json()).job;
}
