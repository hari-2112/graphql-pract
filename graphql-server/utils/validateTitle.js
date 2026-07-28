export default function validateTitle(title) {
  if (!title.trim()) {
    throw new Error("Title cannot be empty");
  }
}