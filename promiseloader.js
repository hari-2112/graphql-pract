const authors = [
  { id: "101", name: "Hari" },
  { id: "102", name: "Apollo" },
  { id: "103", name: "John" },
];

function load(id) {
  return new Promise((resolve) => {
    console.log("Received request:", id);

    setTimeout(() => {
      const author = authors.find((a) => a.id === id);
      resolve(author);
    }, 1000);
  });
}

async function test() {
  const author = await load("101");
  console.log(author);
}

test();