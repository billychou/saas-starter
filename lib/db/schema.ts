import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
  creditBalance: integer('credit_balance').notNull().default(0),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const aiModels = pgTable('ai_models', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull().default('bailian'),
  modelId: varchar('model_id', { length: 100 }).notNull(),
  apiKey: text('api_key'),
  apiBase: text('api_base'),
  sizes: json('sizes').$type<string[]>().notNull().default(['1024*1024']),
  maxImages: integer('max_images').notNull().default(4),
  creditCost: integer('credit_cost').notNull().default(1),
  enabled: boolean('enabled').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const generations = pgTable('generations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  aiModelId: integer('ai_model_id').references(() => aiModels.id),
  modelName: varchar('model_name', { length: 100 }).notNull(),
  modelId: varchar('model_id', { length: 100 }).notNull(),
  prompt: text('prompt').notNull(),
  negativePrompt: text('negative_prompt'),
  size: varchar('size', { length: 20 }).notNull(),
  imageCount: integer('image_count').notNull().default(1),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  taskRef: text('task_ref'),
  creditsUsed: integer('credits_used').notNull().default(0),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const generationImages = pgTable('generation_images', {
  id: serial('id').primaryKey(),
  generationId: integer('generation_id')
    .notNull()
    .references(() => generations.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  localPath: text('local_path'),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const creditTransactions = pgTable('credit_transactions', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  amount: integer('amount').notNull(),
  reason: varchar('reason', { length: 30 }).notNull(),
  generationId: integer('generation_id').references(() => generations.id),
  stripeSessionId: text('stripe_session_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  generations: many(generations),
  creditTransactions: many(creditTransactions),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const aiModelsRelations = relations(aiModels, ({ many }) => ({
  generations: many(generations),
}));

export const generationsRelations = relations(generations, ({ one, many }) => ({
  team: one(teams, {
    fields: [generations.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [generations.userId],
    references: [users.id],
  }),
  aiModel: one(aiModels, {
    fields: [generations.aiModelId],
    references: [aiModels.id],
  }),
  images: many(generationImages),
}));

export const generationImagesRelations = relations(
  generationImages,
  ({ one }) => ({
    generation: one(generations, {
      fields: [generationImages.generationId],
      references: [generations.id],
    }),
  })
);

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    team: one(teams, {
      fields: [creditTransactions.teamId],
      references: [teams.id],
    }),
    user: one(users, {
      fields: [creditTransactions.userId],
      references: [users.id],
    }),
    generation: one(generations, {
      fields: [creditTransactions.generationId],
      references: [generations.id],
    }),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type AiModel = typeof aiModels.$inferSelect;
export type NewAiModel = typeof aiModels.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type GenerationImage = typeof generationImages.$inferSelect;
export type NewGenerationImage = typeof generationImages.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;
export type GenerationStatus = 'pending' | 'running' | 'succeeded' | 'failed';
export type CreditReason =
  | 'generation'
  | 'purchase'
  | 'signup_bonus'
  | 'refund'
  | 'admin_adjust';
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
  IMAGE_GENERATED = 'IMAGE_GENERATED',
}
