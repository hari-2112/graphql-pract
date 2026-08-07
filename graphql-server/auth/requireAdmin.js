import { unauthenticated, forbidden } from "../utils/errors.js";

export default function requireAdmin(context) {
  if (!context.user) {
    unauthenticated();
  }

  if (context.user.role !== "ADMIN") {
    forbidden("Admin access required");
  }
}