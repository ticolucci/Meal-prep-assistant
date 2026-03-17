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
  prepMinutes: integer("prep_minutes"), // nullable — populated by AI parser or user
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

export const mealPlans = sqliteTable("meal_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status").notNull().default("draft"), // 'draft' | 'approved'
  mealCount: integer("meal_count").notNull(),
  params: text("params").notNull().default("{}"), // JSON of PlanParams
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const mealPlanRecipes = sqliteTable("meal_plan_recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id")
    .notNull()
    .references(() => mealPlans.id, { onDelete: "cascade" }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
});

export const pantryItems = sqliteTable("pantry_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const shoppingListExtra = sqliteTable("shopping_list_extra", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  checked: integer("checked").notNull().default(0), // 0 | 1 (SQLite boolean)
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const prepSessions = sqliteTable("prep_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // ISO date string, e.g. "2026-03-17"
  label: text("label").notNull().default("Prep Session"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const prepSessionTasks = sqliteTable("prep_session_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => prepSessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  prep: text("prep").notNull(),
  totalAmount: real("total_amount"), // null if unit mismatch or all amounts null
  unit: text("unit"),
  unitMismatch: integer("unit_mismatch").notNull().default(0), // 0 | 1
  prepSafe: integer("prep_safe").notNull().default(0), // 0 | 1
  recipeCount: integer("recipe_count").notNull().default(0),
  recipeIds: text("recipe_ids").notNull().default("[]"), // JSON array of recipe IDs
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type NewRecipeIngredient = typeof recipeIngredients.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;
export type NewMealPlan = typeof mealPlans.$inferInsert;
export type MealPlanRecipe = typeof mealPlanRecipes.$inferSelect;
export type PantryItem = typeof pantryItems.$inferSelect;
export type NewPantryItem = typeof pantryItems.$inferInsert;
export type ShoppingExtra = typeof shoppingListExtra.$inferSelect;
export type NewShoppingExtra = typeof shoppingListExtra.$inferInsert;
export type NewMealPlanRecipe = typeof mealPlanRecipes.$inferInsert;
export type PrepSession = typeof prepSessions.$inferSelect;
export type NewPrepSession = typeof prepSessions.$inferInsert;
export type PrepSessionTask = typeof prepSessionTasks.$inferSelect;
export type NewPrepSessionTask = typeof prepSessionTasks.$inferInsert;
