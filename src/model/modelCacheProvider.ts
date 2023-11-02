
import { Context } from "./context";



// class TableInfo {
//   TableName: string;
//   PrimaryFieldName: string;
//   PrimaryIndexName: string;
// }

export interface IModelCache {
  
  store(context: Context) : Promise<void>;

  load(context: Context, blockNumber: number) : Promise<boolean>;
}


export class LocalStorageModelCache implements IModelCache {


  async store(context: Context): Promise<void> {
    const json = JSON.stringify(context);
    console.log(`${context.currentBlockNumber}: `);
    console.log(json);

    localStorage.setItem(`block${context.currentBlockNumber}`,json)

  }
  async load(context: Context, blockNumber: number): Promise<boolean> {
    
    return false;
  }

}


// export class IndexedDBModelCache implements IModelCache {

//   private IndxDb: IDBFactory;
//   public db: IDBDatabase;

//   public dbName: string;

//   public tInfos: Array<TableInfo>;

//   constructor() {
//     this.IndxDb = window.indexedDB;
//     this.OpenInitDB();
//   }

//   OpenInitDB() {
//     var req: IDBOpenDBRequest;
//     req = this.IndxDb.open(this.dbName);
//     req.onupgradeneeded = this.AddTables;
//     let md = this;
//     req.onsuccess = function (e: any) {
//       md.db = e.target.result;
//     }
//   }

//   AddTables(e: any) {
//     let md = this;
//     md.db = e.target.result;
//     var parms: IDBObjectStoreParameters;
//     var tInfo: TableInfo;
//     for (var it in md.tInfos) {
//         tInfo = md.tInfos[it];
//         parms = { keyPath: tInfo.PrimaryFieldName };
//         var tblLocal: IDBObjectStore;
//         tblLocal = md.db.createObjectStore(tInfo.TableName, parms);
//         tblLocal.createIndex(tInfo.PrimaryIndexName, tInfo.PrimaryFieldName);
//     }
// }


//   store(context: Context): Promise<void> {
//     throw new Error("Method not implemented.");
//   }
//   load(context: Context, blockNumber: number): Promise<boolean> {
//     throw new Error("Method not implemented.");
//   }

  
// }