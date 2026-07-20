import { z } from "zod";

export const cliConfigSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
  user: z.string().optional(),
  authorEmail: z.string().email().optional(),
  output: z.string().min(1),
  orgs: z.array(z.string()).optional(),
  orgsOnly: z.boolean(),
  debug: z.boolean()
});

export type CliConfig = z.infer<typeof cliConfigSchema>;

export function parseCliConfig(input: unknown): CliConfig {
  return cliConfigSchema.parse(input);
}
