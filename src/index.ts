import { Body, Controller, Injectable, Module, Post } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import z, { ZodType } from "zod";

import { StoryTable } from "./table";
export { StoryTable } from "./table";
export { defineStory } from "./lib/defineStory";
export { defineImpl } from "./lib/defineImpl";

export namespace AppDec {
  export const module = Module;
  export const controller = Controller;
  export const post = Post;
  export const body = Body;

  export const repo = InjectRepository;
  export const impl = Injectable;

  export const table = StoryTable.Dec.table;
  export const tableField = StoryTable.Dec.tableField;
}

export namespace AppModel {
  export type byIdM1 = { id: string };

  export type getM1<_T> = byIdM1;
  export type getM2<T> = T;
  export type listM1<_T> = {
    page?: number;
    pageSize?: number;
    order?: Record<string, "asc" | "desc">;
    where?: Record<string, unknown>;
  };
  export type listM2<T> = {
    page: number;
    pageSize: number;
    order?: Record<string, "asc" | "desc">;
    ids?: string[];
    where?: Record<string, unknown>;

    total: number;
    list: T[];
  };
  export type createM1<T> = {} & T;
  export type createM2<_T> = {
    id: string;
  };
  export type updateM1<T> = byIdM1 & {
    updateTime: Date;
  } & T;
  export type updateM2<_T> = {};
  export type deleteM1<_T> = byIdM1;
  export type deleteM2<_T> = {};
}

export namespace AppValidator {
  export const byIdM1 = <T extends ZodType>(data: unknown, validator2: T | null = null) => {
    z.object({
      id: z.string({}),
    }).parse(data);
    validator2?.parse(data);
  };

  export const getM1 = <T extends ZodType>(data: unknown, validator2: T | null = null) => {
    byIdM1(data);
    validator2?.parse(data);
  };

  export const listM1 = <T extends ZodType>(data: unknown, validator2: T | null = null) => {
    z.object({
      page: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(1).max(1000).optional(),
      orderField: z
        .object({
          field: z.string(),
          type: z.enum(["asc", "desc"]),
        })
        .optional(),
      order: z.record(z.string(), z.enum(["asc", "desc"])).optional(),
      ids: z.array(z.string()).optional(),
      where: validator2 ?? z.object({}),
    }).parse(data);
  };

  export const createM1 = <T extends ZodType>(data: unknown, validator2: T | null = null) => {
    validator2?.parse(data);
  };

  export const updateM1 = <T extends ZodType>(data: unknown, validator2: T | null = null) => {
    byIdM1(data, z.object({}));
    z.object({
      updateTime: z.coerce.date(),
    }).parse(data);
    validator2?.parse(data);
  };

  export const deleteM1 = <T extends ZodType>(data: unknown, validator2: T | null = null) => {
    byIdM1(data);
    validator2?.parse(data);
  };
}
