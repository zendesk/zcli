import { error } from "@oclif/core/lib/errors";
import type { Brand } from "../types";
import { request } from "@zendesk/zcli-core";
import * as inquirer from "inquirer";

export default async function getBrandId(): Promise<string> {
  const response = await request.requestAPI("/api/v2/brands.json");

  if (response.status !== 200) {
    error("Failed to retrieve brands");
  }

  const brands = (await response.json()).brands;

  if (brands.length === 1) {
    return brands[0].id.toString();
  }

  const { brandId } = await inquirer.prompt({
    type: "list",
    name: "brandId",
    message: "What brand should the theme be imported to?",
    choices: brands.map((brand: Brand) => ({
      name: brand.name,
      value: brand.id.toString(),
    })),
  });

  return brandId;
}
