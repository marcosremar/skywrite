ALTER TABLE "User"
  DROP COLUMN "subscriptionStatus",
  DROP COLUMN "monthlyBuilds",
  DROP COLUMN "monthlyBuildsReset",
  DROP COLUMN "storageUsedBytes";

ALTER TABLE "Template"
  DROP COLUMN "thumbnail",
  DROP COLUMN "isPublic",
  DROP COLUMN "downloads";

DROP TYPE "SubscriptionStatus";
