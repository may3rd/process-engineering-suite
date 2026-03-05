import { z } from "zod"

export const calculationInputSchema = z
  .object({
    tag: z.string().min(1, "Tag / equipment number is required"),
    description: z.string().optional().default(""),
    // Add logic-specific validation fields here

    metadata: z.object({
      projectNumber: z.string().default(""),
      documentNumber: z.string().default(""),
      title: z.string().default(""),
      projectName: z.string().default(""),
      client: z.string().default(""),
    }).default({
      projectNumber: "",
      documentNumber: "",
      title: "",
      projectName: "",
      client: "",
    }),
  })
  .superRefine((data, ctx) => {
    // Add cross-field logic here
  })

export type ValidatedInput = z.infer<typeof calculationInputSchema>
