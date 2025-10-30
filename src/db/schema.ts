import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  pgEnum,
  numeric,
  uuid,
  foreignKey,
  varchar,
} from "drizzle-orm/pg-core";


/*************************
 * ENUMS
 *************************/
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "vendor",
  "customer",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "shipped",
  "completed",
  "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash_on_delivery",
  "stripe",
  "paypal",
]);

/*************************
 * ROLES
 *************************/
export const rolesTable = pgTable("roles", {
    roleId: uuid('role_id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 40, enum: ['admin', 'vendor', 'customer'] }).notNull(),
    level: integer('level').$type<0 | 1 | 2>().default(2).unique().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/*************************
 * USERS
 *************************/
export const users = pgTable(
  "users",
  {
    userId: uuid('user_id').primaryKey().defaultRandom(),
    firstName: varchar('first_name', { length: 40 }).notNull(),
    lastName: varchar('last_name', { length: 40 }).notNull(),
    email: varchar('email', { length: 50 }).notNull().unique(),
    profilePic: varchar('profile_pic', { length: 255 }),
    password: varchar('password', { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }).unique(),
    address: text("address").notNull(),
    roleId: uuid("role_id").references(() => rolesTable.roleId, { onDelete: "cascade" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    roleUserIdx: index("role_user_idx").on(t.roleId),
  })
);

/*************************
 * VENDORS
 *************************/
export const vendors = pgTable(
  "vendors",
  {
    vendorId: uuid("vendor_id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    shopName: varchar("shop_name", { length: 100 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    vendorUserIdx: index("vendor_user_idx").on(t.userId),
  })
);

/*************************
 * BRANDS
 *************************/
export const brands = pgTable(
  "brands",
  {
    brandId: uuid("brand_id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 50 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    brandSlugUq: uniqueIndex("brands_slug_uq").on(t.slug),
  })
);

/*************************
 * CATEGORIES
 *************************/
export const categories = pgTable(
  "categories",
  {
    categoryId: uuid("category_id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 50 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    categorySlugUq: uniqueIndex("categories_slug_uq").on(t.slug),
    parentFk: foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.categoryId],
      name: "categories_parent_fk",
    }),
  })
);

/*************************
 * PRODUCTS
 *************************/
export const products = pgTable(
  "products",
  {
    productId: uuid("product_id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.vendorId, { onDelete: "cascade" }),
    brandId: uuid("brand_id").references(() => brands.brandId, { onDelete: "set null" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.categoryId, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 150 }).notNull().unique(),
    shortDescription: text("short_description"),
    description: text("description"),
    originalPrice: numeric("original_price", { precision: 10, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 5, scale: 2 }).default("0"),
    images: text("images").array(),
    tags: varchar("tags", { length: 50 }).array(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    productsSlugUq: uniqueIndex("products_slug_uq").on(t.slug),
    productByVendor: index("product_vendor_idx").on(t.vendorId),
    productByBrand: index("product_brand_idx").on(t.brandId),
    productBySlug: index("product_slug_idx").on(t.slug),
  })
);

/*************************
 * ORDERS
 *************************/
export const orders = pgTable(
  "orders",
  {
    orderId: uuid("order_id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("cash_on_delivery"),
    shippingAddress: text("shipping_address").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    orderNoUq: uniqueIndex("order_no_uq").on(t.orderNo),
    orderByUser: index("order_user_idx").on(t.userId),
  })
);

/*************************
 * ORDER ITEMS
 *************************/
export const orderItems = pgTable(
  "order_items",
  {
    orderItemId: uuid("order_item_id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.orderId, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.productId, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 10, scale: 0 }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  },
  (t) => ({
    orderItemIdx: index("order_item_order_idx").on(t.orderId),
  })
);

/*************************
 * PAYMENTS
 *************************/
export const payments = pgTable(
  "payments",
  {
    paymentId: uuid("payment_id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.orderId, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    status: paymentStatusEnum("status").default("pending"),
    transactionId: varchar("transaction_id", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    paymentOrderIdx: index("payment_order_idx").on(t.orderId),
  })
);

/*************************
 * REVIEWS
 *************************/
export const reviews = pgTable(
  "reviews",
  {
    reviewId: uuid("review_id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.productId, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    reviewProductIdx: index("review_product_idx").on(t.productId),
    reviewUserIdx: index("review_user_idx").on(t.userId),
  })
);

/*************************
 * PRODUCT QUESTIONS
 *************************/
export const productQuestions = pgTable(
  "product_questions",
  {
    productQuestionId: uuid("product_question_id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.productId, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    question: text("question").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

/*************************
 * PRODUCT ANSWERS
 *************************/
export const productAnswers = pgTable(
  "product_answers",
  {
    productAnswerId: uuid("product_answer_id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => productQuestions.productQuestionId, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.vendorId, { onDelete: "cascade" }),
    answer: text("answer").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

/*************************
 * PRODUCT SPECIFICATIONS
 *************************/
export const productSpecifications = pgTable(
  "product_specifications",
  {
    productSpecificationId: uuid("product_specification_id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.productId, { onDelete: "cascade" }),
    key: varchar("key", { length: 50 }).notNull(),
    value: varchar("value", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

/*************************
 * PRODUCT WARRANTY
 *************************/
export const productWarranty = pgTable(
  "product_warranty",
  {
    productWarrantyId: uuid("product_warranty_id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.productId, { onDelete: "cascade" }),
    warrantyPeriod: varchar("warranty_period", { length: 50 }).notNull(),
    warrantyType: varchar("warranty_type", { length: 50 }),
    details: text("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

/*************************
 * EXPORT SCHEMA
 *************************/
export const schema = {
  rolesTable,
  users,
  vendors,
  brands,
  categories,
  products,
  orders,
  orderItems,
  payments,
  reviews,
  productQuestions,
  productAnswers,
  productSpecifications,
  productWarranty,
};

/*************************
 * EXPORT TYPES
 *************************/
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;