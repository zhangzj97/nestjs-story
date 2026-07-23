import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path/posix";
import { pathToFileURL } from "node:url";

import { joinText } from "@zzj/ts-utils";

import { Story } from "./lib/defineStory";

const [_1, _2, rootDirPath] = process.argv;

const main = async (rootDirPath: string) => {
  const path = join(rootDirPath, ".story.ts");
  const data: Story = (await import(pathToFileURL(path).href)).default;

  writeFileSync(join(rootDirPath, `.story.dist.json`), JSON.stringify(data));

  const service1 = new StoryServiceImpl0(data);
  const service2 = new StoryServiceImpl1(data, { code: "" });

  writeFileSync(join(rootDirPath, `src/app/story`, `_.111.ts`), service1.getText());
  writeFileSync(join(rootDirPath, `src/app/story`, `_.222.ts`), service2.getText1());

  (() => {
    data.svcList.forEach((svc) => {
      const data2: Story = JSON.parse(
        readFileSync(join(rootDirPath, svc.path, `.story.dist.json`), `utf-8`),
      );
      data2.svcList = [];
      const service1 = new StoryServiceImpl0(data2);
      const service2 = new StoryServiceImpl1(data2, { code: `api.${svc.code}` });
      writeFileSync(
        join(rootDirPath, `src/app/story`, `_.111.api.${svc.code}.ts`),
        service1.getText(),
      );
      writeFileSync(
        join(rootDirPath, `src/app/story`, `_.222.api.${svc.code}.ts`),
        service2.getText2(),
      );
    });
  })();

  (() => {
    mkdirSync(join(rootDirPath, `src`, `_`));

    // 清空
    readdirSync(join(rootDirPath, `src`, `_`)).forEach((i) => {
      if (statSync(join(rootDirPath, `src`, `_`, i)).isFile()) rmSync(join(rootDirPath, `src`, i));
    });

    writeFileSync(join(rootDirPath, `src`, `_`, `.crud`), "");

    const joinPresetImplTx = (action: Story["actionList"][number]) => {
      const template = {
        other: (action: Story["actionList"][number]) => {
          return joinText(
            `export default Define["${action.code}"](async (_dto, _provider) => {`,
            `  return {};`,
            `});`,
          );
        },
        get: (action: Story["actionList"][number]) => {
          const [code1, code2] = action.code.split(".");
          const repoCode = code1.replace("Crud", "");
          return joinText(
            `export default Define["${code1}.${code2}"](async (dto, provider) => {`,
            `  return await provider.repo.${repoCode}.findOneByOrFail(dto);`,
            `});`,
          );
        },
        list: (action: Story["actionList"][number]) => {
          const [code1, code2] = action.code.split(".");
          const repoCode = code1.replace("Crud", "");
          return joinText(
            `export default Define["${code1}.${code2}"](async (dto, provider) => {`,
            `  const { page = 1, pageSize = 20, order } = dto;`,
            `  const [list, total] = await provider.repo.${repoCode}.findAndCount({`,
            `    where: dto.where,`,
            `    order,`,
            `    skip: (page - 1) * pageSize,`,
            `    take: pageSize,`,
            `  });`,
            `  return { page, pageSize, list, total };`,
            `});`,
          );
        },
        create: (action: Story["actionList"][number]) => {
          const [code1, code2] = action.code.split(".");
          const repoCode = code1.replace("Crud", "");
          return joinText(
            `import { genId } from "@zzj/ts-utils";`,
            ``,
            `export default Define["${code1}.${code2}"](async (dto, provider) => {`,
            `  const id = genId();`,
            `  await provider.repo.${repoCode}.insert({ ...dto, id });`,
            `  return { id };`,
            `});`,
          );
        },
        update: (action: Story["actionList"][number]) => {
          const [code1, code2] = action.code.split(".");
          const repoCode = code1.replace("Crud", "");
          return joinText(
            `export default Define["${code1}.${code2}"](async (dto, provider) => {`,
            ` const { id, updateTime, ...data } = dto;`,
            ` await provider.repo.${repoCode}.update({ id, updateTime }, data);`,
            ` return {};`,
            `});`,
          );
        },
        delete: (action: Story["actionList"][number]) => {
          const [code1, code2] = action.code.split(".");
          const repoCode = code1.replace("Crud", "");
          return joinText(
            `export default Define["${code1}.${code2}"](async (dto, provider) => {`,
            `  await provider.repo.${repoCode}.delete(dto);`,
            `  return {};`,
            `});`,
          );
        },
      };

      if (/Crud\.get/.test(action.code)) return template.get(action);
      if (/Crud\.list/.test(action.code)) return template.list(action);
      if (/Crud\.create/.test(action.code)) return template.create(action);
      if (/Crud\.update/.test(action.code)) return template.update(action);
      if (/Crud\.delete/.test(action.code)) return template.delete(action);

      return template.other(action);
    };

    data.actionList.forEach((action) => {
      writeFileSync(
        join(rootDirPath, `src`, `_`, `${action.code}.ts`),
        joinText(
          `import { Define } from "@/app/story";`, //
          ``,
          joinPresetImplTx(action),
        ),
      );
    });
  })();
};
main(rootDirPath ?? process.cwd());

const template = {
  abstractClass:
    (code: string) =>
    (...list: string[]) =>
      template.class(code, { isAbstract: true, isPrivate: false })(...list),

  class:
    (
      code: string,
      options: Partial<{
        extends: string | null;
        implements: string | null;
        isPrivate: boolean;
        isAbstract: boolean;
      }>,
    ) =>
    (...list: string[]) => {
      const exportText = options.isPrivate ? `` : `export`;
      const abstractText = options.isAbstract ? `abstract` : ``;
      const extendsText = options.extends ? `extends ${options.extends}` : ``;
      const implementsText = options.implements ? `implements ${options.implements}` : ``;

      return joinText(
        `${exportText} ${abstractText} class ${code} ${extendsText} ${implementsText} {`, //
        ...list, //
        `}`, //
      );
    },
  namespace:
    (code: string) =>
    (...list: string[]) => {
      return joinText(
        `export namespace ${code} {`, //
        ...list,
        `}`, //
      );
    },

  comment: (...list: string[]) => {
    if (list.length === 0) return `/** */`;
    else if (list.length === 1) return `/** ${list.at(0)} */`;
    else
      return joinText(
        `/**`, //
        ...list.map((i) => {
          return ` * ${i}`;
        }),
        ` */`, //
      );
  },

  constObj:
    (code: string) =>
    (...list: string[]) => {
      return joinText(
        `export const ${code} = {`, //
        ...list,
        `};`, //
      );
    },

  type:
    (
      code: string,
      options: Partial<{
        typeText: string;
      }>,
    ) =>
    (...list: string[]) => {
      const fieldText = joinText(
        `{`, //
        ...list,
        `}`, //
      );

      if (!options.typeText) {
        return joinText(
          `export type ${code} = ${fieldText};`, //
        );
      } else {
        return joinText(
          `export type ${code} = ${options.typeText.replace(`<T>`, `<${fieldText}>`)};`, //
        );
      }
    },
};

export class StoryServiceImpl0 {
  modelText: {
    modelList: string[];
    validtorList: string[];
  } = {
    modelList: [],
    validtorList: [],
  };

  actionText: {
    serviceList: string[];
    defineList: string[];
  } = {
    serviceList: [],
    defineList: [],
  };

  // 复杂
  svcText: {
    serviceList: string[];
    importList: string[];
  } = {
    serviceList: [],
    importList: [],
  };

  tableText: {
    entityList: string[];
    serviceList: string[];
  } = {
    entityList: [],
    serviceList: [],
  };

  constructor(story: Story) {
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

  table(
    table: Story["tableList"][number], //
  ): void {
    this.tableText.entityList.push(
      joinText(
        template.comment(table.title),
        `@AppDec.table("${table.code}")`,
        `export class ${table.code} extends AppModel._table.${table.strategy} {`,
        ...table.fieldList.map((field) => {
          return joinText(
            template.comment(field.title),
            `@AppDec.tableField(${JSON.stringify(field)})`, //
            `${field.code}!: string;`,
          );
        }),
        `}`,
      ),
    );

    this.tableText.serviceList.push(
      template.comment(table.title),
      `abstract ${table.code}: Repository<Entity.${table.code}>;`, //
    );
  }
  tableField(
    _table: Story["tableList"][number], //
    _field: Story["tableList"][number]["fieldList"][number], //
  ): void {}
  action(
    action: Story["actionList"][number], //
  ): void {
    const [code1, code2] = action.code.split(".");

    this.actionText.serviceList.push(
      joinText(
        template.comment(action.title), //
        `abstract "${code1}.${code2}"(`,
        `dto: Model.${code1}.${code2}M1, //`,
        `): Promise<Model.${code1}.${code2}M2>;`,
      ),
    );

    this.actionText.defineList.push(
      template.comment(action.title),
      `"${code1}.${code2}": defineImpl<`,
      `  _Local.Model.${code1}.${code2}M1, //`,
      `  _Local.Model.${code1}.${code2}M2, //`,
      `  _Local.Provider //`,
      `>,`,
    );
  }
  model(
    model: Story["modelList"][number], //
  ): void {
    const [code1, code2] = model.code.split(".");

    this.modelText.modelList.push(
      template.namespace(code1)(
        joinText(
          template.comment(model.title), //
          template.type(code2, { typeText: model.typeText })(
            ...model.fieldList.map((field) => {
              return joinText(
                template.comment(field.title), //
                `${field.code}${field.optional ? "?" : ""}:${field.typeText}`,
              );
            }),
          ),
        ),
      ),
    );

    this.modelText.validtorList.push();
  }

  modelField(
    _model: Story["modelList"][number], //
    _field: Story["modelList"][number]["fieldList"][number], //
  ): void {}

  svc(
    svc: Story["svcList"][number], //
  ): void {
    this.svcText.importList.push(
      `import { _Local as _Api_${svc.code} } from "./_.111.api.${svc.code}"; `, //
    );

    this.svcText.serviceList.push(
      joinText(
        template.comment(svc.title), //
        `abstract ${svc.code}: _Api_${svc.code}.Service`,
      ),
    );
  }

  getText() {
    const textNoImport = joinText(
      ...this.svcText.importList,
      ``,
      template.namespace(`_Repo`)(
        template.namespace(`Entity`)(
          ...this.tableText.entityList, //
        ),
        ``,
        template.abstractClass(`Service`)(
          ...this.tableText.serviceList, //
        ),
      ),
      ``,

      template.namespace(`_Api`)(
        template.abstractClass(`Service`)(
          ...this.svcText.serviceList, //
        ),
      ),

      template.namespace(`_Local`)(
        template.namespace(`Model`)(
          ...this.modelText.modelList, //
        ),
        ``,
        template.abstractClass(`Service`)(
          ...this.actionText.serviceList, //
        ),

        joinText(
          `export abstract class Provider {`,
          `  abstract infra: InfraService;`,
          `  abstract local: _Local.Service;`,
          `  abstract api: _Api.Service;`,
          `  abstract repo: _Repo.Service;`,
          `}`,
        ),
      ),

      template.constObj(`Define`)(
        ...this.actionText.defineList, //
      ),
    );

    const joinImportText =
      (path: string) =>
      (...list: string[]) => {
        return joinText(
          `import { `,
          ...list.map((i) => {
            return !textNoImport.match(i) ? null : `${i},`;
          }),
          `} from "${path}";`,
        );
      };

    return joinText(
      joinImportText(`@zzj/nestjs-story`)("AppModel", "AppDec", "defineImpl"),
      joinImportText(`@zzj/nestjs-infra`)("InfraService"),
      joinImportText(`typeorm`)("Repository"),
      ``,
      textNoImport,
    );
  }
}

export class StoryServiceImpl1 {
  options: {
    code: string;
  };

  modelText: {} = {};

  actionText: {
    importImplList: string[];
    localImpl2List: string[];
    localImpl1List: string[];
    controllerList: string[];
  } = {
    importImplList: [],
    controllerList: [],
    localImpl1List: [],
    localImpl2List: [],
  };

  svcText: {
    apiImplProviderList: string[];
    moduleProviderList: string[];
    moduleImportList: string[];
    importModuleImportList: string[];
  } = {
    moduleProviderList: [],
    apiImplProviderList: [],
    moduleImportList: [],
    importModuleImportList: [],
  };

  tableText: {
    repoImplProviderList: string[];
  } = {
    repoImplProviderList: [],
  };

  constructor(
    story: Story,
    options: {
      code: string;
    },
  ) {
    this.options = options;

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

  table(
    table: Story["tableList"][number], //
  ): void {
    this.tableText.repoImplProviderList.push(
      joinText(
        `@AppDec.repo(_Repo.Entity.${table.code})`, //
        `public ${table.code}: Repository<_Repo.Entity.${table.code}>,`, //
      ),
    );
  }

  tableField(
    _table: Story["tableList"][number], //
    _field: Story["tableList"][number]["fieldList"][number], //
  ): void {}
  action(
    action: Story["actionList"][number], //
  ): void {
    const [code1, code2] = action.code.split(".");

    this.actionText.importImplList.push(
      joinText(
        `import impl_${code1}_${code2} from '@/${code1}.${code2}'`, //
      ),
    );

    this.actionText.controllerList.push(
      joinText(
        `@AppDec.post("${code1}.${code2}")`,
        `async "${code1}.${code2}"(@AppDec.body() dto: _Local.Model.${code1}.${code2}M1) {`,
        `  return await this.service["${code1}.${code2}"](dto);`,
        `}`,
      ),
    );

    this.actionText.localImpl1List.push(
      joinText(
        `async "${code1}.${code2}"(`,
        `  dto: _Local.Model.${code1}.${code2}M1, //`,
        `): Promise<_Local.Model.${code1}.${code2}M2> {`,
        `  return await impl_${code1}_${code2}(this.provider)(dto);`,
        `}`,
      ),
    );

    this.actionText.localImpl2List.push(
      joinText(
        `async "${code1}.${code2}"(`,
        `  dto: _Local.Model.${code1}.${code2}M1, //`,
        `): Promise<_Local.Model.${code1}.${code2}M2> {`,
        `  console.log(dto);`,
        `  throw new Error("");`,
        `}`,
      ),
    );
  }
  model(
    model: Story["modelList"][number], //
  ): void {
    const [code1, code2] = model.code.split(".");
    console.log(code1, code2);
  }

  modelField(
    _model: Story["modelList"][number], //
    _field: Story["modelList"][number]["fieldList"][number], //
  ): void {}

  svc(
    svc: Story["svcList"][number], //
  ): void {
    this.svcText.moduleProviderList.push(
      joinText(
        `{`, //
        `  provide: _Api_${svc.code}.Service, //`, //
        `  useClass: _Api_${svc.code}Impl, //`, //
        `},`, //
      ),
    );

    this.svcText.apiImplProviderList.push(
      joinText(
        `public ${svc.code}: _Api_${svc.code}.Service,`, //
      ),
    );

    this.svcText.importModuleImportList.push(
      joinText(
        `import { AppModule as _Api_${svc.code}Module } from "./_.222.api.${svc.code}";`, //
        `import { _Local as _Api_${svc.code} } from "./_.111.api.${svc.code}";`, //
      ),
    );

    this.svcText.moduleImportList.push(
      joinText(
        `_Api_${svc.code}Module,`, //
      ),
    );
  }

  getText1() {
    const textNoImport = joinText(
      joinText(
        ...this.svcText.importModuleImportList, //
      ),

      joinText(
        ...this.actionText.importImplList, //
      ),

      joinText(
        `@AppDec.impl()`,
        `export class _LocalImpl implements _Local.Service {`,
        `private provider: _Local.Provider;`,
        `constructor(`,
        `  private infra: InfraService,`,
        `  private api: _Api.Service,`,
        `  private repo: _Repo.Service,`,
        `) {`,
        `  this.provider = {`,
        `    api: this.api,`,
        `    infra: this.infra,`,
        `    repo: this.repo,`,
        `    local: this,`,
        `  };`,
        `}`,
        ...this.actionText.localImpl1List,
        `}`,
      ),

      joinText(
        `@AppDec.impl()`,
        `export class _RepoImpl implements _Repo.Service {`,
        `  constructor(`,
        ...this.tableText.repoImplProviderList,
        `  ) {}`,
        `}`,
      ),

      joinText(
        `@AppDec.impl()`,
        `export class _ApiImpl implements _Api.Service {`,
        `  constructor(`,
        ...this.svcText.apiImplProviderList,
        `  ) {}`,
        `}`,
      ),

      joinText(
        `@AppDec.controller()`,
        `export class AppController {`,
        `  constructor(private service: _Local.Service) {}`,
        ...this.actionText.controllerList, //
        `}`,
      ),

      joinText(
        `@AppDec.module({`,
        `  imports: [`,
        ...this.svcText.moduleImportList,
        `  ],`,
        `  controllers: [AppController],`,
        `  providers: [`,
        `    { provide: _Api.Service, useClass: _ApiImpl },`,
        `    { provide: _Local.Service, useClass: _LocalImpl },`,
        `    { provide: _Repo.Service, useClass: _RepoImpl },`,
        `  ],`,
        `})`,
        `export class AppModule {}`,
      ),
    );

    const joinImportText =
      (path: string) =>
      (...list: string[]) => {
        return joinText(
          `import { `,
          ...list.map((i) => {
            return !textNoImport.match(i) ? null : `${i},`;
          }),
          `} from "${path}";`,
        );
      };

    return joinText(
      joinImportText(`@zzj/nestjs-story`)("AppModel", "AppDec", "defineImpl"),
      joinImportText(`@zzj/nestjs-infra`)("InfraService"),
      joinImportText(`typeorm`)("Repository"),
      joinImportText(`./_.111`)("_Repo", "_Api", "_Local"),
      ``,
      textNoImport,
    );
  }

  getText2() {
    const textNoImport = joinText(
      joinText(
        ...this.svcText.importModuleImportList, //
      ),

      joinText(
        `@AppDec.impl()`,
        `export class _LocalImpl implements _Local.Service {`,
        `  constructor() {}`,
        ...this.actionText.localImpl2List,
        `}`,
      ),

      joinText(
        `@AppDec.impl()`,
        `export class _RepoImpl implements _Repo.Service {`,
        `  constructor(`,
        // ...this.tableText.repoImplProviderList,
        `  ) {}`,
        `}`,
      ),

      joinText(
        `@AppDec.impl()`,
        `export class _ApiImpl implements _Api.Service {`,
        `  constructor(`,
        // ...this.svcText.apiImplProviderList,
        `  ) {}`,
        `}`,
      ),

      joinText(
        `@AppDec.controller()`,
        `export class AppController {`,
        `  constructor(private service: _Local.Service) {}`,
        // ...this.actionText.controllerList, //
        `}`,
      ),

      joinText(
        `@AppDec.module({`,
        `  imports: [`,
        ...this.svcText.moduleImportList,
        `  ],`,
        `  controllers: [AppController],`,
        `  providers: [`,
        `    { provide: _Api.Service, useClass: _ApiImpl },`,
        `    { provide: _Local.Service, useClass: _LocalImpl },`,
        `    { provide: _Repo.Service, useClass: _RepoImpl },`,
        `  ],`,
        `})`,
        `export class AppModule {}`,
      ),
    );

    const joinImportText =
      (path: string) =>
      (...list: string[]) => {
        return joinText(
          `import { `,
          ...list.map((i) => {
            return !textNoImport.match(i) ? null : `${i},`;
          }),
          `} from "${path}";`,
        );
      };

    return joinText(
      joinImportText(`@zzj/nestjs-story`)("AppModel", "AppDec", "defineImpl"),
      joinImportText(`@zzj/nestjs-infra`)("InfraService"),
      joinImportText(`typeorm`)("Repository"),
      joinImportText(`./_.111.${this.options.code}`)("_Repo", "_Api", "_Local"),

      textNoImport,
    );
  }
}
