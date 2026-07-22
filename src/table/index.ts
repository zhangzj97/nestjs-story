import { Column, Entity } from "typeorm";

import { Story } from "../lib/defineStory";
import { MapStrategy } from "../lib/MapStrategy";
import { TableFieldFactory } from "./TableFieldFactory";

export namespace StoryTable {
  export namespace Dec {
    export const tableField = (config: Story["tableList"][number]["fieldList"][number]) => {
      const fieldStrategy = new MapStrategy(TableFieldFactory);
      fieldStrategy.setCode(config.strategy);
      return fieldStrategy.getValue();
    };
    export const table = Entity;
  }

  export namespace Parent {
    export abstract class empty {}

    export abstract class base extends empty {
      @Column({
        type: "varchar",
        length: 255,
        nullable: false,
        primary: true,
        comment: "主键",
      })
      id!: string;

      @Column({
        type: "datetime",
        nullable: false,
        update: false,
        comment: "创建时间",
      })
      createTime!: Date;

      @Column({
        type: "datetime",
        nullable: false,
        comment: "更新时间",
      })
      updateTime!: Date;

      @Column({
        type: "varchar",
        length: 255,
        nullable: false,
        update: false,
        comment: "创建人ID",
      })
      createUserId!: string;

      @Column({
        type: "varchar",
        length: 255,
        nullable: false,
        comment: "更新人ID",
      })
      updateUserId!: string;
    }

    export abstract class tenant extends base {
      @Column({
        type: "varchar",
        length: 255,
        nullable: false,
        update: false,
        comment: "租户Id",
      })
      tenantId!: string;
    }
  }
}
