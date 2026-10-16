import { z } from "zod";

const MAX_QTY = 999_999;

/** Empty string / undefined -> null (blank preserved); numbers must be non-negative ints. */
const blankableQty = z.preprocess(
  (v) => {
    if (v === "" || v === undefined) return null;
    if (typeof v === "string" && v.trim() === "") return null;
    return v;
  },
  z.union([z.number().int().min(0).max(MAX_QTY), z.null()]),
);

export const inventoryEntrySchema = z.object({
  publicationId: z.string().min(1, "Publication is required"),
  monthId: z.string().min(1, "Month is required"),
  received: blankableQty,
  onHand: blankableQty,
});

export type InventoryEntryInput = z.infer<typeof inventoryEntrySchema>;

export const publicationSchema = z.object({
  languageCode: z.enum(["en", "tl"]),
  itemNo: z
    .string()
    .regex(/^[A-Za-z0-9.]*$/, "Item number uses letters, digits, or dots")
    .max(20)
    .nullable(),
  name: z.string().trim().min(1, "Name is required").max(200),
  code: z.string().trim().max(20).nullable(),
  categoryId: z.string().min(1).nullable(),
  sortOrder: z.number().int().min(0).max(100000),
  isActive: z.boolean(),
});

export const registrationSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(100),
    middleName: z.string().trim().max(100).optional().or(z.literal("")),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
