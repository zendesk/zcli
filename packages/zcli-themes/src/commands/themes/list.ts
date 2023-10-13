import { Command, Flags, CliUx } from "@oclif/core";
import { request } from "@zendesk/zcli-core";
import * as chalk from "chalk";
import getBrandId from "../../lib/getBrandId";

export default class List extends Command {
  static description = "list installed themes";

  static enableJsonFlag = true;

  static flags = {
    brandId: Flags.string({
      description: "The id of the brand where the themes are installed",
    }),
  };

  static examples = ["$ zcli themes:list --brandId=123456"];

  static strict = false;

  async run() {
    let {
      flags: { brandId },
    } = await this.parse(List);

    brandId = brandId || (await getBrandId());

    CliUx.ux.action.start("Listing themes");
    const response = await request.requestAPI(
      `/api/v2/guide/theming/themes?brand_id=${brandId}`,
      {
        headers: {
          "X-Zendesk-Request-Originator": "zcli themes:list",
        },
      },
    );

    if (response.status !== 200) {
      const [error] = (await response.json()).errors;
      this.error(`${error.code} - ${error.title}`);
    }

    const themes = (await response.json()).themes;
    CliUx.ux.action.stop("Ok");
    this.log(chalk.green("Themes listed successfully"), themes);
    return { themes };
  }
}
