const authors = [
  { id: "101", name: "Hari" },
  { id: "102", name: "Apollo" },
  { id: "103", name: "John" },
];

let queue = [];
let scheduled = false;

function batchFetch(ids) {
  console.log("One DB Query for:", ids);

  return ids.map((id) =>
    authors.find((author) => author.id === id)
  );
}

function load(id) {
  queue.push(id);

  if (!scheduled) {
    scheduled = true;

    setTimeout(() => {
      const uniqueIds = [...new Set(queue)];

      const results = batchFetch(uniqueIds);

      console.log("Results:", results);

      queue = [];
      scheduled = false;
    }, 0);
  }
}

load("101");
load("102");
load("101");
load("103");