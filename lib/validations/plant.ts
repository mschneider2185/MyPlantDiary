import { z } from "zod";

export const newPlantSchema = z.object({
  image_url: z.string().url().optional(),
  species_id: z.string().uuid().optional(),
  nickname: z.string().min(1).max(60).optional(),
});
