import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id").unique(), // TheMealDB idMeal, or null for manual
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  instructions: text("instructions"),
  prepSteps: text("prep_steps"), // JSON array of prep step strings
  activeSteps: text("active_steps"), // JSON array of active cooking step strings
  source: text("source").notNull().default("manual"), // 'themealdb' | 'manual' | 'ai'
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  measure: text("measure"), // raw measure string from TheMealDB, e.g. "3/4 cup"
  // Normalized fields to be populated by story_01 (AI parser)
  amount: real("amount"),
  unit: text("unit"),
  prep: text("prep"),
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type NewRecipeIngredient = typeof recipeIngredients.$inferInsert;
