const typeDefs = `#graphql

scalar DateTime

enum Role {
  ADMIN
  USER
}

type User {
  id: ID!
  username: String!
  role: Role!
}

type Movie {
  id: ID!
  title: String!
  duration: Int!
}
  
type LoginSuccess {
  token: String!
  refreshToken: String!
  user: User!
}

type AuthError {
  message: String!
}
union LoginResult = LoginSuccess | AuthError

interface SearchItem {
  id: ID!
  title: String!
}

type Query {
  books: [Book!]!
  movies: [Movie!]!
  currentTime: DateTime!
  search: [SearchItem!]!
  me: User
}
input AddBookInput {
  title: String!
  authorId: ID!
}

type Mutation {
  addBook(input: AddBookInput!): Book!
  updateBook(id: ID!, title: String!): Book!
  deleteBook(id: ID!): Book!
  login(username: String!, password: String!): LoginResult!
  register(username: String!, password: String!): LoginResult!
}

type Subscription {
  bookAdded: Book!
}

type Book implements SearchItem {
  id: ID!
  title: String!
  author: Author!
}

type Movie implements SearchItem {
  id: ID!
  title: String!
  duration: Int!
}

type Author {
  id: ID!
  name: String!
}
`;

export default typeDefs;