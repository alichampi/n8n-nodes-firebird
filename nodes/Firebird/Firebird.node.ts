import {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from "n8n-workflow";
// @ts-ignore
// import { promisifyAll } from "bluebird";
import * as fbd from "node-firebird";

// const fbdAsync: any = promisifyAll(fbd);

import { copyInputItems } from "./GenericFunctions";
import { queryOperationOptions } from "./operations";

export class Firebird implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Firebird",
    name: "firebird",
    icon: {
      dark: "file:Firebird.icon.svg",
      light: "file:Firebird.icon.svg",
    },
    group: ["input"],
    version: [1],
    defaultVersion: 1,
    description: "Get, add and update data in Firebird database",
    defaults: {
      name: "Firebird",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "firebirdApi",
        required: true,
      },
    ],
    properties: [...queryOperationOptions],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = await this.getCredentials("firebirdApi");

    if (credentials === undefined) {
      throw new NodeOperationError(
        this.getNode(),
        "No credentials got returned!",
      );
    }

    const timeout = this.getNodeParameter("timeout", 0) as number;
    credentials.timeout = timeout;

    const items = this.getInputData();
    const operation = this.getNodeParameter("operation", 0) as string;
    let returnItems: any[] = [];

    const db = await new Promise<fbd.Database>((resolve, reject) => {
      fbd.attach({ ...credentials }, (err, db: fbd.Database) => {
        if (err) {
          return reject(err);
        }

        return resolve(db);
      });
    });

    if (operation === "executeQuery") {
      // ----------------------------------
      //         executeQuery
      // ----------------------------------
      try {
        const queryResult = (
          (await Promise.all(
            items.map(async (item, index) => {
              const rawQuery = this.getNodeParameter("query", index) as string;
              const paramsString = this.getNodeParameter("params", 0) as string;
              const params = paramsString
                .split(",")
                .map((param) => param.trim());

              const insertItems = copyInputItems([items[index]], params)[0];

              let parametrizedQuery = rawQuery;
              let queryItems: any[] = [];
              let match;

              const re = /'[^']+'|(:)([_a-zA-Z0-9]+)/gm;

              while ((match = re.exec(parametrizedQuery)) !== null) {
                if (match[2] === undefined) {
                  continue;
                }
                const paramName = match[2];
                if (!params.includes(paramName)) {
                  throw new NodeOperationError(
                    this.getNode(),
                    `The parameter "${paramName}" is unknown!`,
                  );
                }
                queryItems.push(insertItems[paramName]);
                parametrizedQuery =
                  parametrizedQuery.substring(0, match.index) +
                  "?" +
                  parametrizedQuery.substring(
                    (match.index ?? 0) + 1 + match[2].length,
                  );
              }

              let result;
              if (queryItems.length > 0) {
                result = await new Promise<any[]>((resolve, reject) => {
                  db.query(parametrizedQuery, queryItems, (err, result) => {
                    if (!err) {
                      resolve(result);
                    } else {
                      reject(err);
                    }
                  });
                });
              } else {
                result = await new Promise<any[]>((resolve, reject) => {
                  db.query(rawQuery, [], (err, result) => {
                    if (!err) {
                      resolve(result);
                    } else {
                      reject(err);
                    }
                  });
                });
              }
              return result;
            }),
          )) as any[]
        ).reduce((collection, result) => {
          if (!result) {
            result = {};
          }

          if (Array.isArray(result)) {
            return collection.concat(result);
          }

          collection.push(result);
          return collection;
        }, []);

        returnItems = this.helpers.returnJsonArray(queryResult);
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnItems = this.helpers.returnJsonArray({ error: error.message });
        } else {
          throw error;
        }
      } finally {
        // close the connection
        await new Promise<boolean>((resolve, reject) => {
          db.detach((err) => {
            if (!err) {
              resolve(true);
            } else {
              reject(err);
            }
          });
        });
      }
    } else if (operation === "insert") {
      // ----------------------------------
      //         insert
      // ----------------------------------

      try {
        const table = this.getNodeParameter("table", 0) as string;
        const columnString = this.getNodeParameter("columns", 0) as string;
        const columns = columnString.split(",").map((column) => column.trim());
        const insertItems = copyInputItems(items, columns);
        const insertPlaceholder = `(${columns.map((column) => "?").join(",")})`;

        const insertSQL = `INSERT INTO ${table}(${columnString}) VALUES ${items.map((item) => insertPlaceholder).join(",")};`;
        const queryItems = insertItems.reduce(
          (collection, item) => collection.concat(Object.values(item as any)),
          [],
        );
        returnItems = await new Promise<any[]>((resolve, reject) => {
          db.query(insertSQL, queryItems, (err, result) => {
            if (!err) {
              resolve(result);
            } else {
              reject(err);
            }
          });
        });

        returnItems = this.helpers.returnJsonArray(returnItems?.[0] as unknown as IDataObject);
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnItems = this.helpers.returnJsonArray({ error: error.message });
        } else {
          throw error;
        }
      } finally {
        // close the connection
        await new Promise<boolean>((resolve, reject) => {
          db.detach((err) => {
            if (!err) {
              resolve(true);
            } else {
              reject(err);
            }
          });
        });
      }
    } else if (operation === "update") {
      // ----------------------------------
      //         update
      // ----------------------------------

      try {
        const table = this.getNodeParameter("table", 0) as string;
        const updateKey = this.getNodeParameter("updateKey", 0) as string;
        const columnString = this.getNodeParameter("columns", 0) as string;
        const columns = columnString.split(",").map((column) => column.trim());

        if (!columns.includes(updateKey)) {
          columns.unshift(updateKey);
        }

        const updateItems = copyInputItems(items, columns);
        const updateSQL = `UPDATE ${table} SET ${columns.map((column) => `${column} = ?`).join(",")} WHERE ${updateKey} = ?;`;

        await Promise.all(
          updateItems.map(async (item) => {
            let result  = await new Promise<any[]>((resolve, reject) => {
              db.query(updateSQL, Object.values(item).concat(item[updateKey]), (err, result) => {
                if (!err) {
                  resolve(result);
                } else {
                  reject(err);
                }
              });
            });
            return result;
          }),
        );
        returnItems = this.helpers.returnJsonArray(
          returnItems[0] as unknown as IDataObject,
        );
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnItems = this.helpers.returnJsonArray({ error: error.message });
        } else {
          throw error;
        }
      } finally {
        // close the connection
        await new Promise<boolean>((resolve, reject) => {
          db.detach((err) => {
            if (!err) {
              resolve(true);
            } else {
              reject(err);
            }
          });
        });
      }
    } else {
      // close the connection
      await new Promise<boolean>((resolve, reject) => {
        db.detach((err) => {
          if (!err) {
            resolve(true);
          } else {
            reject(err);
          }
        });
      });

      if (this.continueOnFail()) {
        returnItems = this.helpers.returnJsonArray({
          error: `The operation "${operation}" is not supported!`,
        });
      } else {
        throw new NodeOperationError(
          this.getNode(),
          `The operation "${operation}" is not supported!`,
        );
      }
    }
    return this.prepareOutputData(returnItems);
  }
}
