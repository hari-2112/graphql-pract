const authors = [
  { id: "101", name: "Hari" },
  { id: "102", name: "Apollo" },
  { id: "103", name: "John" },
];

const queue = [];

function load(id) {
  queue.push(id);
}

function batchFetch(ids) {
  console.log("One DB Query");

  return ids.map((id) =>
    authors.find((author) => author.id === id)
  );
}

// Simulate GraphQL resolvers calling load()
load("101");
load("102");
load("101");
load("103");

// Remove duplicates
const uniqueIds = [...new Set(queue)];

console.log("Queue:", queue);
console.log("Unique IDs:", uniqueIds);

// Fetch all authors in one batch
const result = batchFetch(uniqueIds);

console.log(result);