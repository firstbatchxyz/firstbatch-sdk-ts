// import type {Query, MetadataFilter, QueryMetadata, DistanceMetric, Vector, FetchResult} from '../types';
// import {QueryResult} from '../query';
// import constants from '../constants';
// import {Client as TypesenseClient} from 'typesense';
// import Collection from 'typesense/lib/Typesense/Collection';
// import {MultiSearchRequestWithPresetSchema} from 'typesense/lib/Typesense/MultiSearch';
// import {VectorStore} from './base';

// export class Typesense extends VectorStore {
//   private client: TypesenseClient;
//   private collectionName: string;
//   private collection: Collection; // FIXME: this is not used
//   private metadataKey: string; // FIXME: this is not used

//   constructor(
//     client: TypesenseClient,
//     kwargs?: {
//       collectionName?: string;
//       historyField?: string;
//       embeddingSize?: number;
//       distanceMetric?: DistanceMetric;
//     }
//   ) {
//     super({
//       embeddingSize: kwargs?.embeddingSize,
//       distanceMetric: kwargs?.distanceMetric,
//       historyField: kwargs?.historyField || '_id',
//     });
//     this.client = client;
//     this.collectionName = kwargs?.collectionName || 'my_collection';
//     this.collection = client.collections(this.collectionName);
//     this.metadataKey = 'metadata';
//   }

//   async search(query: Query): Promise<QueryResult[]> {
//     let queryObj;
//     if (query.filter) {
//       queryObj = {
//         q: '*',
//         vector_query: 'vec:({query.embedding.vector}, k:{query.top_k})',
//         collection: this.collectionName,
//       };
//     } else {
//       queryObj = {
//         q: '*',
//         vector_query: 'vec:({query.embedding.vector}, k:{query.top_k})',
//         collection: this.collectionName,
//         filter_by: query.filter,
//       };
//     }
//     const res = await this.client.multiSearch.perform({searches: [queryObj as MultiSearchRequestWithPresetSchema]}, {});

//     const ids: string[] = [];
//     const scores: number[] = [];
//     const vectors: Vector[] = [];
//     const metadatas: QueryMetadata[] = [];
//     const metadataObject: Record<string, any> = {};

//     const q = new QueryResult_({vectors, metadatas, scores, ids});
//     const hits = res.results[0]['hits'] as any[];
//     for (let i = 0; i < hits.length; i++) {
//       const document = res.results[0]['hits'][i];
//       for (const [k, v] of Object.entries(document)) {
//         if (k !== 'vec') {
//           metadataObject[k] = v;
//         }
//       }
//       const vecObj: number[] = document['vec'];
//       q.metadatas.push(metadataObject);
//       q.vectors.push({vector: vecObj, dim: vecObj.length, id: document['id']} as Vector);
//       q.scores.push(document['vector_distance']);
//       q.ids.push(document['id']);
//     }
//     return q;
//   }

//   async fetch(id: string): Promise<FetchResult> {
//     const res = await this.client
//       .collections<{
//         vec: Vector;
//         metadata: QueryMetadata;
//         id: string;
//       }>(this.collectionName)
//       .documents(id)
//       .retrieve();
//     return {vector: res.vec, metadata: res.metadata, id: res.id};
//   }

//   historyFilter(ids: string[], prevFilter?: {[key: string]: any} | string): MetadataFilter {
//     if (this.historyField !== '_id') {
//       throw new Error("TypeSense doesn't allow filtering on id field. Try duplicating id in another field like _id.");
//     }

//     let filter = `${this.historyField}:!=[${ids.join(',')}]`;

//     if (prevFilter !== undefined && typeof prevFilter === 'string') {
//       filter += ` && ${prevFilter}`;
//     }

//     // FIXME: implement this later
//     return {};
//   }
// }
