import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { connection } from "next/server";
import ws from "ws";
import * as schema from "./schema";

/**
 * WebSocket que añade las cabeceras de Cloudflare Access (token de servicio) al abrir la conexión.
 * Sin ellas el túnel responde 403. Solo funciona en el runtime Node.js (no en Edge).
 */
class WebSocketConAccess extends ws {
  constructor(url: string | URL, protocols?: string | string[]) {
    super(url, protocols, {
      headers: {
        "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID ?? "",
        "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET ?? "",
      },
    });
  }
}

neonConfig.webSocketConstructor = WebSocketConAccess as unknown as typeof WebSocket;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
// Con función, el driver NO agrega ?address=; hay que ponerlo a mano. El host de DATABASE_URL es `pg-wishlist`.
neonConfig.wsProxy = (host, port) => `db.cristiansuarez.me/v1?address=${host}:${port}`;

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Ejecuta `fn` con una conexión propia a la base y la cierra al terminar (también si falla).
 * Se crea un Pool por petición con máx. 2 conexiones: el rol `wishlist` admite 10 en total y en
 * serverless un pool global filtraría conexiones.
 * @param fn Función que recibe el cliente Drizzle.
 * @returns Lo que devuelva `fn`.
 */
export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  // Con Cache Components, el acceso a la base debe ocurrir siempre en la petición, nunca al prerenderizar en el build.
  await connection();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  const pool = new Pool({ connectionString: url, max: 2 });
  try {
    return await fn(drizzle(pool, { schema }));
  } finally {
    await pool.end();
  }
}
