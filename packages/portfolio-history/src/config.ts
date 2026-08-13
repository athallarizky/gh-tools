import { z } from "zod";

export const configSchema = z.object({
  reposDir: z.string().min(1),
  outputDir: z.string().min(1),
  author: z.string().optional(),
  authorEmail: z.string().email().optional(),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  org: z.string().optional(),
  debug: z.boolean()
});

export type Config = z.infer<typeof configSchema>;

export function parseConfig(input: unknown): Config {
  return configSchema.parse(input);
}
