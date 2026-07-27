import { GraphQLScalarType, Kind } from "graphql";

const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",

  description: "Custom DateTime scalar",

  serialize(value) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("Invalid DateTime");
    }

    return value.toISOString();
  },

  parseValue(value) {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      throw new Error("Invalid DateTime");
    }

    return date;
  },

  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }

    return null;
  },
});

export default DateTimeScalar;