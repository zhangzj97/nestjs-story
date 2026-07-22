type CodeEntity<T> = {
  code: string;
  title: string;
} & T;

/**
 * 基础规则
 * 1. code 都是 小驼峰
 *    - story code
 *    - table code
 *    - action code 点分割  user.getUserinfo
 *    - model code 点分割 user.userinfo
 * 2. table 会派生出 action, 策略基于脚本, 所以基础crud 不需要生成 action
 * 3. 如果基础crud不够用, 那么就需要 生成action
 *    - 基于安全策略 userCrud.get => user.getUserinfo
 * 4. 如果 model.dto 和 model.vo 存在复制或者复用的字段 那么放到 modelList
 *
 * 5. tsType 作为兜底, 一般是 type的值, 而不是 class 语法
 *    - 转发(fieldList无作用): _.byIdDto
 *    - 泛型(脚本会把 T 改为 fieldList): _.listVo<T>
 *    - 禁止类型交叉: T & { xxx: string } => 应该设计成 fieldList
 *
 * 99. 存在 更高等级的 model, 由脚本处理, 只做 tsType 引用
 */
export type Story = CodeEntity<{
  version: "0.0.1";

  /**
   * [脚本]会基于 table 派生出相应的 Action: {code}Crud/* 与相应的 Model
   * 如果需要特殊的 Crud 才考虑
   */
  tableList: CodeEntity<{
    strategy: // 思路中转
      | "empty" // 空 (禁止使用)
      | "base" // 基础的审计字段 (明确不需要租户的情况使用)
      | "tenant"; // 基础 + 租户 (一般情况使用)
    fieldList: CodeEntity<{
      strategy: // 思路中转
        | "string" // string 没有其他配置
        | "stringText" // string 需要长文本
        | "stringUnique" // string 唯一
        | "stringSecret" // string 敏感
        | "number" // 天然排序 可计算性
        | "time" // 天然排序 时间性
        | "enum"; // 枚举
      enumList: string[];
    }>[];
  }>[];
  svcList: CodeEntity<{
    path: string;
  }>[];

  /**
   * [AI生成]对应的 model
   * 1. {code}Dto
   * 2. {code}Vo
   */
  actionList: CodeEntity<{}>[];

  /**
   * 1. 特别复杂的 model
   */
  modelList: CodeEntity<{
    typeText: string;

    fieldList: CodeEntity<{
      typeText: string;
      optional: boolean;
    }>[];
  }>[];
}>;

class StoryService {
  private code: string;
  private title: string;
  private version: "0.0.1";
  private svcMap = new Map<string, Story["svcList"][number]>();
  private actionMap = new Map<string, Story["actionList"][number]>();
  private tableMap = new Map<string, Story["tableList"][number]>();
  private tableFieldCodeMap = new Map<string, { list: string[] }>();
  private tableFieldMap = new Map<string, Story["tableList"][number]["fieldList"][number]>();
  private modelMap = new Map<string, Story["modelList"][number]>();
  private modeFieldCodeMap = new Map<string, { list: string[] }>();
  private modelFieldMap = new Map<string, Story["modelList"][number]["fieldList"][number]>();

  private crudActionList = ["get", "list", "create", "update", "delete"];

  constructor(story: Story) {
    this.code = story.code;
    this.title = story.title;
    this.version = story.version;

    story.tableList.forEach((table) => {
      this.table(table);
      table.fieldList.forEach((field) => {
        this.tableField(table, field);
      });
    });

    story.modelList.forEach((model) => {
      this.model(model);
      model.fieldList.forEach((field) => {
        this.modelField(model, field);
      });
    });

    story.actionList.forEach((action) => {
      this.action(action);
    });

    story.svcList.forEach((svc) => {
      this.svc(svc);
    });
  }

  private table(
    table: Story["tableList"][number], //
  ): void {
    this.tableMap.set(table.code, table);

    const serviceCode = `${table.code}Crud`;

    const crudFieldListMap: Record<string, Omit<Story["modelList"][number], "code" | "title">> = {
      getM1: {
        typeText: "AppModel.getM1<T>",
        fieldList: [],
      },
      getM2: {
        typeText: `AppModel.getM2<${serviceCode}.entity>`,
        fieldList: [],
      },
      listM1: {
        typeText: "AppModel.listM1<T>",
        fieldList: [],
      },
      listM2: {
        typeText: `AppModel.listM2<${serviceCode}.entity>`,
        fieldList: [],
      },
      createM1: {
        typeText: `AppModel.createM1<T>`,
        fieldList: table.fieldList.map((field) => {
          const typeText = ((table, field) => {
            if (field.strategy === `string`) return `string`;
            if (field.strategy === `stringSecret`) return `string`;
            if (field.strategy === `stringUnique`) return `string`;
            if (field.strategy === `stringText`) return `string`;
            if (field.strategy === `number`) return `number`;
            if (field.strategy === `time`) return `Date`;
            if (field.strategy === `enum`) return field.enumList.map((i2) => `"${i2}"`).join(`|`);
            throw new Error(`typeText 配置错误: ${table.code} : ${field.code}`);
          })(table, field);

          return {
            code: field.code,
            title: field.title,
            optional: false,
            typeText,
          };
        }),
      },
      createM2: {
        typeText: "AppModel.createM2<T>",
        fieldList: [],
      },
      updateM1: {
        typeText: "AppModel.updateM1<T>",
        fieldList: table.fieldList.map((field) => {
          const typeText = ((_table, field) => {
            if (field.strategy === `string`) return `string`;
            if (field.strategy === `stringSecret`) return `string`;
            if (field.strategy === `stringUnique`) return `string`;
            if (field.strategy === `stringText`) return `string`;
            if (field.strategy === `number`) return `number`;
            if (field.strategy === `time`) return `Date`;
            if (field.strategy === `enum`) return field.enumList.map((i2) => `"${i2}"`).join(`|`);
            throw new Error(`typeText 配置错误: ${table.code} : ${field.code}`);
          })(table, field);

          return {
            code: field.code,
            title: field.title,
            optional: true,
            typeText,
          };
        }),
      },
      updateM2: {
        typeText: `AppModel.updateM2<T>`,
        fieldList: [],
      },
      deleteM1: {
        typeText: `AppModel.deleteM1<T>`,
        fieldList: [],
      },
      deleteM2: {
        typeText: `AppModel.deleteM2<T>`,
        fieldList: [],
      },
    };

    this.modelMap.set(`${serviceCode}.entity`, {
      code: `${serviceCode}.entity`,
      title: `${serviceCode}.entity`,
      typeText: "",
      fieldList: table.fieldList.map((field) => {
        const typeText = ((_table, field) => {
          if (field.strategy === `string`) return `string`;
          if (field.strategy === `stringSecret`) return `string`;
          if (field.strategy === `stringUnique`) return `string`;
          if (field.strategy === `stringText`) return `string`;
          if (field.strategy === `number`) return `number`;
          if (field.strategy === `time`) return `Date`;
          if (field.strategy === `enum`) return field.enumList.map((i2) => `"${i2}"`).join(`|`);
          throw new Error(`typeText 配置错误: ${table.code} : ${field.code}`);
        })(table, field);

        return {
          code: field.code,
          title: field.title,
          optional: false,
          typeText,
        };
      }),
    });
    // 不应该存在
    this.crudActionList.forEach((i) => {
      if (this.actionMap.has(`${serviceCode}.${i}`))
        throw new Error(`Action: ${serviceCode}.${i}: 不应该存在`);
      if (this.modelMap.has(`${serviceCode}.${i}M1`))
        throw new Error(`Model: ${serviceCode}.${i}M1: 不应该存在`);
      if (this.modelMap.has(`${serviceCode}.${i}M2`))
        throw new Error(`Model: ${serviceCode}.${i}M2: 不应该存在`);
    });

    this.crudActionList.forEach((i) => {
      this.actionMap.set(`${serviceCode}.${i}`, {
        code: `${serviceCode}.${i}`,
        title: `${serviceCode}.${i}`,
      });
      this.modelMap.set(`${serviceCode}.${i}M1`, {
        code: `${serviceCode}.${i}M1`,
        title: `${serviceCode}.${i}M1`,
        ...crudFieldListMap[`${i}M1`],
      });
      this.modelMap.set(`${serviceCode}.${i}M2`, {
        code: `${serviceCode}.${i}M2`,
        title: `${serviceCode}.${i}M2`,
        ...crudFieldListMap[`${i}M2`],
      });
    });
  }
  private tableField(
    table: Story["tableList"][number], //
    field: Story["tableList"][number]["fieldList"][number], //
  ): void {
    this.tableFieldMap.set(`${table.code}#${field.code}`, field);
  }
  private action(
    action: Story["actionList"][number], //
  ): void {
    this.actionMap.set(action.code, action);
  }
  private model(
    model: Story["modelList"][number], //
  ): void {
    this.modelMap.set(model.code, model);
  }
  private modelField(
    model: Story["modelList"][number], //
    field: Story["modelList"][number]["fieldList"][number], //
  ): void {
    this.modelFieldMap.set(`${model.code}#${field.code}`, field);
  }
  private svc(
    svc: Story["svcList"][number], //
  ): void {
    this.svcMap.set(svc.code, svc);
  }

  getStory(): Story {
    return {
      code: this.code,
      title: this.title,
      version: this.version,
      svcList: Array.from(this.svcMap.values()),
      tableList: Array.from(this.tableMap.values()),
      actionList: Array.from(this.actionMap.values()),
      modelList: Array.from(this.modelMap.values()),
    };
  }
}

export const defineStory = (story: Story) => {
  return new StoryService(story).getStory();
};
