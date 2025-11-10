import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  numeric,
  varchar,
} from "drizzle-orm/pg-core";

const subscriptionStatusEnum = ["inactive", "trial", "active", "expired", "canceled"] as const;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneNumber: text("phone_number"),
  birthDate: varchar("birth_date", { length: 32 }),
  provider: text("provider").notNull().default("email"),
  isPremium: boolean("is_premium").notNull().default(false),
  subscriptionStatus: varchar("subscription_status", { length: 16 })
    .notNull()
    .default(subscriptionStatusEnum[0]),
  dietaryPreferences: jsonb("dietary_preferences"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const menuPlans = pgTable("menu_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  weekStartDate: timestamp("week_start_date", { withTimezone: true }).notNull(),
  preferences: jsonb("preferences"),
  generationMethod: varchar("generation_method", { length: 16 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MenuPlan = typeof menuPlans.$inferSelect;
export type NewMenuPlan = typeof menuPlans.$inferInsert;

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuPlanId: uuid("menu_plan_id").references(() => menuPlans.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week"),
  mealType: varchar("meal_type", { length: 32 }),
  name: text("name").notNull(),
  description: text("description"),
  ingredients: jsonb("ingredients"),
  instructions: jsonb("instructions"),
  nutritionInfo: jsonb("nutrition_info"),
  cookingTime: integer("cooking_time"),
  servings: integer("servings"),
  imageUrl: text("image_url"),
  difficulty: varchar("difficulty", { length: 16 }),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export const shoppingLists = pgTable("shopping_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuPlanId: uuid("menu_plan_id")
    .notNull()
    .references(() => menuPlans.id, { onDelete: "cascade" }),
  items: jsonb("items").notNull(),
  totalEstimatedCost: numeric("total_estimated_cost", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ShoppingList = typeof shoppingLists.$inferSelect;
export type NewShoppingList = typeof shoppingLists.$inferInsert;

export const menuGenerationLimits = pgTable("menu_generation_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),
  generationCount: integer("generation_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MenuGenerationLimit = typeof menuGenerationLimits.$inferSelect;
export type NewMenuGenerationLimit = typeof menuGenerationLimits.$inferInsert;

export const recipeLibrary = pgTable("recipe_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  mealType: varchar("meal_type", { length: 32 }),
  cuisine: varchar("cuisine", { length: 64 }),
  servings: integer("servings"),
  cookingTime: integer("cooking_time"),
  difficulty: varchar("difficulty", { length: 16 }),
  ingredients: jsonb("ingredients"),
  instructions: jsonb("instructions"),
  nutritionInfo: jsonb("nutrition_info"),
  dietaryTags: text("dietary_tags").array(),
  allergens: text("allergens").array(),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RecipeLibraryEntry = typeof recipeLibrary.$inferSelect;
export type NewRecipeLibraryEntry = typeof recipeLibrary.$inferInsert;

export const recipeFavorites = pgTable("recipe_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipeLibrary.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RecipeFavorite = typeof recipeFavorites.$inferSelect;
export type NewRecipeFavorite = typeof recipeFavorites.$inferInsert;

export const userStats = pgTable("user_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  menusGenerated: integer("menus_generated").notNull().default(0),
  recipesCooked: integer("recipes_cooked").notNull().default(0),
  shoppingListsCompleted: integer("shopping_lists_completed").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  experiencePoints: integer("experience_points").notNull().default(0),
  level: integer("level").notNull().default(1),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserStats = typeof userStats.$inferSelect;
export type NewUserStats = typeof userStats.$inferInsert;

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 64 }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  progress: integer("progress").default(0),
  target: integer("target"),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;

export const googlePlayPurchases = pgTable("google_play_purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull().unique(),
  productId: text("product_id").notNull(),
  purchaseToken: text("purchase_token").notNull(),
  purchaseTime: timestamp("purchase_time", { withTimezone: true }),
  expiryTime: timestamp("expiry_time", { withTimezone: true }),
  autoRenewing: boolean("auto_renewing").notNull().default(true),
  cancelReason: text("cancel_reason"),
  isValid: boolean("is_valid").notNull().default(true),
  originalJson: text("original_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GooglePlayPurchase = typeof googlePlayPurchases.$inferSelect;
export type NewGooglePlayPurchase = typeof googlePlayPurchases.$inferInsert;

export const schema = {
  users,
  menuPlans,
  recipes,
  shoppingLists,
  menuGenerationLimits,
  recipeLibrary,
  recipeFavorites,
  userStats,
  achievements,
  googlePlayPurchases,
};
