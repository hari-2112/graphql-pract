import DataLoader from "dataloader";
import authors from "../data/authors.js";

export default function createAuthorLoader() {
  return new DataLoader(async (authorIds) => {
    return authorIds.map((id) =>
      authors.find((author) => author.id === id)
    );
  });
}