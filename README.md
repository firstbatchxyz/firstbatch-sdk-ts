# Firstbatch SDK

[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM](https://img.shields.io/npm/v/firstbatch?logo=npm&color=CB3837)](https://www.npmjs.com/package/firstbatch)

The FirstBatch SDK provides an interface for integrating vector databases and powering personalized AI experiences in your application.

- Seamlessly manage user sessions with persistent IDs or temporary sessions.
- Send signal actions like likes, clicks, etc. to update user embeddings in real-time.
- Fetch personalized batches of data tailored to each user's embeddings.
- Support for multiple vector database integrations: Pinecone, Weaviate, etc.
- Built-in algorithms for common personalization use cases.

For more information, see the [User Embedding Guide](https://firstbatch.gitbook.io/user-embeddings/) or [SDK Documentation](https://firstbatch.gitbook.io/firstbatch-sdk/).

## Installation

Install the package from NPM:

```sh
yarn add firstbatch     # yarn
npm install firstbatch  # npm
pnpm add firstbatch     # pnpm
```

## Usage

FirstBatch SDK is used together with an existing vector database client, where you register the client to our SDK and then create personalization sessions from it.

### Adding a Client

First, initialize a Vector Database of your choice; our SDK supports [Pinecone](https://www.npmjs.com/package/@pinecone-database/pinecone), [Weaviate](https://www.npmjs.com/package/weaviate-ts-client), [Typesense](https://www.npmjs.com/package/typesense), and soon Supabase. Let us go over an example using Pinecone.

```ts
import {Pinecone as PineconeClient} from '@pinecone-database/pinecone';
import {Pinecone, FirstBatch, TODO:!, Signals} from 'firstbatch';

// create Pinecone client
const pinecone = new PineconeClient({apiKey: 'pinecone-api-key', environment: 'pinecone-env'});
await pinecone.describeIndex('index-name');
const index = pinecone.index('index-name');
```

Then, create a Vector Store with this index and pass it in the FirstBatch SDK.

```ts
// create SDK
const personalized = await FirstBatch.new('firstbatch-api-key');

// add client to SDK
const vectorStore = new Pinecone(index);
const vdbid = 'pinecone-example-db';
await personalized.addVdb(vdbid, vectorStore);
```

### Personalization

Now, we can create a session with an algorithm that suits our use-case, and provide personalization to our users.

```ts
// create a session
const session = personalized.session('ALGORITHM_NAME', vdbid);

// make recommendations
const sessionId = session.data;
const [ids, batch] = personalized.batch(sessionId);
```

Suppose that the user has **liked** the **first content** from the `batch` above. We can provide personalization over this as follows:

```ts
const userPick = 0; // i.e. the first content
personalized.addSignal(sessionId, new TODO:!(Signals.LIKE), ids[userPick]);
```

### Custom Signals

The `Signals` in the code above contains a set of signals (i.e. labels and weights) that we have prepared for you, but you can also create a Signal with your own parameters:

```ts
import {Signal} from 'firstbatch';

const mySignal = new Signal('label', 0.5); // label and weight
const userAction = new TODO:!(mySignal);
```

## Building

Install the dependencies,

```bash
bun install
```

The following command will check the code with TSC and then build with Parcel.

```bash
bun run build
bun b # alternative
```

If you get an error like "expected content key ... to exist" simply delete the `.parcel-cache` folder and build again.

## Testing

Run all tests via:

```bash
bun run test
bun t # alternative
```

Bun will look for `.env.test` during the tests.

## Stlying

## Support

For any issues or queries contact `support@firstbatch.xyz`.
