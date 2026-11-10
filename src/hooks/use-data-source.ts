"use client";
import { useContext } from "react";
import { DataSourceContext } from "@/providers/data-source-provider";
export function useDataSource() {
  const value = useContext(DataSourceContext);
  if (!value) throw new Error("useDataSource requires DataSourceProvider");
  return value;
}
