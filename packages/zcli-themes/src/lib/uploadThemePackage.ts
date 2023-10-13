import type { PendingJob } from "../types";
import { CliUx } from "@oclif/core";
import * as fs from "fs";
import * as FormData from "form-data";
import * as axios from "axios";
import { request } from "@zendesk/zcli-core";
import { error } from "@oclif/core/lib/errors";

export const themeSizeLimit = 31457280;

export default async function uploadThemePackage(
  job: PendingJob,
  readStream: fs.ReadStream,
): Promise<void> {
  CliUx.ux.action.start("Uploading theme package");

  const formData = new FormData();

  for (const key in job.data.upload.parameters) {
    formData.append(key, job.data.upload.parameters[key]);
  }

  formData.append("file", readStream);

  try {
    await request.requestAPI(job.data.upload.url, {
      method: "POST",
      body: formData,
      maxBodyLength: themeSizeLimit,
      maxContentLength: themeSizeLimit,
    });
    CliUx.ux.action.stop("Ok");
  } catch (e) {
    error(e as axios.AxiosError);
  }
}
