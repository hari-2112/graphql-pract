import pubsub from "../pubsub/pubsub.js";

const Subscription = {
  bookAdded: {
    subscribe: () => {
      

      return pubsub.asyncIterableIterator("BOOK_ADDED");
    },

  },
};

export default Subscription;