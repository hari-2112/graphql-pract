import { makeExecutableSchema } from "@graphql-tools/schema";
import typeDefs from "./typeDefs.js";
import resolvers from "../resolvers/index.js";

export function createSchema() {
  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
}