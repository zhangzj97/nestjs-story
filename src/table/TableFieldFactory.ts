import { Column } from "typeorm";

export const TableFieldFactory = {
  string: (comment: string) =>
    Column({
      type: "varchar",
      length: 255,
      nullable: false,
      comment,
    }),
  stringText: (comment: string) =>
    Column({
      type: "text",
      nullable: false,
      comment,
    }),
  stringUnique: (comment: string) =>
    Column({
      type: "varchar",
      length: 255,
      nullable: false,
      unique: true,
      comment,
    }),
  stringSecret: (comment: string) =>
    Column({
      type: "varchar",
      length: 255,
      nullable: false,
      select: false,
      comment,
    }),
  number: (comment: string) =>
    Column({
      type: "int",
      nullable: false,
      comment,
    }),
  time: (comment: string) =>
    Column({
      type: "datetime",
      nullable: false,
      comment,
    }),
  enum: (comment: string) =>
    Column({
      type: "varchar",
      length: 255,
      nullable: false,
      comment,
    }),
} as const;
