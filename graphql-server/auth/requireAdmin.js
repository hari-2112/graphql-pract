export default function requireAdmin(context) {
  if (!context.user) {
    throw new Error("Not authenticated");
  }

  if (context.user.role !== "ADMIN") {
    throw new Error("Access denied");
  }
}