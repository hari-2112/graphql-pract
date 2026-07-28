import { ApolloServer } from "@apollo/server";
import {
  ApolloServerPluginDrainHttpServer,
} from "@apollo/server/plugin/drainHttpServer";

import {
  ApolloServerPluginLandingPageLocalDefault,
} from "@apollo/server/plugin/landingPage/default";


export function createApolloServer({ schema, httpServer, getServerCleanup }) {
  return new ApolloServer({
    schema,

    plugins: [
      ApolloServerPluginDrainHttpServer({
        httpServer,
      }),

      ApolloServerPluginLandingPageLocalDefault({
        embed: true,
      }),

      {
        async serverWillStart() {
          return {
            async drainServer() {
              const serverCleanup = getServerCleanup();

              if (serverCleanup) {
                await serverCleanup.dispose();
              }
            },
          };
        },
      },
    ],
  });
}