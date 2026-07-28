const Book = {
  author: (book, _, context) => {
    console.log("Author resolver executed");
    return context.authorLoader.load(book.authorId);
  },
};

export default Book;