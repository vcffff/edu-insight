import { createApiProvider } from "./api-provider";
import { mockProvider } from "./mock-provider";
import type { DataSource, Repository } from "./types";
export const apiProvider = createApiProvider(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");
export function getRepository(source: DataSource): Repository {
  return source === "mock" ? mockProvider : apiProvider;
}
export const sourceKey = (source: DataSource, ...parts: unknown[]) =>
  ["source", source, ...parts] as const;
