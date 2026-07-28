const SearchItem = {
  __resolveType(obj) {
    if ("authorId" in obj) {
      return "Book";
    }

    if ("duration" in obj) {
      return "Movie";
    }

    return null;
  },
};

export default SearchItem;