import { Session } from "@shopify/shopify-api";
import { prisma } from "./db.server";

// Custom Prisma-backed session storage compatible with @shopify/shopify-app-remix
export class PrismaSessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    try {
      await prisma.session.upsert({
        where: { id: session.id },
        update: {
          shop: session.shop,
          state: session.state,
          isOnline: session.isOnline,
          scope: session.scope,
          expires: session.expires,
          accessToken: session.accessToken ?? "",
          userId: session.onlineAccessInfo?.associated_user?.id
            ? BigInt(session.onlineAccessInfo.associated_user.id)
            : null,
          firstName: session.onlineAccessInfo?.associated_user?.first_name ?? null,
          lastName: session.onlineAccessInfo?.associated_user?.last_name ?? null,
          email: session.onlineAccessInfo?.associated_user?.email ?? null,
          accountOwner: session.onlineAccessInfo?.associated_user?.account_owner ?? false,
          locale: session.onlineAccessInfo?.associated_user?.locale ?? null,
          collaborator: session.onlineAccessInfo?.associated_user?.collaborator ?? false,
          emailVerified: session.onlineAccessInfo?.associated_user?.email_verified ?? false,
        },
        create: {
          id: session.id,
          shop: session.shop,
          state: session.state,
          isOnline: session.isOnline,
          scope: session.scope,
          expires: session.expires,
          accessToken: session.accessToken ?? "",
          userId: session.onlineAccessInfo?.associated_user?.id
            ? BigInt(session.onlineAccessInfo.associated_user.id)
            : null,
          firstName: session.onlineAccessInfo?.associated_user?.first_name ?? null,
          lastName: session.onlineAccessInfo?.associated_user?.last_name ?? null,
          email: session.onlineAccessInfo?.associated_user?.email ?? null,
          accountOwner: session.onlineAccessInfo?.associated_user?.account_owner ?? false,
          locale: session.onlineAccessInfo?.associated_user?.locale ?? null,
          collaborator: session.onlineAccessInfo?.associated_user?.collaborator ?? false,
          emailVerified: session.onlineAccessInfo?.associated_user?.email_verified ?? false,
        },
      });
      return true;
    } catch (error) {
      console.error("Failed to store session:", error);
      return false;
    }
  }

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      const row = await prisma.session.findUnique({ where: { id } });
      if (!row) return undefined;

      const session = new Session({
        id: row.id,
        shop: row.shop,
        state: row.state,
        isOnline: row.isOnline,
      });

      session.scope = row.scope ?? undefined;
      session.expires = row.expires ?? undefined;
      session.accessToken = row.accessToken ?? "";

      return session;
    } catch (error) {
      console.error("Failed to load session:", error);
      return undefined;
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      await prisma.session.deleteMany({ where: { id } });
      return true;
    } catch (error) {
      console.error("Failed to delete session:", error);
      return false;
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      await prisma.session.deleteMany({ where: { id: { in: ids } } });
      return true;
    } catch (error) {
      console.error("Failed to delete sessions:", error);
      return false;
    }
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    try {
      const rows = await prisma.session.findMany({ where: { shop } });
      return rows.map((row) => {
        const session = new Session({
          id: row.id,
          shop: row.shop,
          state: row.state,
          isOnline: row.isOnline,
        });
        session.scope = row.scope ?? undefined;
        session.expires = row.expires ?? undefined;
        session.accessToken = row.accessToken ?? "";
        return session;
      });
    } catch (error) {
      console.error("Failed to find sessions by shop:", error);
      return [];
    }
  }
}
