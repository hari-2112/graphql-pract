import DateTimeScalar from "../scalars/dateTime.js";
import Query from "./query.js";
import Mutation from "./mutation.js";
import Subscription from "./subscription.js";
import Book from "./book.js";
import SearchItem from "./searchItem.js";
import LoginResult from "./loginResult.js";

const resolvers = {
  DateTime: DateTimeScalar,
  Query,
  Mutation,
  Subscription,
  Book,
  SearchItem,
  LoginResult,
};

export default resolvers;