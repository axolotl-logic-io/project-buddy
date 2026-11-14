import { z } from "zod";

const TEXT_LIST = z.array(z.string());
function parseTextList(value: string): string[] {
  try {
    return TEXT_LIST.parse(JSON.parse(value));
  } catch {
    return [];
  }
}

export { parseTextList };
